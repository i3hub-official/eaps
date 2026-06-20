<!-- src/lib/components/exam/FaceEnrollmentModal.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import {
    selectGestures,
    gestureConfidence,
    GestureTracker,
    createTrackerForGesture,
    type GestureDefinition,
  } from './gesture-service.js';

  interface Props {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
  }

  let { open, onClose, onComplete }: Props = $props();

  // ── DOM refs ─────────────────────────────────────────────────────────────
  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;

  // ── Status ────────────────────────────────────────────────────────────────
  type Status = 'intro' | 'loading' | 'positioning' | 'gesture' | 'processing' | 'done' | 'error';
  let status          = $state<Status>('intro');
  let headline        = $state('Face Enrollment');
  let subline         = $state('Starting camera…');
  let errorMessage    = $state('');
  let loadingProgress = $state(0);
  let faceDetected    = $state(false);

  // ── Gesture state ─────────────────────────────────────────────────────────
  let selected: GestureDefinition[] = [];
  let gestureIndex = $state(0);
  let gesturesDone = $state(0);
  let holdProgress = $state(0);
  let tracker = new GestureTracker();

  // ── Descriptor collection ─────────────────────────────────────────────────
  let descriptors: number[][] = [];

  // ── Positioning hold bar ──────────────────────────────────────────────────
  let posHoldProgress  = $state(0);
  let posHoldStart: number | null = null;
  const POS_HOLD_MS    = 1000;

  // ── Human ────────────────────────────────────────────────────────────────
  let human: any = null;
  let modelLoadingPromise: Promise<any> | null = null;

  if (browser && !modelLoadingPromise) {
    modelLoadingPromise = (async () => {
      const { default: Human } = await import('@vladmandic/human');
      const h = new Human({
        backend: 'webgl',
        modelBasePath: '/models/human',
        hand:         { enabled: false },
        body:         { enabled: false },
        object:       { enabled: false },
        segmentation: { enabled: false },
        gesture:      { enabled: true },
        face: {
          enabled:     true,
          detector:    { maxDetected: 1, minConfidence: 0.5, return: true },
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
  }

  // ── Detection throttle ────────────────────────────────────────────────────
  const DETECT_INTERVAL = 80;
  let lastDetectAt = 0;
  let lastResult: any = null;

  async function runDetect(): Promise<void> {
    if (!human || !video || video.paused || !video.videoWidth) return;
    const now = performance.now();
    if (now - lastDetectAt < DETECT_INTERVAL) return;
    lastDetectAt = now;
    try {
      lastResult = await human.detect(video);
    } catch {
      lastResult = null;
    }
  }

  // ── Theme-aware overlay colors ────────────────────────────────────────────
  // Read computed CSS vars at draw time so the canvas reflects the active theme.
  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    // Falls back to dark values if vars are not set (e.g. canvas runs before
    // the theme is applied — matches the original behaviour exactly).
    return {
      overlayBg:   style.getPropertyValue('--fe-overlay-bg').trim()   || 'rgba(10,13,15,0.72)',
      ringOk:      style.getPropertyValue('--fe-ring-ok').trim()       || '#00c9a7',
      ringErr:     style.getPropertyValue('--fe-ring-err').trim()      || '#ef4444',
      ringIdle:    style.getPropertyValue('--fe-ring-idle').trim()     || 'rgba(255,255,255,0.18)',
      cornerOk:    style.getPropertyValue('--fe-corner-ok').trim()     || 'rgba(0,201,167,0.6)',
      pillBg:      style.getPropertyValue('--fe-pill-bg').trim()       || 'rgba(10,13,15,0.85)',
      pillBorder:  style.getPropertyValue('--fe-pill-border').trim()   || 'rgba(255,255,255,0.25)',
      pillText:    style.getPropertyValue('--fe-pill-text').trim()     || '#ffffff',
      pillTextOk:  style.getPropertyValue('--fe-pill-text-ok').trim()  || '#00e5b9',
      badgeWarnBg: style.getPropertyValue('--fe-badge-warn-bg').trim() || 'rgba(239,68,68,0.2)',
      badgeWarnBd: style.getPropertyValue('--fe-badge-warn-bd').trim() || 'rgba(239,68,68,0.5)',
      badgeWarnTx: style.getPropertyValue('--fe-badge-warn-tx').trim() || '#fca5a5',
      badgeOkBg:   style.getPropertyValue('--fe-badge-ok-bg').trim()   || 'rgba(0,201,167,0.15)',
      badgeOkBd:   style.getPropertyValue('--fe-badge-ok-bd').trim()   || 'rgba(0,201,167,0.4)',
      badgeOkTx:   style.getPropertyValue('--fe-badge-ok-tx').trim()   || '#00c9a7',
      badgeIdleBg: style.getPropertyValue('--fe-badge-idle-bg').trim() || 'rgba(255,255,255,0.07)',
      badgeIdleBd: style.getPropertyValue('--fe-badge-idle-bd').trim() || 'rgba(255,255,255,0.14)',
      badgeIdleTx: style.getPropertyValue('--fe-badge-idle-tx').trim() || 'rgba(255,255,255,0.5)',
    };
  }

  // ── Overlay drawing ───────────────────────────────────────────────────────
  function drawOverlay(detected: boolean, multiple: boolean, progress: number, gestureLabel?: string) {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const rx = w * 0.28, ry = h * 0.44;
    const c  = getThemeColors();

    ctx.clearRect(0, 0, w, h);

    // Dimming mask with oval cutout
    ctx.save();
    ctx.fillStyle = c.overlayBg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Oval ring
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = multiple ? c.ringErr : detected ? c.ringOk : c.ringIdle;
    ctx.lineWidth   = detected ? 2.5 : 1.5;
    ctx.stroke();

    // Corner brackets
    const corners: [number, number, [number, number]][] = [
      [cx - rx, cy - ry, [1,  1]],
      [cx + rx, cy - ry, [-1, 1]],
      [cx - rx, cy + ry, [1, -1]],
      [cx + rx, cy + ry, [-1,-1]],
    ];
    ctx.strokeStyle = multiple ? c.ringErr : detected ? c.ringOk : c.cornerOk;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    for (const [x, y, [dx, dy]] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * 20, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * 20);
      ctx.stroke();
    }

    // Progress arc
    if (progress > 0 && detected && !multiple) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 10, ry + 10, 0,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = `rgba(0,201,167,${0.4 + progress * 0.4})`;
      ctx.lineWidth   = 4;
      ctx.lineCap     = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // Gesture label pill
    if (gestureLabel && !multiple) {
      ctx.save();
      const pillH   = 38;
      const pillY   = h * 0.95 - pillH / 2;
      const pillMid = pillY + pillH / 2;
      ctx.font = 'bold 14px system-ui';
      const textW = ctx.measureText(gestureLabel).width;
      const padX  = 22;
      const pillW = Math.min(textW + padX * 2, w * 0.82);
      const pillX = cx - pillW / 2;
      ctx.fillStyle   = progress > 0
        ? `rgba(0,201,167,${0.18 + progress * 0.14})`
        : c.pillBg;
      ctx.strokeStyle = progress > 0
        ? `rgba(0,201,167,${0.6 + progress * 0.3})`
        : c.pillBorder;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle    = progress > 0 ? c.pillTextOk : c.pillText;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gestureLabel, cx, pillMid);
      ctx.restore();
    }

    // Status badge (top centre)
    {
      const badgeY = h * 0.10;
      if (multiple) {
        ctx.save();
        ctx.fillStyle   = c.badgeWarnBg;
        ctx.strokeStyle = c.badgeWarnBd;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - 110, badgeY - 14, 220, 28, 14);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle    = c.badgeWarnTx;
        ctx.font         = 'bold 12px system-ui';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠ Multiple faces detected', cx, badgeY);
        ctx.restore();
      } else if (detected) {
        ctx.save();
        ctx.fillStyle   = c.badgeOkBg;
        ctx.strokeStyle = c.badgeOkBd;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(cx - 60, badgeY - 14, 120, 28, 14);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle    = c.badgeOkTx;
        ctx.font         = 'bold 12px system-ui';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓ Face detected', cx, badgeY);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle   = c.badgeIdleBg;
        ctx.strokeStyle = c.badgeIdleBd;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(cx - 72, badgeY - 14, 144, 28, 14);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle    = c.badgeIdleTx;
        ctx.font         = '600 12px system-ui';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Searching for face...', cx, badgeY);
        ctx.restore();
      }
    }
  }

  // ── Positioning loop ──────────────────────────────────────────────────────
  async function positioningLoop() {
    if (status !== 'positioning') return;

    await runDetect();
    const faces = lastResult?.face ?? [];

    if (faces.length === 0) {
      faceDetected = false; posHoldStart = null; posHoldProgress = 0;
      drawOverlay(false, false, 0);
      subline = 'Move closer and centre your face in the oval';
      raf = requestAnimationFrame(positioningLoop);
      return;
    }

    if (faces.length > 1) {
      faceDetected = false; posHoldStart = null; posHoldProgress = 0;
      drawOverlay(false, true, 0);
      subline = 'Only one person allowed';
      raf = requestAnimationFrame(positioningLoop);
      return;
    }

    const face = faces[0];
    faceDetected = true;

    const box    = face.box;
    const faceW  = Array.isArray(box) ? box[2] : box.bottomRight[0] - box.topLeft[0];
    const faceH  = Array.isArray(box) ? box[3] : box.bottomRight[1] - box.topLeft[1];
    const faceCX = Array.isArray(box) ? box[0] + box[2] / 2 : (box.topLeft[0] + box.bottomRight[0]) / 2;
    const faceCY = Array.isArray(box) ? box[1] + box[3] / 2 : (box.topLeft[1] + box.bottomRight[1]) / 2;

    const cx = canvas.width / 2, cy = canvas.height / 2;
    const rx = canvas.width * 0.28, ry = canvas.height * 0.44;

    const centred     = Math.abs(faceCX - cx) < rx * 0.5 && Math.abs(faceCY - cy) < ry * 0.5;
    const largeEnough = faceW > canvas.width * 0.15 && faceH > canvas.height * 0.2;

    if (centred && largeEnough) {
      const now = performance.now();
      if (!posHoldStart) posHoldStart = now;
      posHoldProgress = Math.min(1, (now - posHoldStart) / POS_HOLD_MS);
      subline = posHoldProgress < 1 ? 'Hold still…' : 'Starting gestures…';
      drawOverlay(true, false, posHoldProgress);

      if (posHoldProgress >= 1) {
        selected     = selectGestures(3);
        gestureIndex = 0;
        gesturesDone = 0;
        descriptors  = [];
        tracker      = createTrackerForGesture(selected[0].id);
        holdProgress = 0;
        status       = 'gesture';
        headline     = 'Face Enrollment';
        subline      = selected[0].label;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(gestureLoop);
        return;
      }
    } else {
      posHoldStart    = null;
      posHoldProgress = 0;
      subline = centred ? 'Move closer' : 'Centre your face';
      drawOverlay(true, false, 0);
    }

    raf = requestAnimationFrame(positioningLoop);
  }

  // ── Gesture loop ──────────────────────────────────────────────────────────
  async function gestureLoop() {
    if (status !== 'gesture') return;

    await runDetect();
    const faces    = lastResult?.face    ?? [];
    const gestures = lastResult?.gesture ?? [];

    if (faces.length === 0) {
      tracker.reset(); holdProgress = 0;
      drawOverlay(false, false, 0, selected[gestureIndex]?.label);
      subline = 'Keep your face in the oval';
      raf = requestAnimationFrame(gestureLoop);
      return;
    }

    if (faces.length > 1) {
      tracker.reset(); holdProgress = 0;
      drawOverlay(false, true, 0);
      subline = 'Only one person allowed';
      raf = requestAnimationFrame(gestureLoop);
      return;
    }

    const face = faces[0];
    const g    = selected[gestureIndex];

    if (!g) {
      console.warn('[gestureLoop] gestureIndex out of range:', gestureIndex, '/ selected.length:', selected.length);
      finishEnrollment();
      return;
    }

    const confidence = gestureConfidence(g.id, face, gestures);
    const confirmed  = tracker.update(confidence);
    holdProgress     = tracker.holdProgress;

    drawOverlay(true, false, holdProgress, g.label);
    subline = g.label;

    if (confirmed) {
      const embedding = face.embedding ? Array.from(face.embedding as number[]) : null;
      if (embedding && embedding.length > 0) {
        descriptors.push(embedding);
      } else {
        console.warn('[gestureLoop] No embedding captured for', g.id);
      }

      gesturesDone = gestureIndex + 1;

      if (gesturesDone >= selected.length) {
        finishEnrollment();
        return;
      }

      gestureIndex++;
      tracker      = createTrackerForGesture(selected[gestureIndex].id);
      holdProgress = 0;
      subline      = selected[gestureIndex].label;
    }

    raf = requestAnimationFrame(gestureLoop);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function finishEnrollment() {
    if (descriptors.length === 0) {
      status = 'error'; headline = 'Enrollment failed';
      errorMessage = 'No face captures collected. Please try again.';
      subline = errorMessage;
      return;
    }
    status = 'processing'; headline = 'Processing…'; subline = 'Saving your face data…';
    stopCamera();
    submitEnrollment();
  }

  async function submitEnrollment() {
    const photoDataUrl = await captureAndCompress();
    const dim = descriptors[0].length;
    const avg = new Array<number>(dim).fill(0);
    for (const d of descriptors) for (let i = 0; i < dim; i++) avg[i] += d[i];
    for (let i = 0; i < dim; i++) avg[i] /= descriptors.length;

    try {
      const res  = await fetch('/api/face/enroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: avg, embedding_dimension: avg.length, photo: photoDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      status = 'done'; headline = 'Enrolled!';
      subline = `Face saved (${avg.length}-dim embedding, ${descriptors.length} samples)`;
      setTimeout(() => onComplete(), 1800);
    } catch (e: any) {
      status = 'error'; headline = 'Enrollment failed';
      errorMessage = e.message ?? 'Please try again';
      subline = errorMessage;
    }
  }

  // ── Image capture ─────────────────────────────────────────────────────────
  async function captureAndCompress(): Promise<string | null> {
    if (!video || !video.videoWidth) return null;
    const cap = document.createElement('canvas');
    const tw  = 160;
    const th  = Math.round(tw * (video.videoHeight / video.videoWidth));
    cap.width = tw; cap.height = th;
    const c = cap.getContext('2d');
    if (!c) return null;
    c.translate(tw, 0); c.scale(-1, 1);
    c.drawImage(video, 0, 0, tw, th);
    let blob: Blob | null = await new Promise(r => cap.toBlob(r, 'image/webp', 0.15));
    if (!blob || blob.size > 15000) blob = await new Promise(r => cap.toBlob(r, 'image/jpeg', 0.2));
    if (!blob) return null;
    return new Promise(r => {
      const fr = new FileReader();
      fr.onloadend = () => r(fr.result as string);
      fr.readAsDataURL(blob!);
    });
  }

  // ── Camera helpers ────────────────────────────────────────────────────────
  function stopCamera() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function resetState() {
    descriptors = []; gesturesDone = 0; gestureIndex = 0;
    holdProgress = 0; posHoldProgress = 0; posHoldStart = null;
    faceDetected = false; lastResult = null; lastDetectAt = 0;
    tracker = new GestureTracker(); selected = [];
  }

  async function init() {
    if (!browser) return;
    try {
      const interval = setInterval(() => {
        if (loadingProgress < 88) loadingProgress += 6;
      }, 180);
      if (!human) human = await modelLoadingPromise;
      clearInterval(interval);
      loadingProgress = 100;
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      video.srcObject = stream;
      await new Promise<void>(resolve => {
        const check = () => { if (video.videoWidth) resolve(); else video.addEventListener('loadeddata', check, { once: true }); };
        if (video.readyState >= 2) resolve(); else check();
      });
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx    = canvas.getContext('2d');
      status = 'positioning'; headline = 'Position Your Face'; subline = 'Centre your face in the oval';
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(positioningLoop);
    } catch (e: any) {
      status = 'error'; headline = 'Camera error';
      errorMessage = e.message?.includes('denied')
        ? 'Allow camera access and retry'
        : e.message?.includes('not found')
          ? 'No camera found'
          : 'Failed to start — refresh and try again';
      subline = errorMessage;
    }
  }

  function startEnrollment() { status = 'loading'; init(); }
  function retry() { resetState(); status = 'loading'; init(); }

  onMount(() => () => stopCamera());
  onDestroy(stopCamera);

  $effect(() => {
    if (open && status === 'intro') startEnrollment();
    if (!open) {
      stopCamera(); resetState();
      status = 'intro'; errorMessage = ''; loadingProgress = 0;
    }
  });

  const currentGestureLabel = $derived(
    status === 'gesture' && selected[gestureIndex] ? selected[gestureIndex].label : ''
  );
</script>

{#if open}
  <div
    class="modal-backdrop"
    onclick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="enroll-title"
  >
    <div class="modal" onclick={(e) => e.stopPropagation()}>

      <header class="modal-header">
        <div class="header-left">
          <h2 id="enroll-title">{headline}</h2>
          {#if status === 'gesture'}
            <span class="step-badge">Step {gesturesDone + 1} of {selected.length}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close">
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
            <p class="state-text">Processing face data…</p>
          </div>
        {/if}

        {#if status === 'done'}
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
      </div>

      <div class="bottom">
        {#if status === 'intro'}
          <div class="intro-content">
            <div class="intro-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                <path d="M3 20a9 9 0 0 1 18 0"/>
              </svg>
            </div>
            <p class="intro-text">
              We'll verify you're a real person by asking you to perform
              <strong>3 simple gestures</strong> in front of your camera.
            </p>
            <div class="intro-steps">
              <div class="step"><span class="step-num">1</span> Allow camera access</div>
              <div class="step"><span class="step-num">2</span> Follow each gesture</div>
              <div class="step"><span class="step-num">3</span> Hold until captured</div>
            </div>
            <button class="cta" onclick={startEnrollment}>Start Enrollment</button>
          </div>

        {:else if status === 'error'}
          <p class="subline error-sub">{subline}</p>
          <button class="cta" onclick={retry}>Try Again</button>

        {:else if status === 'positioning'}
          <div class="positioning-panel">
            <div class="face-status" class:detected={faceDetected}>
              {#if faceDetected}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Face detected</span>
              {:else}
                <span class="searching-dot"></span>
                <span>Looking for face...</span>
              {/if}
            </div>
            <p class="subline">{subline}</p>
            {#if faceDetected && posHoldProgress > 0}
              <div class="hold-bar">
                <div class="hold-fill" style="width: {posHoldProgress * 100}%"></div>
              </div>
            {/if}
          </div>

        {:else if status === 'gesture'}
          <div class="gesture-panel">
            <div class="dots" role="progressbar" aria-valuenow={gesturesDone} aria-valuemax={selected.length}>
              {#each selected as _, i}
                <div class="dot" class:done={i < gesturesDone} class:active={i === gesturesDone}></div>
              {/each}
            </div>
            <div class="gesture-hint">
              <span class="gesture-icon">
                {#if selected[gestureIndex]?.icon === 'left'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                {:else if selected[gestureIndex]?.icon === 'right'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
                {:else if selected[gestureIndex]?.icon === 'blink'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {:else if selected[gestureIndex]?.icon === 'nod'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                {:else if selected[gestureIndex]?.icon === 'mouth'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
                {/if}
              </span>
              <p class="subline gesture-label" aria-live="polite">{currentGestureLabel}</p>
            </div>
            {#if holdProgress > 0}
              <div class="hold-bar">
                <div class="hold-fill" style="width: {holdProgress * 100}%"></div>
              </div>
            {/if}
          </div>

        {:else if status === 'done'}
          <p class="subline success-sub">{subline}</p>

        {:else}
          <p class="subline">{subline}</p>
        {/if}
      </div>

    </div>
  </div>
{/if}

<style>
  /* ── Theme tokens ──────────────────────────────────────────────────────────
     These drive both the CSS UI and the canvas overlay via getThemeColors().
     Light mode uses softer, semi-transparent surfaces.
     Dark mode preserves the original deep black aesthetic.
     The --fe-* vars are scoped to the modal root to avoid polluting globals.
  ──────────────────────────────────────────────────────────────────────────── */
  :global(:root),
  :global([data-theme="light"]) {
    /* Modal chrome */
    --fe-modal-bg:     #ffffff;
    --fe-modal-border: rgba(0, 0, 0, 0.08);
    --fe-header-border:rgba(0, 0, 0, 0.07);
    --fe-bottom-border:rgba(0, 0, 0, 0.07);

    /* Text */
    --fe-title:        #0f172a;
    --fe-subline:      #64748b;
    --fe-subline-err:  #dc2626;
    --fe-subline-ok:   #059669;

    /* Close button */
    --fe-close-bg:     rgba(0, 0, 0, 0.05);
    --fe-close-border: rgba(0, 0, 0, 0.08);
    --fe-close-color:  #64748b;
    --fe-close-hover:  rgba(0, 0, 0, 0.1);

    /* Intro */
    --fe-intro-text:        #475569;
    --fe-intro-strong:      #0f172a;
    --fe-step-color:        #475569;
    --fe-step-num-bg:       rgba(0, 201, 167, 0.12);
    --fe-step-num-border:   rgba(0, 201, 167, 0.3);
    --fe-step-num-color:    #059669;

    /* Face status pill */
    --fe-face-pill-bg:      rgba(0, 0, 0, 0.04);
    --fe-face-pill-border:  rgba(0, 0, 0, 0.08);
    --fe-face-pill-color:   #64748b;
    --fe-face-pill-ok-bg:   rgba(0, 201, 167, 0.08);
    --fe-face-pill-ok-bd:   rgba(0, 201, 167, 0.2);
    --fe-face-pill-ok-tx:   #059669;

    /* Dots */
    --fe-dot-idle:     rgba(0, 0, 0, 0.12);

    /* Hold / progress bars */
    --fe-bar-bg:       rgba(0, 0, 0, 0.08);

    /* Spinner */
    --fe-spinner-track:#e2e8f0;
    --fe-spinner-head: rgba(15, 23, 42, 0.35);

    /* Center-state overlay */
    --fe-center-bg:    rgba(255, 255, 255, 0.88);
    --fe-center-text:  #64748b;

    /* Canvas overlay colors (read by getThemeColors()) */
    --fe-overlay-bg:    rgba(248, 250, 252, 0.72);
    --fe-ring-ok:       #00c9a7;
    --fe-ring-err:      #ef4444;
    --fe-ring-idle:     rgba(0, 0, 0, 0.2);
    --fe-corner-ok:     rgba(0, 201, 167, 0.5);
    --fe-pill-bg:       rgba(255, 255, 255, 0.92);
    --fe-pill-border:   rgba(0, 0, 0, 0.12);
    --fe-pill-text:     #0f172a;
    --fe-pill-text-ok:  #059669;
    --fe-badge-warn-bg: rgba(239, 68, 68, 0.12);
    --fe-badge-warn-bd: rgba(239, 68, 68, 0.35);
    --fe-badge-warn-tx: #dc2626;
    --fe-badge-ok-bg:   rgba(0, 201, 167, 0.1);
    --fe-badge-ok-bd:   rgba(0, 201, 167, 0.3);
    --fe-badge-ok-tx:   #059669;
    --fe-badge-idle-bg: rgba(0, 0, 0, 0.06);
    --fe-badge-idle-bd: rgba(0, 0, 0, 0.1);
    --fe-badge-idle-tx: rgba(0, 0, 0, 0.4);
  }

  :global([data-theme="dark"]),
  :global(.dark) {
    /* Modal chrome */
    --fe-modal-bg:     #0f1115;
    --fe-modal-border: rgba(255, 255, 255, 0.08);
    --fe-header-border:rgba(255, 255, 255, 0.06);
    --fe-bottom-border:rgba(255, 255, 255, 0.06);

    /* Text */
    --fe-title:        #ffffff;
    --fe-subline:      rgba(255, 255, 255, 0.4);
    --fe-subline-err:  #ef4444;
    --fe-subline-ok:   #00c9a7;

    /* Close button */
    --fe-close-bg:     rgba(255, 255, 255, 0.06);
    --fe-close-border: rgba(255, 255, 255, 0.08);
    --fe-close-color:  rgba(255, 255, 255, 0.5);
    --fe-close-hover:  rgba(255, 255, 255, 0.1);

    /* Intro */
    --fe-intro-text:       rgba(255, 255, 255, 0.45);
    --fe-intro-strong:     rgba(255, 255, 255, 0.75);
    --fe-step-color:       rgba(255, 255, 255, 0.5);
    --fe-step-num-bg:      rgba(0, 201, 167, 0.15);
    --fe-step-num-border:  rgba(0, 201, 167, 0.3);
    --fe-step-num-color:   #00c9a7;

    /* Face status pill */
    --fe-face-pill-bg:     rgba(255, 255, 255, 0.06);
    --fe-face-pill-border: rgba(255, 255, 255, 0.1);
    --fe-face-pill-color:  rgba(255, 255, 255, 0.5);
    --fe-face-pill-ok-bg:  rgba(0, 201, 167, 0.1);
    --fe-face-pill-ok-bd:  rgba(0, 201, 167, 0.25);
    --fe-face-pill-ok-tx:  #00c9a7;

    /* Dots */
    --fe-dot-idle:     rgba(255, 255, 255, 0.15);

    /* Hold / progress bars */
    --fe-bar-bg:       rgba(255, 255, 255, 0.1);

    /* Spinner */
    --fe-spinner-track:rgba(255, 255, 255, 0.08);
    --fe-spinner-head: rgba(255, 255, 255, 0.4);

    /* Center-state overlay */
    --fe-center-bg:    rgba(10, 13, 15, 0.85);
    --fe-center-text:  rgba(255, 255, 255, 0.5);

    /* Canvas overlay colors */
    --fe-overlay-bg:    rgba(10, 13, 15, 0.72);
    --fe-ring-ok:       #00c9a7;
    --fe-ring-err:      #ef4444;
    --fe-ring-idle:     rgba(255, 255, 255, 0.18);
    --fe-corner-ok:     rgba(0, 201, 167, 0.6);
    --fe-pill-bg:       rgba(10, 13, 15, 0.85);
    --fe-pill-border:   rgba(255, 255, 255, 0.25);
    --fe-pill-text:     #ffffff;
    --fe-pill-text-ok:  #00e5b9;
    --fe-badge-warn-bg: rgba(239, 68, 68, 0.2);
    --fe-badge-warn-bd: rgba(239, 68, 68, 0.5);
    --fe-badge-warn-tx: #fca5a5;
    --fe-badge-ok-bg:   rgba(0, 201, 167, 0.15);
    --fe-badge-ok-bd:   rgba(0, 201, 167, 0.4);
    --fe-badge-ok-tx:   #00c9a7;
    --fe-badge-idle-bg: rgba(255, 255, 255, 0.07);
    --fe-badge-idle-bd: rgba(255, 255, 255, 0.14);
    --fe-badge-idle-tx: rgba(255, 255, 255, 0.5);
  }

  /* ── Modal chrome ─────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.6);
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
    background: var(--fe-modal-bg);
    border-radius: 1.25rem;
    overflow: hidden;
    border: 1px solid var(--fe-modal-border);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
    animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--fe-header-border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .modal-header h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--fe-title);
    margin: 0;
  }

  .step-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    background: rgba(0, 201, 167, 0.15);
    color: #00c9a7;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--fe-close-bg);
    border: 1px solid var(--fe-close-border);
    color: var(--fe-close-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: var(--fe-close-hover);
    color: var(--fe-title);
  }

  /* ── Camera area ──────────────────────────────────────────────────────────── */
  .cam-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #000;   /* always black — it's a camera feed */
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

  /* ── Center states (loading / processing / done / error) ─────────────────── */
  .center-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    background: var(--fe-center-bg);
    z-index: 10;
  }

  .state-text   { font-size: 0.875rem; color: var(--fe-center-text); margin: 0; }
  .success-text { color: #00c9a7; font-weight: 600; }
  .error-text   { color: #ef4444; font-weight: 600; }

  .success-ring {
    width: 64px; height: 64px; border-radius: 50%;
    border: 2px solid rgba(0, 201, 167, 0.3);
    background: rgba(0, 201, 167, 0.1);
    display: flex; align-items: center; justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .error-ring {
    width: 64px; height: 64px; border-radius: 50%;
    border: 2px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    display: flex; align-items: center; justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* ── Progress bar ─────────────────────────────────────────────────────────── */
  .progress-bar {
    width: 200px; height: 4px;
    background: var(--fe-bar-bg);
    border-radius: 2px; overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00c9a7, #00e5b9);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* ── Bottom panel ─────────────────────────────────────────────────────────── */
  .bottom {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    border-top: 1px solid var(--fe-bottom-border);
    min-height: 120px;
  }

  .subline {
    font-size: 0.8rem;
    color: var(--fe-subline);
    margin: 0;
    text-align: center;
    min-height: 1.3em;
  }

  .subline.error-sub   { color: var(--fe-subline-err); }
  .subline.success-sub { color: var(--fe-subline-ok); }
  .gesture-label       { font-size: 0.9rem; font-weight: 600; color: var(--fe-title); }

  /* ── CTA button ───────────────────────────────────────────────────────────── */
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

  .cta:hover  { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(21, 128, 61, 0.4); }
  .cta:active { transform: scale(0.98) translateY(0); }

  /* ── Intro ────────────────────────────────────────────────────────────────── */
  .intro-content {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.875rem; width: 100%;
    animation: slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .intro-icon {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(0, 201, 167, 0.08);
    border: 1px solid rgba(0, 201, 167, 0.25);
    display: flex; align-items: center; justify-content: center;
  }

  .intro-text {
    font-size: 0.8rem;
    color: var(--fe-intro-text);
    margin: 0; text-align: center; line-height: 1.6;
  }

  .intro-text strong { color: var(--fe-intro-strong); font-weight: 600; }

  .intro-steps {
    display: flex; flex-direction: column; gap: 0.5rem;
    width: 100%; margin: 0.25rem 0;
  }

  .step {
    display: flex; align-items: center; gap: 0.625rem;
    font-size: 0.78rem; color: var(--fe-step-color);
  }

  .step-num {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--fe-step-num-bg);
    border: 1px solid var(--fe-step-num-border);
    color: var(--fe-step-num-color);
    font-size: 0.65rem; font-weight: 800;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  /* ── Gesture panel ────────────────────────────────────────────────────────── */
  .gesture-panel {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.625rem; width: 100%;
  }

  .dots { display: flex; gap: 7px; align-items: center; margin-bottom: 0.25rem; }

  .dot {
    width: 6px; height: 6px; border-radius: 3px;
    background: var(--fe-dot-idle);
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .dot.active { width: 24px; background: #00c9a7; }
  .dot.done   { background: rgba(0, 201, 167, 0.4); }

  .gesture-hint { display: flex; align-items: center; gap: 0.5rem; }
  .gesture-icon { color: #00c9a7; display: flex; align-items: center; }

  /* ── Hold bar ─────────────────────────────────────────────────────────────── */
  .hold-bar {
    width: 100%; max-width: 200px; height: 3px;
    background: var(--fe-bar-bg);
    border-radius: 999px; overflow: hidden; margin-top: 0.25rem;
  }

  .hold-fill {
    height: 100%;
    background: linear-gradient(90deg, #00c9a7, #00e5b9);
    border-radius: 999px;
    transition: width 0.1s linear;
  }

  /* ── Positioning panel ────────────────────────────────────────────────────── */
  .positioning-panel {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.625rem; width: 100%;
    animation: slide-up 0.3s ease;
  }

  .face-status {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 1rem; border-radius: 999px;
    background: var(--fe-face-pill-bg);
    border: 1px solid var(--fe-face-pill-border);
    font-size: 0.8rem; font-weight: 600;
    color: var(--fe-face-pill-color);
    transition: all 0.3s ease;
  }

  .face-status.detected {
    background: var(--fe-face-pill-ok-bg);
    border-color: var(--fe-face-pill-ok-bd);
    color: var(--fe-face-pill-ok-tx);
  }

  .searching-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--fe-face-pill-color);
    animation: pulse 1.5s ease-in-out infinite;
  }

  /* ── Spinner ──────────────────────────────────────────────────────────────── */
  .spinner {
    width: 36px; height: 36px;
    border: 2.5px solid var(--fe-spinner-track);
    border-top-color: var(--fe-spinner-head);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  .spinner.teal { border-top-color: #00c9a7; }

  /* ── Keyframes ────────────────────────────────────────────────────────────── */
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.8); }
  }

  /* ── Responsive ───────────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .modal-backdrop { padding: 0.5rem; }
    .modal { max-width: 100%; border-radius: 1rem; }
    .bottom { padding: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner, .searching-dot, .success-ring, .error-ring,
    .modal, .modal-backdrop, .intro-content, .positioning-panel,
    .hold-fill, .progress-fill, .dot { animation: none; transition: none; }
  }
</style>