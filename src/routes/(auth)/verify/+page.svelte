<!-- src/routes/(student)/verify/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;
  let scanRaf: number | null = null;

  type Status = 'loading' | 'liveness' | 'matching' | 'success' | 'error';
  let status     = $state<Status>('loading');
  let headline   = $state('Identity check');
  let subline    = $state('Starting camera…');
  let livenessDone  = $state(0);
  let livenessTotal = $state(2);
  let retryCount    = $state(0);
  let matchScore    = $state(0);

  let gestureDetected = false;
  let livenessIndex = 0;
  let lastNodY: number | null = null;
  let scanY = $state(0);
  let scanDir = 1;

  let faceapi: typeof import('@vladmandic/face-api') | null = null;

  const GESTURES = [
    { id: 'open_mouth',  label: 'Open your mouth' },
    { id: 'turn_left',   label: 'Turn head left'  },
    { id: 'turn_right',  label: 'Turn head right' },
    { id: 'nod',         label: 'Nod your head'   },
  ];
  let selected: typeof GESTURES = [];

  const MATCH_THRESHOLD = 0.50;

  // ── landmark helpers ────────────────────────────────────────────────────────
  function ear(lm: any, idx: number[]): number {
    const p = idx.map(i => lm.positions[i]);
    const v1 = Math.abs(p[1].y - p[5].y), v2 = Math.abs(p[2].y - p[4].y);
    const h = Math.abs(p[0].x - p[3].x);
    return h > 0 ? (v1 + v2) / (2 * h) : 1;
  }

  // Calculate mouth aspect ratio (open/closed)
  function mouthAspectRatio(lm: any): number {
    const p = lm.positions;
    // Outer mouth points: 61 (left), 67 (right), 62 (top), 66 (bottom)
    const mouthWidth = Math.abs(p[61].x - p[67].x);
    const mouthHeight = Math.abs(p[62].y - p[66].y);
    return mouthWidth > 0 ? mouthHeight / mouthWidth : 0;
  }

  // Calculate eyebrow height (raised/lowered)
  function eyebrowHeight(lm: any): number {
    const p = lm.positions;
    // Left eyebrow: 21 (inner), 22 (middle), 23 (outer)
    const leftBrowY = (p[21].y + p[22].y + p[23].y) / 3;
    // Left eye center: 37 (left), 38 (center), 39 (right)
    const leftEyeY = (p[37].y + p[38].y + p[39].y) / 3;
    return leftBrowY - leftEyeY;
  }

  function checkGesture(id: string, lm: any): boolean {
    const p = lm.positions;
    switch (id) {
      case 'blink':
        return (ear(lm, [36,37,38,39,40,41]) + ear(lm, [42,43,44,45,46,47])) / 2 < 0.22;
        
      case 'smile': {
        const h = Math.abs(p[62].y - p[66].y);
        const w = Math.abs(p[48].x - p[54].x);
        return w > 0 && h/w > 0.28;
      }
      
      case 'open_mouth': {
        const ratio = mouthAspectRatio(lm);
        const isOpen = ratio > 0.35; // Threshold for open mouth
        if (isOpen && !gestureDetected) {
          return true;
        }
        return false;
      }
      
      case 'raise_brows': {
        const height = eyebrowHeight(lm);
        const isRaised = height > 12; // Threshold for raised eyebrows
        if (isRaised && !gestureDetected) {
          return true;
        }
        return false;
      }
      
      case 'nod': {
        const ny = p[30].y;
        if (!lastNodY) { lastNodY = ny; return false; }
        const d = Math.abs(ny - lastNodY);
        lastNodY = ny;
        return d > 8;
      }
      
      case 'turn_left': {
        const n = p[30], l = p[36], r = p[45];
        const w = Math.abs(l.x - r.x);
        return w > 0 && (n.x - l.x) / w < 0.32;
      }
      
      case 'turn_right': {
        const n = p[30], l = p[36], r = p[45];
        const w = Math.abs(l.x - r.x);
        return w > 0 && (n.x - l.x) / w > 0.68;
      }
      
      default:
        return false;
    }
  }

  // ── scan line ───────────────────────────────────────────────────────────────
  function animateScan() {
    scanY += scanDir * 0.007;
    if (scanY >= 1) { scanY = 1; scanDir = -1; }
    if (scanY <= 0) { scanY = 0; scanDir =  1; }
    scanRaf = requestAnimationFrame(animateScan);
  }

  // ── canvas overlay ──────────────────────────────────────────────────────────
  function drawOverlay(hit: boolean, phase: 'liveness' | 'matching') {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2, rx = w*0.34, ry = h*0.42;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // oval
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
    const accentColor = phase === 'matching' ? '#00c9a7'
                      : hit                  ? '#f59e0b'
                      :                        'rgba(255,255,255,0.15)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = hit || phase === 'matching' ? 2.5 : 1.5;
    ctx.stroke();

    // corner brackets
    const bLen = 22;
    const corners = [
      { x: cx-rx, y: cy-ry, d: [1,1]  },
      { x: cx+rx, y: cy-ry, d: [-1,1]  },
      { x: cx-rx, y: cy+ry, d: [1,-1]  },
      { x: cx+rx, y: cy+ry, d: [-1,-1] },
    ];
    ctx.strokeStyle = phase === 'matching' ? '#00c9a7' : hit ? '#f59e0b' : 'rgba(0,201,167,0.55)';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const { x, y, d } of corners) {
      ctx.beginPath(); ctx.moveTo(x+d[0]*bLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y+d[1]*bLen); ctx.stroke();
    }

    // scan line
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx-1, ry-1, 0, 0, Math.PI*2); ctx.clip();
    const sy = cy - ry + scanY * ry * 2;
    const scanColor = phase === 'matching' ? 'rgba(0,201,167,' : 'rgba(245,158,11,';
    const grad = ctx.createLinearGradient(0, sy-12, 0, sy+12);
    grad.addColorStop(0,   `${scanColor}0)`);
    grad.addColorStop(0.5, `${scanColor}0.5)`);
    grad.addColorStop(1,   `${scanColor}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx-rx, sy-12, rx*2, 24);
    ctx.restore();
  }

  // ── liveness loop ───────────────────────────────────────────────────────────
  function livenessLoop() {
    if (status !== 'liveness' || !faceapi) return;

    faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
      .withFaceLandmarks(true)
      .then(det => {
        if (!det) {
          drawOverlay(false, 'liveness');
          subline = 'Position your face in the oval';
          gestureDetected = false;
          raf = requestAnimationFrame(livenessLoop);
          return;
        }

        const g   = selected[livenessIndex];
        const hit = checkGesture(g.id, det.landmarks);
        drawOverlay(hit, 'liveness');

        if (hit && !gestureDetected) {
          gestureDetected = true;
          livenessDone = livenessIndex + 1;

          if (livenessIndex + 1 >= selected.length) {
            matchFace(); 
            return;
          }
          livenessIndex++;
          gestureDetected = false;
          lastNodY = null;
          subline = selected[livenessIndex].label;
        } else if (!hit) {
          gestureDetected = false;
        }

        raf = requestAnimationFrame(livenessLoop);
      })
      .catch(() => { raf = requestAnimationFrame(livenessLoop); });
  }

  // ── face match ──────────────────────────────────────────────────────────────
  async function matchFace() {
    status   = 'matching';
    headline = 'Verifying identity';
    subline  = 'Comparing with enrolled face…';

    try {
      const det = await faceapi!
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!det) throw new Error('No face detected — hold still');

      drawOverlay(true, 'matching');

      const res = await fetch('/api/face/descriptor');
      if (!res.ok) throw new Error('No enrolled face found — please enroll first');
      const { descriptor: stored } = await res.json();

      const live = Array.from(det.descriptor);
      const dist = Math.sqrt(live.reduce((s, v, i) => s + (v - stored[i]) ** 2, 0));
      const isMatch = dist < MATCH_THRESHOLD;

      matchScore = Math.max(0, Math.round((1 - dist / MATCH_THRESHOLD) * 100));

      if (isMatch) {
        await fetch('/api/face/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            verified: true, 
            similarityScore: matchScore,
            examId: data.exam?.id 
          }),
        });
        status   = 'success';
        headline = 'Identity Verified';
        subline  = `${matchScore}% match — you're good to go`;
        stopCamera();
        setTimeout(() => {
          const examId  = data.exam?.id;
          const returnTo = data.returnTo;
          
          // Use returnTo if provided, otherwise fallback to exam or dashboard
          if (returnTo) {
            goto(returnTo);
          } else if (data.exam?.hasExistingSession && data.exam?.sessionId) {
            goto(`/student/exam/${data.exam.sessionId}`);
          } else if (examId) {
            goto(`/student/exam/${examId}`);
          } else {
            goto('/student');
          }
        }, 1800);
      } else {
        retryCount++;
        status   = 'error';
        headline = 'Not recognised';
        subline  = `${matchScore}% match — need more than ${MATCH_THRESHOLD * 100}% (distance ${dist.toFixed(2)})`;
        stopCamera();
      }
    } catch (e: any) {
      retryCount++;
      status   = 'error';
      headline = 'Verification failed';
      subline  = e.message ?? 'Please try again';
      stopCamera();
    }
  }

  // ── lifecycle ───────────────────────────────────────────────────────────────
  function stopCamera() {
    if (raf) cancelAnimationFrame(raf);
    if (scanRaf) cancelAnimationFrame(scanRaf);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function retry() {
    livenessDone = 0; 
    livenessIndex = 0;
    gestureDetected = false; 
    lastNodY = null;
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
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      ctx = canvas.getContext('2d');

      // Pick 2 random gestures for liveness check
      selected = [...GESTURES].sort(() => 0.5 - Math.random()).slice(0, 2);
      livenessTotal = selected.length;
      livenessIndex = 0; 
      livenessDone = 0;
      gestureDetected = false; 
      lastNodY = null;

      status   = 'liveness';
      headline = 'Liveness check';
      subline  = selected[0].label;

      animateScan();
      raf = requestAnimationFrame(livenessLoop);
    } catch (e: any) {
      status   = 'error';
      headline = 'Camera error';
      subline  = e.message?.includes('denied') ? 'Allow camera access and retry' : 'Failed to start — refresh and try again';
    }
  }

  onMount(init);
  onDestroy(stopCamera);

  let currentLabel = $derived(
    status === 'liveness' && selected[livenessIndex] ? selected[livenessIndex].label : ''
  );
