<!-- src/lib/components/exam/FaceVerifyModal.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    examId: string;
    onSuccess: () => void;
    onCancel: () => void;
  }

  let { examId, onSuccess, onCancel }: Props = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;

  type Status = 'intro' | 'loading' | 'scanning' | 'processing' | 'success' | 'error';
  let status        = $state<Status>('intro');
  let headline      = $state('Verify your identity');
  let subline       = $state('Position your face in the frame');
  let faceDetected  = $state(false);
  let faceCount     = $state(0);
  let holdProgress  = $state(0);
  let holdTimer: number | null = null;
  let holdStartTime: number | null = null;
  let errorMessage  = $state('');
  let loadingProgress = $state(0);

  let human: any = null;
  let isInitializing = false;
  let modelLoadingPromise: Promise<any> | null = null;

  const HOLD_DURATION = 1500;

  // ── Pre-load models in background ─────────────────────────────────────────
  if (browser && !modelLoadingPromise) {
    modelLoadingPromise = (async () => {
      const HumanModule = await import('@vladmandic/human');
      const humanInstance = new HumanModule.default({
        backend:      'webgl',
        modelBasePath: '/models/human',
        hand:         { enabled: false },
        body:         { enabled: false },
        object:       { enabled: false },
        gesture:      { enabled: false },
        segmentation: { enabled: false },
        face: {
          enabled:     true,
          detector:    { maxDetected: 1, return: true },
          description: { enabled: true },
          emotion:     { enabled: false },
          mesh:        { enabled: false },
          iris:        { enabled: false },
          antispoof:   { enabled: true },
          liveness:    { enabled: true },
        },
      });
      await humanInstance.load();
      await humanInstance.warmup();
      return humanInstance;
    })();
  }

  // ── Face detection ─────────────────────────────────────────────────────────
  async function detectFace() {
    if (!human || !video || video.paused || !video.videoWidth) return null;
    try {
      const result = await human.detect(video);
      if (!result?.face?.length) return null;
      return result;
    } catch {
      return null;
    }
  }

  function getFaceDescriptor(face: any): number[] | null {
    if (face.embedding && Array.isArray(face.embedding)) return face.embedding;
    return null;
  }

   // ── Theme-aware canvas colors ──────────────────────────────────────────────
  function getFvColors() {
    const s = getComputedStyle(document.documentElement);
    const get = (v: string, fallback: string) => s.getPropertyValue(v).trim() || fallback;
    return {
      overlayBg:  get('--fv-overlay-bg',  'rgba(10,13,15,0.72)'),
      ringOk:     get('--fv-ring-ok',     '#00c9a7'),
      ringErr:    get('--fv-ring-err',     '#ef4444'),
      ringIdle:   get('--fv-ring-idle',   'rgba(255,255,255,0.18)'),
      cornerOk:   get('--fv-corner-ok',   'rgba(0,201,167,0.6)'),
      labelOk:    get('--fv-label-ok',    '#00c9a7'),
      labelErr:   get('--fv-label-err',   '#ef4444'),
      arcColor:   get('--fv-arc-color',   'rgba(0,201,167,0.6)'),
      multiLabel: get('--fv-multi-label', '#ef4444'),
      pctColor:   get('--fv-pct-color',   '#00c9a7'),
    };
  }

  // ── Canvas overlay ─────────────────────────────────────────────────────────
  function drawOverlay(
    detected: boolean,
    multiple: boolean = false,
    progress: number = 0,
    securityPass: boolean = true,
  ) {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const rx = w * 0.28, ry = h * 0.44;

    ctx.clearRect(0, 0, w, h);

    // Vignette with oval cutout
    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Oval border
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = multiple ? '#ef4444' : detected ? '#00c9a7' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = detected ? 2.5 : 1.5;
    ctx.stroke();

    // Corner brackets
    const corners: [number, number, [number, number]][] = [
      [cx - rx, cy - ry, [1,  1]],
      [cx + rx, cy - ry, [-1, 1]],
      [cx - rx, cy + ry, [1, -1]],
      [cx + rx, cy + ry, [-1,-1]],
    ];
    ctx.strokeStyle = multiple ? '#ef4444' : detected ? '#00c9a7' : 'rgba(0,201,167,0.6)';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    for (const [x, y, [dx, dy]] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * 20, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * 20);
      ctx.stroke();
    }

    // Security label
    if (!securityPass && !multiple) {
      ctx.save();
      ctx.fillStyle    = '#ef4444';
      ctx.font         = 'bold 10px system-ui';
      ctx.textAlign    = 'center';
      ctx.fillText('🔒 Security Check Failed', cx, cy - ry - 10);
      ctx.restore();
    } else if (securityPass && detected && progress > 0) {
      ctx.save();
      ctx.fillStyle    = '#00c9a7';
      ctx.font         = 'bold 10px system-ui';
      ctx.textAlign    = 'center';
      ctx.fillText('✓ Live Person Verified', cx, cy - ry - 10);
      ctx.restore();
    }

    // Progress arc
    if (detected && progress > 0 && !multiple) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        cx, cy, rx + 8, ry + 8, 0,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
      );
      ctx.strokeStyle = 'rgba(0,201,167,0.6)';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.stroke();
      ctx.font        = 'bold 12px system-ui';
      ctx.fillStyle   = '#00c9a7';
      ctx.textAlign   = 'center';
      ctx.fillText(`${Math.round(progress * 100)}%`, cx, cy + ry + 20);
      ctx.restore();
    }

    // Multiple faces label
    if (multiple) {
      ctx.save();
      ctx.fillStyle  = '#ef4444';
      ctx.font       = 'bold 14px system-ui';
      ctx.textAlign  = 'center';
      ctx.fillText('⚠ Multiple faces detected', cx, cy + ry + 28);
      ctx.restore();
    }
  }

  // ── Detection loop ─────────────────────────────────────────────────────────
  let lastDetectionTime = 0;
  const DETECTION_INTERVAL = 100;

  async function loop() {
    if (status !== 'scanning' || !human || !video) {
      if (status === 'scanning') raf = requestAnimationFrame(loop);
      return;
    }

    const now = Date.now();
    if (now - lastDetectionTime < DETECTION_INTERVAL) {
      raf = requestAnimationFrame(loop);
      return;
    }
    lastDetectionTime = now;

    try {
      const result = await detectFace();

      if (!result?.face?.length) {
        drawOverlay(false);
        faceDetected  = false;
        holdProgress  = 0;
        holdStartTime = null;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        subline = 'Position your face in the oval';
        raf = requestAnimationFrame(loop);
        return;
      }

      faceCount = result.face.length;

      if (faceCount > 1) {
        drawOverlay(false, true);
        faceDetected  = false;
        holdProgress  = 0;
        holdStartTime = null;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        subline = 'Only one person allowed';
        raf = requestAnimationFrame(loop);
        return;
      }

      const face = result.face[0];

      // Liveness / antispoof
      const isLive = face.liveness?.score  != null ? face.liveness.score  > 0.65 : true;
      const isReal = face.antispoof?.score != null ? face.antispoof.score > 0.65 : true;

      if (!isLive || !isReal) {
        drawOverlay(false, false, 0, false);
        faceDetected  = false;
        holdProgress  = 0;
        holdStartTime = null;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        subline = !isLive
          ? 'Real face required — no photos or videos allowed'
          : 'Fake face detected — verification blocked';
        raf = requestAnimationFrame(loop);
        return;
      }

      const descriptor = getFaceDescriptor(face);
      if (!descriptor) {
        raf = requestAnimationFrame(loop);
        return;
      }

      faceDetected = true;

      if (!holdTimer) {
        holdStartTime = Date.now();
        holdTimer = window.setTimeout(() => verify(descriptor), HOLD_DURATION);
      }

      holdProgress = holdStartTime
        ? Math.min((Date.now() - holdStartTime) / HOLD_DURATION, 1)
        : 0;

      subline = 'Hold still…';
      drawOverlay(true, false, holdProgress, true);
      raf = requestAnimationFrame(loop);
    } catch (err) {
      console.error('Detection error:', err);
      raf = requestAnimationFrame(loop);
    }
  }

  // ── Verify against server ──────────────────────────────────────────────────
  async function verify(descriptor: number[]) {
    status   = 'processing';
    headline = 'Verifying…';
    subline  = 'Matching your face…';
    stopCamera();

    try {
      const res = await fetch('/api/face/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ descriptor, examId, timestamp: Date.now() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

      // Set session cookies
      const sessionRes = await fetch('/api/face/verify-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ verified: true, similarityScore: data.similarity, examId }),
      });

      if (!sessionRes.ok) {
        console.warn('Failed to set verification session cookies');
      }

      status   = 'success';
      headline = 'Verified!';
      subline  = data.warning ?? `Identity confirmed. Match: ${Math.round(data.similarity * 100)}%`;
      setTimeout(() => onSuccess(), 1200);
    } catch (e: any) {
      console.error('Verification error:', e);
      status       = 'error';
      headline     = 'Verification failed';
      errorMessage = e.message ?? 'Please try again';
      subline      = errorMessage;
    }
  }

  // ── Camera helpers ─────────────────────────────────────────────────────────
  function stopCamera() {
    if (raf)       { cancelAnimationFrame(raf); raf = null; }
    if (holdTimer) { clearTimeout(holdTimer);   holdTimer = null; }
    stream?.getTracks().forEach(t => { if (t.readyState === 'live') t.stop(); });
    stream = null;
  }

  function startVerification() { status = 'loading'; init(); }

  function retry() {
    holdProgress  = 0;
    holdStartTime = null;
    faceDetected  = false;
    errorMessage  = '';
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    status = 'loading';
    init();
  }

  async function init() {
    if (!browser || isInitializing) return;

    try {
      const progressInterval = setInterval(() => {
        if (loadingProgress < 90) loadingProgress += 10;
      }, 200);

      if (!human) {
        isInitializing = true;
        human = await (modelLoadingPromise ?? (async () => {
          const HumanModule = await import('@vladmandic/human');
          const h = new HumanModule.default({
            backend:      'webgl',
            modelBasePath: '/models/human',
            hand:         { enabled: false },
            body:         { enabled: false },
            object:       { enabled: false },
            gesture:      { enabled: false },
            segmentation: { enabled: false },
            face: {
              enabled:     true,
              detector:    { maxDetected: 1, return: true },
              description: { enabled: true },
              emotion:     { enabled: false },
              mesh:        { enabled: false },
              iris:        { enabled: false },
              antispoof:   { enabled: true },
              liveness:    { enabled: true },
            },
          });
          await h.load();
          await h.warmup();
          return h;
        })());
        isInitializing = false;
      }

      clearInterval(progressInterval);
      loadingProgress = 100;

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      });

      video.srcObject = stream;

      await new Promise<void>(resolve => {
        const onLoaded = () => {
          if (video.videoWidth && video.videoHeight) {
            video.removeEventListener('loadeddata', onLoaded);
            resolve();
          }
        };
        video.addEventListener('loadeddata', onLoaded);
        if (video.readyState >= 2) onLoaded();
      });

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx = canvas.getContext('2d');

      status      = 'scanning';
      headline    = 'Verify your identity';
      subline     = 'Position your face in the oval';
      holdProgress = 0;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    } catch (e: any) {
      isInitializing = false;
      status         = 'error';
      headline       = 'Camera error';
      errorMessage   = e.message?.includes('denied')
        ? 'Allow camera access and try again'
        : e.message?.includes('not found')
          ? 'No camera found on this device'
          : 'Failed to start camera — check permissions';
      subline = errorMessage;
    }
  }

  // Auto-start on mount
  onMount(() => {
    startVerification();
    return () => stopCamera();
  });

  onDestroy(stopCamera);
