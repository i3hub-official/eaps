<!-- src/lib/components/exam/FaceMonitor.svelte -->
<!-- 
  Runs silently during exam. Every CHECK_INTERVAL seconds:
  1. Grabs a video frame
  2. Detects all faces
  3. Compares against enrolled descriptor
  4. Fires onViolation() if: no face, multiple faces, or wrong face
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    examId: string;
    sessionId: string;
    enrolledDescriptor: number[] | null;   // from /api/face/descriptor
    checkInterval?: number;                 // ms between checks (default 12s)
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

  // ── Internal state ───────────────────────────────────────
  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let faceApi: any = null;
  let stream: MediaStream | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let ready = false;
  let consecutiveNoFace = 0;   // only flag after 2 consecutive misses (avoids false positives)

  const MATCH_THRESHOLD = 0.55; // Euclidean distance — lower = stricter
  const NO_FACE_GRACE = 2;      // consecutive misses before flagging

  // ── Lifecycle ────────────────────────────────────────────
  onMount(async () => {
    try {
      faceApi = await import('face-api.js');
      const MODEL_URL = '/models';

      // Models may already be loaded (enrollment page), loadFromUri is idempotent
      await Promise.all([
        faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceApi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });

      videoEl.srcObject = stream;
      await videoEl.play();

      ready = true;
      interval = setInterval(runCheck, checkInterval);

      // Run first check after 3s (let student settle)
      setTimeout(runCheck, 3000);
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

  // ── Core check ───────────────────────────────────────────
  async function runCheck() {
    if (!ready || !faceApi || !videoEl) return;

    try {
      // Draw current frame to offscreen canvas
      const ctx = canvasEl.getContext('2d')!;
      canvasEl.width = videoEl.videoWidth;
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

      // ── No face ───────────────────────────────────────
      if (count === 0) {
        consecutiveNoFace++;
        if (consecutiveNoFace >= NO_FACE_GRACE) {
          consecutiveNoFace = 0;
          onViolation('no_face_detected');
        }
        return;
      }

      consecutiveNoFace = 0;

      // ── Multiple faces ────────────────────────────────
      if (count > 1) {
        onViolation('multiple_faces');
        return;
      }

      // ── Identity check (if enrolled descriptor available) ─
      if (enrolledDescriptor && detections[0]) {
        const liveDist = faceApi.euclideanDistance(
          detections[0].descriptor,
          new Float32Array(enrolledDescriptor)
        );

        // Distance > threshold → possible impostor
        // We don't auto-flag this alone (lighting/angle changes) but log it
        // as a soft signal for the invigilator dashboard
        if (liveDist > MATCH_THRESHOLD) {
          // Soft flag — doesn't auto-submit, just alerts invigilator
          await reportFaceEvent('face_mismatch', liveDist);
        }
      }
    } catch {
      // Swallow detection errors — don't crash the exam
    }
  }

  async function reportFaceEvent(type: string, distance?: number) {
    try {
      await fetch(`/api/exam/${examId}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          flag_type: type === 'face_mismatch' ? 'multiple_faces' : type,
          meta: distance ? { distance: distance.toFixed(3) } : undefined,
        }),
        keepalive: true,
      });
    } catch {
      // ignore network errors during exam
    }
  }
</script>

<!--
  Invisible by design — tiny video in corner.
  The canvas is purely offscreen for processing.
-->
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
    border: 2px solid var(--border);
    box-shadow: var(--shadow);
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