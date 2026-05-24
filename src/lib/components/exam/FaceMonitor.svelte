<!-- src/lib/components/exam/FaceMonitor.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    examId: string;
    sessionId: string;
    enrolledDescriptor: number[] | null;
    checkInterval?: number;
    onViolation: (type: 'no_face_detected' | 'multiple_faces') => void;
    onCameraError?: (msg: string) => void;
  }

  let {
    examId,
    sessionId,
    enrolledDescriptor,
    checkInterval = 12_000,
    onViolation,
    onCameraError,
  }: Props = $props();

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let faceApi: typeof import('@vladmandic/face-api') | null = null;
  let stream: MediaStream | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let ready = false;
  let consecutiveNoFace = 0;

  // ── Thresholds ────────────────────────────────────────────────────────────
  // dist < 0.45 → same person (confident match)
  // dist 0.45–0.55 → uncertain (log only, don't punish)
  // dist > 0.55 → likely different person → soft flag to invigilator
  const MATCH_THRESHOLD   = 0.45; // hard match gate
  const SOFT_THRESHOLD    = 0.55; // above this → report mismatch
  const NO_FACE_GRACE     = 2;    // consecutive misses before flagging

  onMount(async () => {
    try {
      // ── Load models ───────────────────────────────────────────────────────
      // Dynamic import keeps this out of the SSR bundle.
      // loadFromUri is idempotent — safe to call even if enroll page already loaded them.
      faceApi = await import('@vladmandic/face-api');
      await Promise.all([
        faceApi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceApi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        faceApi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });

      videoEl.srcObject = stream;
      await videoEl.play();

      ready = true;

      // First check after 3s so the student can settle
      setTimeout(runCheck, 3_000);
      interval = setInterval(runCheck, checkInterval);
    } catch (e: any) {
      onCameraError?.(e?.message ?? 'Camera unavailable');
    }
  });

  onDestroy(stop);

  export function stop() {
    if (interval) { clearInterval(interval); interval = null; }
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    ready = false;
  }

  // ── Core check ────────────────────────────────────────────────────────────
  async function runCheck() {
    if (!ready || !faceApi || !videoEl) return;

    try {
      const ctx = canvasEl.getContext('2d')!;
      canvasEl.width  = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0);

      const detections = await faceApi
        .detectAllFaces(canvasEl, new faceApi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.45,
        }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      const count = detections.length;

      // ── No face ───────────────────────────────────────────────────────────
      if (count === 0) {
        consecutiveNoFace++;
        if (consecutiveNoFace >= NO_FACE_GRACE) {
          consecutiveNoFace = 0;
          onViolation('no_face_detected');
          await reportViolation('no_face_detected');
        }
        return;
      }

      consecutiveNoFace = 0;

      // ── Multiple faces ────────────────────────────────────────────────────
      if (count > 1) {
        onViolation('multiple_faces');
        await reportViolation('multiple_faces');
        return;
      }

      // ── Identity match ────────────────────────────────────────────────────
      // Only runs if we have the enrolled descriptor to compare against.
      if (enrolledDescriptor && detections[0]) {
        const liveDescriptor = detections[0].descriptor; // Float32Array

        // Euclidean distance — the canonical metric for these 128-d embeddings.
        // faceApi.euclideanDistance expects two Float32Array / number[].
        const dist = faceApi.euclideanDistance(
          liveDescriptor,
          new Float32Array(enrolledDescriptor)
        ) as number;

        if (dist > SOFT_THRESHOLD) {
          // Likely a different person — soft-flag only, does NOT auto-submit.
          // The invigilator dashboard sees this and can act.
          await reportMismatch(dist);
        }
        // dist 0.45–0.55: uncertain (angle/lighting shift) — log nothing, don't penalise student
        // dist < 0.45: confident match — no action needed
      }
    } catch {
      // Swallow detection errors — never crash the exam session
    }
  }

  // ── Reporting helpers ─────────────────────────────────────────────────────
  async function reportViolation(flagType: 'no_face_detected' | 'multiple_faces') {
    try {
      await fetch(`/api/exam/${examId}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          flag_type: flagType,
        }),
        keepalive: true,
      });
    } catch { /* ignore — exam must not break on network hiccup */ }
  }

  async function reportMismatch(distance: number) {
    try {
      await fetch(`/api/exam/${examId}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          // Reuse multiple_faces flag type since schema has no face_mismatch variant.
          // The meta.distance field lets the invigilator distinguish the cause.
          flag_type: 'multiple_faces',
          meta: {
            reason: 'face_mismatch',
            distance: dist.toFixed(3),
            threshold: SOFT_THRESHOLD,
            verdict: distance > MATCH_THRESHOLD ? 'no_match' : 'uncertain',
          },
        }),
        keepalive: true,
      });
    } catch { /* ignore */ }
  }
</script>

<!-- Invisible monitor — tiny mirrored preview in corner -->
<div class="monitor" aria-hidden="true">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={videoEl} muted playsinline class="feed"></video>
  <canvas bind:this={canvasEl} class="offscreen"></canvas>
</div>

<style>
  .monitor {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 30;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 2px solid var(--color-border);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    opacity: 0.85;
  }

  .feed {
    width: 80px;
    height: 60px;
    object-fit: cover;
    display: block;
    transform: scaleX(-1);
  }

  .offscreen {
    display: none;
  }
</style>