</script>

<svelte:head><title>Identity Verification — MOUAU eTest</title></svelte:head>

<div class="page">

  <header class="topbar">
    <a href={data.returnTo || '/student'} class="back-btn" aria-label="Go back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </a>
    <span class="top-label">Face Verification</span>
    <div style="width:36px"></div>
  </header>

  <div class="cam-wrap">
    <video bind:this={video} class="feed" autoplay muted playsinline></video>
    <canvas bind:this={canvas} class="overlay"></canvas>

    {#if status === 'loading'}
      <div class="center-state">
        <div class="spinner"></div>
        <p class="state-text">Starting camera…</p>
      </div>
    {/if}

    {#if status === 'matching'}
      <div class="center-state semi">
        <div class="spinner teal"></div>
        <p class="state-text">Scanning your face…</p>
      </div>
    {/if}
  </div>

  <div class="bottom">

    {#if status === 'success'}
      <div class="result-card">
        <div class="avatar-ring">
          <div class="avatar-check">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
        <h2 class="result-title">Identity Verified</h2>
        <p class="result-sub">
          {#if data.exam?.hasExistingSession}
            Resuming your exam...
          {:else}
            Your identity has been verified.<br>You may now proceed to your exam.
          {/if}
        </p>
      </div>

    {:else if status === 'error'}
      <div class="bottom-text">
        <p class="headline err">{headline}</p>
        <p class="subline">{subline}</p>
      </div>
      {#if retryCount < 3}
        <button class="cta" onclick={retry}>Try Again ({3 - retryCount} left)</button>
      {:else}
        <p class="subline" style="color:#ff6b6b">Too many attempts — contact an invigilator</p>
      {/if}
      <a href="/student" class="skip">Cancel</a>

    {:else if status === 'liveness'}
      <div class="dots">
        {#each selected as _, i}
          <div class="dot amber" class:done={i < livenessDone} class:active={i === livenessDone}></div>
        {/each}
        <div class="dot" class:done={status === 'success'}></div>
      </div>
      <div class="bottom-text">
        <p class="headline">Step {livenessDone + 1} of {livenessTotal + 1}</p>
        <p class="subline" aria-live="polite">{currentLabel}</p>
      </div>

    {:else if status === 'matching'}
      <div class="bottom-text">
        <p class="headline">Comparing faces…</p>
        <p class="subline">Please keep still</p>
      </div>

    {:else}
      <div class="bottom-text">
        <p class="headline">{headline}</p>
        <p class="subline">{subline}</p>
      </div>
    {/if}

  </div>
</div>

<style>
  :global(html), :global(body) { margin: 0; background: #0a0d0f; }

  .page {
    position: fixed; inset: 0; background: #0a0d0f;
    display: flex; flex-direction: column;
    font-family: 'DM Sans', 'Outfit', system-ui, sans-serif;
    color: #fff; overflow: hidden;
  }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem; position: relative; z-index: 20;
    background: linear-gradient(to bottom, #0a0d0f 60%, transparent);
  }
  .back-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    color: #fff; text-decoration: none; transition: background 0.15s;
  }
  .back-btn:hover { background: rgba(255,255,255,0.14); }
  .top-label { font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; color: rgba(255,255,255,0.6); text-transform: uppercase; }

  .cam-wrap { flex: 1; position: relative; overflow: hidden; }
  .feed { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
  .overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

  .center-state {
    position: absolute; inset: 0; z-index: 10;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1rem; background: rgba(10,13,15,0.7);
  }
  .center-state.semi { background: rgba(10,13,15,0.5); }
  .state-text { font-size: 0.875rem; color: rgba(255,255,255,0.5); margin: 0; }

  .bottom {
    position: relative; z-index: 20;
    padding: 1.5rem 1.75rem 2.5rem;
    background: linear-gradient(to top, #0a0d0f 75%, transparent);
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    min-height: 170px;
  }

  .dots { display: flex; gap: 7px; align-items: center; margin-bottom: 0.25rem; }
  .dot {
    width: 6px; height: 6px; border-radius: 3px;
    background: rgba(255,255,255,0.15);
    transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .dot.active  { width: 24px; background: #f59e0b; }
  .dot.done    { background: rgba(245,158,11,0.4); }
  .dot.amber.done ~ .dot { background: #00c9a7; }

  .bottom-text { text-align: center; }
  .headline { font-size: 1.1rem; font-weight: 700; margin: 0 0 0.3rem; color: #fff; letter-spacing: -0.01em; }
  .headline.err { color: #ff6b6b; }
  .subline { font-size: 0.875rem; color: rgba(255,255,255,0.45); margin: 0; min-height: 1.3em; }

  .cta {
    width: 100%; max-width: 320px; padding: 0.9rem;
    background: #00c9a7; color: #0a0d0f;
    border: none; border-radius: 100px;
    font-weight: 700; font-size: 0.95rem; cursor: pointer;
    font-family: inherit; letter-spacing: 0.02em;
    transition: opacity 0.15s, transform 0.1s;
  }
  .cta:hover  { opacity: 0.88; }
  .cta:active { transform: scale(0.98); }

  .skip { font-size: 0.8rem; color: rgba(255,255,255,0.28); text-decoration: none; }
  .skip:hover { color: rgba(255,255,255,0.5); }

  .result-card {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(0,201,167,0.2);
    border-radius: 1.25rem; padding: 1.75rem 2rem;
    width: 100%; max-width: 320px;
    animation: slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .avatar-ring {
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid rgba(0,201,167,0.4);
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,201,167,0.06);
  }
  .avatar-check {
    width: 52px; height: 52px; border-radius: 50%;
    background: rgba(0,201,167,0.12);
    display: flex; align-items: center; justify-content: center;
  }
  .result-title { font-size: 1.2rem; font-weight: 700; margin: 0; color: #fff; }
  .result-sub { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; text-align: center; line-height: 1.6; }

  .spinner {
    width: 40px; height: 40px;
    border: 2.5px solid rgba(255,255,255,0.08);
    border-top-color: rgba(255,255,255,0.35);
    border-radius: 50%; animation: spin 0.75s linear infinite;
  }
  .spinner.teal { border-top-color: #00c9a7; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>