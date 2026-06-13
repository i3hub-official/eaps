<!-- src/lib/components/exam/FaceMonitor.svelte -->
<!--
  Compact top-right monitor — video thumbnail + coloured status dot.
  No expand. Sits inline in .bar-right of the top bar.
  Strict 10s face checks, immediate flag on first miss, auto-submit at MAX_VIOLATIONS.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    examId:             string;
    sessionId:          string;
    enrolledDescriptor: number[] | null;
    checkInterval?:     number;
    onViolation:        (type: 'no_face_detected' | 'multiple_faces' | 'face_mismatch') => void;
    onCameraError?:     (msg: string) => void;
    onForceSubmit?:     () => void;
  }

  let {
    examId,
    sessionId,
    enrolledDescriptor,
    checkInterval = 10_000,
    onViolation,
    onCameraError,
    onForceSubmit,
  }: Props = $props();

  let videoEl: HTMLVideoElement;

  let human:             any = null;
  let stream:            MediaStream | null = null;
  let checkTimer:        ReturnType<typeof setInterval> | null = null;
  let ready =            false;
  let consecutiveNoFace = 0;

  const COSINE_SOFT     = 0.50;
  const NO_FACE_GRACE   = 1;
  const EAR_OPEN        = 0.25;
  const EAR_CLOSED      = 0.18;
  const MAX_VIOLATIONS  = 3;

  type Status = 'loading' | 'ok' | 'warning' | 'error';
  let status          = $state<Status>('loading');
  let totalViolations = $state(0);
  let livenessConfirmed = false;
  let eyeHistory: number[] = [];

  const statusColor = $derived(
    status === 'error'   ? '#ef4444' :
    status === 'warning' ? '#f59e0b' :
    status === 'loading' ? '#9ca3af' :
    '#22c55e'
  );

  const statusTitle = $derived(
    status === 'error'   ? 'Camera error — monitoring offline' :
    status === 'warning' ? 'Face issue detected!' :
    status === 'loading' ? 'Starting camera…' :
    `Monitoring active · ${totalViolations}/${MAX_VIOLATIONS} flags`
  );

  // Singleton model promise
  let modelPromise: Promise<any> | null = null;
  function getModel() {
    if (modelPromise) return modelPromise;
    modelPromise = (async () => {
      const { default: Human } = await import('@vladmandic/human');
      const h = new Human({
        modelBasePath: '/models/human',
        backend:       'webgl',
        hand: { enabled: false }, body: { enabled: false },
        object: { enabled: false }, gesture: { enabled: false },
        segmentation: { enabled: false },
        face: {
          enabled:     true,
          detector:    { maxDetected: 4, minConfidence: 0.50, return: true },
          description: { enabled: true },
          mesh:        { enabled: true },
          emotion:     { enabled: false },
          iris:        { enabled: false },
          antispoof:   { enabled: true },
          liveness:    { enabled: true },
        },
      });
      await h.load();
      await h.warmup();
      return h;
    })();
    return modelPromise;
  }

  function dist2d(a: number[], b: number[]) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }
  function ear(mesh: number[][], idx: number[]): number {
    const p = idx.map(i => mesh[i]);
    if (!p[0] || !p[3]) return 1;
    return (dist2d(p[1],p[5]) + dist2d(p[2],p[4])) / (2 * dist2d(p[0],p[3]));
  }
  const L = [33,160,158,133,153,144];
  const R = [263,387,385,362,380,373];
  function meanEAR(mesh: number[][]): number { return (ear(mesh,L) + ear(mesh,R)) / 2; }

  function updateLiveness(v: number) {
    if (livenessConfirmed) return;
    eyeHistory.push(v);
    if (eyeHistory.length > 8) eyeHistory.shift();
    if (eyeHistory.length < 8) return;
    if (eyeHistory.filter(x => x > EAR_OPEN).length >= 4 && eyeHistory.filter(x => x < EAR_CLOSED).length >= 1)
      livenessConfirmed = true;
  }

  function cosine(a: number[], b: number[]): number {
    let dot=0,na=0,nb=0;
    const len = Math.min(a.length, b.length);
    for (let i=0;i<len;i++) { dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d > 0 ? dot/d : 0;
  }

  async function runCheck() {
    if (!ready || !human || !videoEl || videoEl.readyState < 2) return;
    let result: any;
    try { result = await human.detect(videoEl); } catch { return; }

    const faces = result?.face ?? [];
    const count = faces.length;

    if (count === 0) {
      consecutiveNoFace++;
      status = 'warning';
      if (consecutiveNoFace >= NO_FACE_GRACE) {
        consecutiveNoFace = 0;
        onViolation('no_face_detected');
        totalViolations++;
        checkAutoSubmit();
        await report('no_face_detected', {});
      }
      return;
    }
    consecutiveNoFace = 0;

    if (count > 1) {
      status = 'warning';
      onViolation('multiple_faces');
      totalViolations++;
      checkAutoSubmit();
      await report('multiple_faces', {});
      return;
    }

    const face = faces[0];
    const isLive = face.liveness?.score  != null ? face.liveness.score  > 0.60 : true;
    const isReal = face.antispoof?.score != null ? face.antispoof.score > 0.60 : true;

    if (!isLive || !isReal) {
      status = 'warning';
      onViolation('face_mismatch');
      totalViolations++;
      checkAutoSubmit();
      await report('face_mismatch', { reason: 'spoof_attempt' });
      return;
    }

    if (face.mesh?.length) updateLiveness(meanEAR(face.mesh as number[][]));

    if (enrolledDescriptor && face.embedding?.length) {
      const sim = cosine(enrolledDescriptor, Array.from(face.embedding as number[]));
      if (sim < COSINE_SOFT) {
        status = 'warning';
        onViolation('face_mismatch');
        totalViolations++;
        checkAutoSubmit();
        await report('face_mismatch', { reason: 'identity_mismatch', sim: sim.toFixed(4) });
        return;
      }
    }

    status = 'ok';
  }

  function checkAutoSubmit() { if (totalViolations >= MAX_VIOLATIONS) onForceSubmit?.(); }

  async function report(flagType: string, meta: object) {
    try {
      await fetch(`/api/exam/${examId}/violation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ session_id: sessionId, flag_type: flagType, meta }),
      });
    } catch {}
  }

  onMount(async () => {
    if (!browser) return;
    try {
      human = await getModel();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      ready = true; status = 'ok';
      setTimeout(runCheck, 3_000);
      checkTimer = setInterval(runCheck, checkInterval);
    } catch (e: any) {
      status = 'error';
      onCameraError?.(e?.message ?? 'Camera unavailable');
    }
  });

  export function stop()   { ready=false; if(checkTimer){clearInterval(checkTimer);checkTimer=null;} stream?.getTracks().forEach(t=>t.stop()); stream=null; }
  export function pause()  { if(checkTimer){clearInterval(checkTimer);checkTimer=null;} }
  export function resume() { if(!checkTimer&&ready){checkTimer=setInterval(runCheck,checkInterval);runCheck();} }

  onDestroy(stop);
</script>

<div class="face-monitor" title={statusTitle} aria-label={statusTitle} aria-hidden="true">
  <div class="video-wrap" class:border-ok={status==='ok'} class:border-warn={status==='warning'} class:border-err={status==='error'}>
    <video bind:this={videoEl} muted playsinline autoplay class="monitor-video"></video>
    <span class="status-dot" class:dot-ok={status==='ok'} class:dot-warn={status==='warning'} class:dot-err={status==='error'} class:dot-load={status==='loading'} style="background:{statusColor}"></span>
  </div>
</div>

<style>
  .face-monitor { display:flex; align-items:center; flex-shrink:0; }
  .video-wrap {
    position:relative; width:88px; height:66px; border-radius:8px;
    overflow:hidden; border:2.5px solid #e5e7eb; background:#111;
    transition:border-color 0.3s, box-shadow 0.3s;
  }
  .video-wrap.border-ok   { border-color:#22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
  .video-wrap.border-warn { border-color:#f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
  .video-wrap.border-err  { border-color:#ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }
  .monitor-video { width:100%; height:100%; object-fit:cover; display:block; transform:scaleX(-1); }
  .status-dot {
    position:absolute; bottom:4px; right:4px;
    width:10px; height:10px; border-radius:50%;
    border:2px solid rgba(255,255,255,0.9);
  }
  .dot-ok   { animation: pulse-ok   2s ease-in-out infinite; }
  .dot-warn { animation: pulse-warn 0.9s ease-in-out infinite; }
  .dot-err  { animation: pulse-warn 0.6s ease-in-out infinite; }
  .dot-load { opacity:0.5; }
  @keyframes pulse-ok   { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0);} 50%{box-shadow:0 0 0 4px rgba(34,197,94,0.35);} }
  @keyframes pulse-warn { 0%,100%{opacity:1;} 50%{opacity:0.25;} }
</style>