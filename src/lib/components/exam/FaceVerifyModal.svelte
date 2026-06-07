<!-- src/lib/components/exam/FaceVerifyModal.svelte -->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    open: boolean;
    examId: string;
    onClose: () => void;
    onVerified: () => void;
  }

  let { open, examId, onClose, onVerified }: Props = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;
  let scanRaf: number | null = null;

  type Status = 'intro' | 'loading' | 'scanning' | 'processing' | 'success' | 'error';
  let status = $state<Status>('intro');
  let headline = $state('Verify your identity');
  let subline = $state('Position your face in the frame');
  let scanY = $state(0);
  let scanDir = 1;
  let faceDetected = $state(false);
  let faceCount = $state(0);
  let holdProgress = $state(0);
  let holdTimer: number | null = null;
  let errorMessage = $state('');

  let faceapi: typeof import('@vladmandic/face-api') | null = null;

  const HOLD_DURATION = 1500;

  // ── scan line animation ─────────────────────────────────────────────────────
  function animateScan() {
    scanY += scanDir * 0.012;
    if (scanY >= 1) { scanY = 1; scanDir = -1; }
    if (scanY <= 0) { scanY = 0; scanDir = 1; }
    scanRaf = requestAnimationFrame(animateScan);
  }

  // ── canvas overlay ──────────────────────────────────────────────────────────
  function drawOverlay(detected: boolean, multiple: boolean = false, progress: number = 0) {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const rx = w * 0.34, ry = h * 0.42;

    ctx.clearRect(0, 0, w, h);

    // darken outside
    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.75)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // oval stroke
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (multiple) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
    } else if (detected) {
      ctx.strokeStyle = '#00c9a7';
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();

    // corner brackets
    const bLen = 22, bW = 2.5;
    const positions = [
      { x: cx - rx, y: cy - ry, d: [1, 1] },
      { x: cx + rx, y: cy - ry, d: [-1, 1] },
      { x: cx - rx, y: cy + ry, d: [1, -1] },
      { x: cx + rx, y: cy + ry, d: [-1, -1] },
    ];
    ctx.strokeStyle = multiple ? '#ef4444' : detected ? '#00c9a7' : 'rgba(0,201,167,0.6)';
    ctx.lineWidth = bW;
    ctx.lineCap = 'round';
    for (const { x, y, d } of positions) {
      ctx.beginPath(); ctx.moveTo(x + d[0] * bLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y + d[1] * bLen); ctx.stroke();
    }

    // progress ring when face detected
    if (detected && progress > 0 && !multiple) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy, rx + 10, ry + 10, 0, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2));
      ctx.strokeStyle = 'rgba(0,201,167,0.5)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // scan line
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, Math.PI * 2); ctx.clip();
    const sy = cy - ry + scanY * ry * 2;
    const grad = ctx.createLinearGradient(0, sy - 12, 0, sy + 12);
    grad.addColorStop(0, 'rgba(0,201,167,0)');
    grad.addColorStop(0.5, 'rgba(0,201,167,0.55)');
    grad.addColorStop(1, 'rgba(0,201,167,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - rx, sy - 12, rx * 2, 24);
    ctx.restore();
  }

  // ── detection loop ──────────────────────────────────────────────────────────
  async function loop() {
    if (status !== 'scanning' || !faceapi) return;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceDescriptors();

      faceCount = detections.length;

      if (faceCount === 0) {
        drawOverlay(false);
        faceDetected = false;
        holdProgress = 0;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        subline = 'Position your face in the oval';
        raf = requestAnimationFrame(loop);
        return;
      }

      if (faceCount > 1) {
        drawOverlay(false, true);
        faceDetected = false;
        holdProgress = 0;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        subline = 'Only one person allowed';
        raf = requestAnimationFrame(loop);
        return;
      }

      const det = detections[0];
      faceDetected = true;

      if (!holdTimer) {
        holdTimer = window.setTimeout(() => {
          verify(Array.from(det.descriptor));
        }, HOLD_DURATION);
      }
      holdProgress = Math.min(holdProgress + 0.04, 1);

      drawOverlay(true, false, holdProgress);
      subline = 'Hold steady…';
      raf = requestAnimationFrame(loop);
    } catch {
      raf = requestAnimationFrame(loop);
    }
  }

  // ── verify against server ───────────────────────────────────────────────────
  async function verify(descriptor: number[]) {
    status = 'processing';
    headline = 'Verifying…';
    subline = 'Matching your face…';
    stopCamera();

    try {
      const res = await fetch('/api/face/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Verification failed' }));
        throw new Error(err.message ?? 'Verification failed');
      }

      const data = await res.json();
      status = 'success';
      headline = 'Verified!';
      subline = data.warning ?? 'Identity confirmed. Entering exam…';
      setTimeout(() => onVerified(), 1200);
    } catch (e: any) {
      status = 'error';
      headline = 'Verification failed';
      errorMessage = e.message ?? 'Please try again';
      subline = errorMessage;
    }
  }

  function stopCamera() {
    if (raf) cancelAnimationFrame(raf);
    if (scanRaf) cancelAnimationFrame(scanRaf);
    if (holdTimer) clearTimeout(holdTimer);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function startVerification() {
    status = 'loading';
    init();
  }

  function retry() {
    holdProgress = 0;
    faceDetected = false;
    errorMessage = '';
    status = 'loading';
    init();
  }

  async function init() {
    try {
      if (!faceapi) {
        faceapi = await import('@vladmandic/face-api');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx = canvas.getContext('2d');

      status = 'scanning';
      headline = 'Verify your identity';
      subline = 'Position your face in the frame';

      animateScan();
      raf = requestAnimationFrame(loop);
    } catch (e: any) {
      status = 'error';
      headline = 'Camera error';
      errorMessage = e.message?.includes('denied') 
        ? 'Allow camera access and retry' 
        : 'Failed to load camera';
      subline = errorMessage;
    }
  }

  onMount(() => {});
  onDestroy(stopCamera);

  // Start when modal opens
  $effect(() => {
    if (open && status === 'intro') {
      startVerification();
    }
    if (!open) {
      stopCamera();
      status = 'intro';
      holdProgress = 0;
      faceDetected = false;
      errorMessage = '';
    }
  });
</script>

{#if open}
  <div class="modal-backdrop" onclick={onClose} role="dialog" aria-modal="true" aria-labelledby="verify-title">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <header class="modal-header">
        <h2 id="verify-title">{headline}</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <!-- Camera -->
      <div class="cam-wrap">
        <video bind:this={video} class="feed" autoplay muted playsinline></video>
        <canvas bind:this={canvas} class="overlay"></canvas>

        {#if status === 'loading'}
          <div class="center-state">
            <div class="spinner"></div>
            <p class="state-text">Starting camera…</p>
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
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p class="state-text error-text">{headline}</p>
          </div>
        {/if}

        <!-- Face badge -->
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

      <!-- Bottom panel -->
      <div class="bottom">
        {#if status === 'intro'}
          <p class="subline">Click below to start face verification</p>
          <button class="cta" onclick={startVerification}>Start Verification</button>
        {:else if status === 'error'}
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
          </div>
        {:else if status === 'success'}
          <p class="subline success-sub">{subline}</p>
        {:else}
          <p class="subline">{subline}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: fade-in 0.2s ease;
  }

  .modal {
    width: 100%;
    max-width: 420px;
    background: #0f1115;
    border-radius: 1.25rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
    animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .modal-header h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .cam-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #000;
    overflow: hidden;
  }

  .feed {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .center-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    background: rgba(10, 13, 15, 0.85);
    z-index: 10;
  }

  .success-state { background: rgba(10, 13, 15, 0.9); }
  .error-state { background: rgba(10, 13, 15, 0.9); }

  .success-ring {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(0, 201, 167, 0.3);
    background: rgba(0, 201, 167, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .error-ring {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .state-text {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  .success-text { color: #00c9a7; font-weight: 600; }
  .error-text { color: #ef4444; font-weight: 600; }

  .face-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 15;
    padding: 0.375rem 0.75rem;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.3s;
    animation: fade-in 0.3s ease;
  }

  .face-badge.good {
    background: rgba(0, 201, 167, 0.15);
    border-color: rgba(0, 201, 167, 0.3);
    color: #00c9a7;
  }

  .face-badge.bad {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
    animation: shake 0.4s ease, fade-in 0.3s ease;
  }

  .badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
  }

  .badge-dot.green {
    background: #00c9a7;
    box-shadow: 0 0 4px rgba(0, 201, 167, 0.5);
  }

  .badge-dot.red {
    background: #ef4444;
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
  }

  .bottom {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .subline {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
    text-align: center;
    min-height: 1.3em;
  }

  .subline.hold { color: #00c9a7; }
  .subline.error-sub { color: #ef4444; }
  .subline.success-sub { color: #00c9a7; }

  .cta {
    width: 100%;
    padding: 0.85rem;
    background: linear-gradient(135deg, #15803d, #166534);
    color: #fff;
    border: none;
    border-radius: 0.75rem;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    box-shadow: 0 4px 16px rgba(21, 128, 61, 0.3);
  }

  .cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(21, 128, 61, 0.4);
  }

  .cta:active {
    transform: scale(0.98) translateY(0);
  }

  .scan-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
  }

  .scan-dots {
    display: flex;
    gap: 6px;
  }

  .s-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .s-dot.active {
    background: #00c9a7;
    box-shadow: 0 0 8px rgba(0, 201, 167, 0.4);
    transform: scale(1.2);
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 2.5px solid rgba(255, 255, 255, 0.08);
    border-top-color: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  .spinner.teal { border-top-color: #00c9a7; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }
</style>