</script>

<div
  class="modal-backdrop"
  onclick={onCancel}
  role="dialog"
  aria-modal="true"
  aria-labelledby="verify-title"
>
  <div class="modal" onclick={(e) => e.stopPropagation()}>

    <header class="modal-header">
      <h2 id="verify-title">{headline}</h2>
      <button class="close-btn" onclick={onCancel} aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </header>

    <div class="cam-wrap">
      <video bind:this={video} class="feed" autoplay muted playsinline></video>
      <canvas bind:this={canvas} class="overlay"></canvas>

      {#if status === 'loading'}
        <div class="center-state">
          <div class="spinner"></div>
          <p class="state-text">Starting camera…</p>
          {#if loadingProgress > 0 && loadingProgress < 100}
            <div class="progress-bar">
              <div class="progress-fill" style="width: {loadingProgress}%"></div>
            </div>
            <p class="state-text">{Math.round(loadingProgress)}%</p>
          {/if}
        </div>
      {/if}

      {#if status === 'processing'}
        <div class="center-state">
          <div class="spinner teal"></div>
          <p class="state-text">Verifying identity…</p>
        </div>
      {/if}

      {#if status === 'success'}
        <div class="center-state success-state">
          <div class="success-ring">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p class="state-text success-text">{headline}</p>
        </div>
      {/if}

      {#if status === 'error'}
        <div class="center-state error-state">
          <div class="error-ring">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p class="state-text error-text">{headline}</p>
        </div>
      {/if}

      {#if status === 'scanning'}
        <div class="face-badge" class:bad={faceCount > 1} class:good={faceCount === 1}>
          {#if faceCount === 0}
            <span class="badge-dot"></span> No face
          {:else if faceCount === 1}
            <span class="badge-dot green"></span> Face detected
          {:else}
            <span class="badge-dot red"></span> {faceCount} faces
          {/if}
        </div>
      {/if}
    </div>

    <div class="bottom">
      {#if status === 'error'}
        <p class="subline error-sub">{subline}</p>
        <button class="cta" onclick={retry}>Try Again</button>
      {:else if status === 'scanning'}
        <div class="scan-indicator">
          <div class="scan-dots">
            <div class="s-dot" class:active={!faceDetected}></div>
            <div class="s-dot" class:active={faceDetected && holdProgress < 1}></div>
            <div class="s-dot" class:active={holdProgress >= 1}></div>
          </div>
          <p class="subline" class:hold={faceDetected}>{subline}</p>
          {#if holdProgress > 0}
            <div class="hold-bar">
              <div class="hold-fill" style="width: {holdProgress * 100}%"></div>
            </div>
          {/if}
        </div>
      {:else if status === 'success'}
        <p class="subline success-sub">{subline}</p>
      {:else}
        <p class="subline">{subline}</p>
      {/if}
    </div>

  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fade-in 0.2s ease;
  }

  .modal {
    width: 100%; max-width: 420px;
    background: var(--fv-modal-bg);
    border-radius: 1.25rem; overflow: hidden;
    border: 1px solid var(--fv-modal-border);
    box-shadow: 0 24px 48px rgba(0,0,0,0.5);
    animation: scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
    display: flex; flex-direction: column;
  }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--fv-header-border);
  }

  .modal-header h2 {
    font-size: 0.95rem; font-weight: 700;
    color: var(--fv-title); margin: 0;
  }

  .close-btn {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--fv-close-bg);
    border: 1px solid var(--fv-close-border);
    color: var(--fv-close-color);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s;
  }

  .close-btn:hover {
    background: var(--fv-close-hover);
    color: var(--fv-title);
  }

  .cam-wrap {
    position: relative; width: 100%; aspect-ratio: 4/3;
    background: #000; overflow: hidden;
  }

  .feed {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; transform: scaleX(-1);
  }

  .overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none;
  }

  .center-state {
    position: absolute; inset: 0; z-index: 10;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.875rem;
    background: var(--fv-center-bg);
  }

  .success-state,
  .error-state { background: var(--fv-center-bg); }

  .success-ring {
    width: 64px; height: 64px; border-radius: 50%;
    border: 2px solid rgba(0,201,167,0.3); background: rgba(0,201,167,0.1);
    display: flex; align-items: center; justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }

  .error-ring {
    width: 64px; height: 64px; border-radius: 50%;
    border: 2px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.1);
    display: flex; align-items: center; justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }

  .state-text   { font-size: 0.875rem; color: var(--fv-center-text); margin: 0; }
  .success-text { color: #00c9a7; font-weight: 600; }
  .error-text   { color: #ef4444; font-weight: 600; }

  .progress-bar {
    width: 200px; height: 4px;
    background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg,#00c9a7,#00e5b9);
    border-radius: 2px; transition: width 0.3s ease;
  }

  .face-badge {
    position: absolute; top: 0.75rem; right: 0.75rem; z-index: 15;
    padding: 0.375rem 0.75rem; border-radius: 100px;
    font-size: 0.7rem; font-weight: 600;
    display: flex; align-items: center; gap: 0.375rem;
    background: var(--fv-badge-bg);
    border: 1px solid var(--fv-badge-border);
    backdrop-filter: blur(8px);
    color: var(--fv-badge-color);
    transition: all 0.3s; animation: fade-in 0.3s ease;
  }

  .face-badge.good {
    background: var(--fv-badge-ok-bg);
    border-color: var(--fv-badge-ok-bd);
    color: var(--fv-badge-ok-tx);
  }

  .face-badge.bad {
    background: var(--fv-badge-err-bg);
    border-color: var(--fv-badge-err-bd);
    color: var(--fv-badge-err-tx);
    animation: shake 0.4s ease, fade-in 0.3s ease;
  }

  .badge-dot       { width: 5px; height: 5px; border-radius: 50%; background: var(--fv-badge-color); }
  .badge-dot.green { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,0.5); }
  .badge-dot.red   { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,0.5); }

  .bottom {
    padding: 1.25rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    border-top: 1px solid var(--fv-bottom-border);
  }

  .subline {
    font-size: 0.8rem; color: var(--fv-subline);
    margin: 0; text-align: center; min-height: 1.3em;
  }

  .subline.hold        { color: var(--fv-subline-ok); }
  .subline.error-sub   { color: var(--fv-subline-err); }
  .subline.success-sub { color: var(--fv-subline-ok); }

  .cta {
    width: 100%; padding: 0.85rem;
    background: var(--fv-cta-bg);
    color: #fff; border: none; border-radius: 0.75rem;
    font-weight: 700; font-size: 0.9rem; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
    box-shadow: 0 4px 16px rgba(21,128,61,0.3);
  }

  .cta:hover  { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(21,128,61,0.4); }
  .cta:active { transform: scale(0.98) translateY(0); }

  .scan-indicator {
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem; width: 100%;
  }

  .scan-dots { display: flex; gap: 6px; }

  .s-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }

  .s-dot.active { background: #00c9a7; box-shadow: 0 0 8px rgba(0,201,167,0.4); transform: scale(1.2); }

  .hold-bar {
    width: 100%; max-width: 200px; height: 3px;
    background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; margin-top: 0.25rem;
  }

  .hold-fill {
    height: 100%;
    background: linear-gradient(90deg,#00c9a7,#00e5b9);
    border-radius: 999px; transition: width 0.1s linear;
  }

  .spinner {
    width: 36px; height: 36px;
    border: 2.5px solid var(--fv-spinner-track);
    border-top-color: var(--fv-spinner-head);
    border-radius: 50%; animation: spin 0.75s linear infinite;
  }

  .spinner.teal { border-top-color: #00c9a7; }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    25%     { transform: translateX(-3px); }
    75%     { transform: translateX(3px); }
  }

  @media (max-width: 480px) {
    .modal-backdrop { padding: 0.5rem; }
    .modal { max-width: 100%; border-radius: 1rem; }
    .bottom { padding: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner, .success-ring, .error-ring,
    .modal, .modal-backdrop, .hold-fill,
    .progress-fill, .s-dot { animation: none; transition: none; }
  }
  </style>