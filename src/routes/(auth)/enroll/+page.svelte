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

  type Status = 'intro' | 'loading' | 'gesture' | 'processing' | 'done' | 'error';
let status = $state<Status>('intro');
  let headline = $state('Enrolling your face');
  let subline  = $state('Starting camera…');
  let gestureIndex  = $state(0);
  let gesturesDone  = $state(0);
  let captureCount  = 0;
  let descriptors: number[][] = [];
  let gestureDetected = false;
  let lastNodY: number | null = null;
  let scanY = $state(0); // animated scan line position 0–1
  let scanDir = 1;
  let scanRaf: number | null = null;

  let faceapi: typeof import('@vladmandic/face-api') | null = null;

  const GESTURES = [
  { id: 'open_mouth',  label: 'Open your mouth' },
  { id: 'turn_left',   label: 'Turn head left'  },
  { id: 'turn_right',  label: 'Turn head right'  },
  { id: 'raise_brows', label: 'Raise your eyebrows' },
  { id: 'nod',         label: 'Nod your head'   },
];
const CAPTURES_PER = 3;
const TOTAL        = 3;

  let selected: typeof GESTURES = [];

  // ── landmark helpers ────────────────────────────────────────────────────────
  function ear(lm: any, idx: number[]): number {
    const p = idx.map(i => lm.positions[i]);
    const v1 = Math.abs(p[1].y - p[5].y), v2 = Math.abs(p[2].y - p[4].y);
    const h  = Math.abs(p[0].x - p[3].x);
    return h > 0 ? (v1 + v2) / (2 * h) : 1;
  }

  function checkGesture(id: string, lm: any): boolean {
    const p = lm.positions;
    switch (id) {
      case 'smile': {
        const h = Math.abs(p[62].y - p[66].y), w = Math.abs(p[48].x - p[54].x);
        return w > 0 && h / w > 0.28;
      }
      case 'open_mouth': {
        const h = Math.abs(p[62].y - p[66].y), fh = Math.abs(p[27].y - p[8].y);
        return fh > 0 && h / fh > 0.08;
      }
      case 'blink':
        return (ear(lm,[36,37,38,39,40,41]) + ear(lm,[42,43,44,45,46,47])) / 2 < 0.22;
      case 'turn_left': {
        const n=p[30],l=p[36],r=p[45],w=Math.abs(l.x-r.x);
        return w > 0 && (n.x - l.x) / w < 0.32;
      }
      case 'turn_right': {
        const n=p[30],l=p[36],r=p[45],w=Math.abs(l.x-r.x);
        return w > 0 && (n.x - l.x) / w > 0.68;
      }
      case 'raise_brows': {
        const brow = (p[19].y + p[24].y) / 2, eye = (p[37].y + p[44].y) / 2;
        const fh = Math.abs(p[27].y - p[8].y);
        return fh > 0 && Math.abs(brow - eye) / fh > 0.16;
      }
      case 'nod': {
        const ny = p[30].y;
        if (!lastNodY) { lastNodY = ny; return false; }
        const d = Math.abs(ny - lastNodY); lastNodY = ny;
        return d > 8;
      }
      default: return false;
    }
  }

  // ── scan line animation ─────────────────────────────────────────────────────
  function animateScan() {
    scanY += scanDir * 0.008;
    if (scanY >= 1) { scanY = 1; scanDir = -1; }
    if (scanY <= 0) { scanY = 0; scanDir =  1; }
    scanRaf = requestAnimationFrame(animateScan);
  }

  // ── canvas overlay ──────────────────────────────────────────────────────────
  function drawOverlay(hit: boolean) {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const rx = w * 0.34, ry = h * 0.42;

    ctx.clearRect(0, 0, w, h);

    // darken outside
    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // oval stroke
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = hit ? '#00c9a7' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = hit ? 2.5 : 1.5;
    ctx.stroke();

    // corner brackets
    const bLen = 22, bW = 2.5;
    const positions = [
      { x: cx - rx, y: cy - ry, d: [1, 1]  },
      { x: cx + rx, y: cy - ry, d: [-1, 1]  },
      { x: cx - rx, y: cy + ry, d: [1, -1]  },
      { x: cx + rx, y: cy + ry, d: [-1, -1] },
    ];
    ctx.strokeStyle = hit ? '#00c9a7' : 'rgba(0,201,167,0.6)';
    ctx.lineWidth = bW;
    ctx.lineCap = 'round';
    for (const { x, y, d } of positions) {
      ctx.beginPath(); ctx.moveTo(x + d[0] * bLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y + d[1] * bLen); ctx.stroke();
    }

    // scan line (clipped to oval)
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, Math.PI * 2); ctx.clip();
    const sy = cy - ry + scanY * ry * 2;
    const grad = ctx.createLinearGradient(0, sy - 12, 0, sy + 12);
    grad.addColorStop(0,   'rgba(0,201,167,0)');
    grad.addColorStop(0.5, 'rgba(0,201,167,0.55)');
    grad.addColorStop(1,   'rgba(0,201,167,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - rx, sy - 12, rx * 2, 24);
    ctx.restore();
  }

  // ── detection loop ──────────────────────────────────────────────────────────
  function loop() {
    if (status !== 'gesture' || !faceapi) return;

    faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor()
      .then(det => {
        if (!det) {
          drawOverlay(false);
          subline = 'Position your face in the oval';
          gestureDetected = false;
          raf = requestAnimationFrame(loop);
          return;
        }

        const g   = selected[gestureIndex];
        const hit = checkGesture(g.id, det.landmarks);
        drawOverlay(hit);

        if (hit && !gestureDetected) {
          gestureDetected = true;
          descriptors.push(Array.from(det.descriptor));
          captureCount++;

          if (captureCount >= CAPTURES_PER) {
            gesturesDone = gestureIndex + 1;
            if (gesturesDone >= selected.length) {
              submit(); return;
            }
            gestureIndex++;
            captureCount = 0;
            gestureDetected = false;
            lastNodY = null;
            subline = selected[gestureIndex].label;
          } else {
            subline = `Hold… (${captureCount}/${CAPTURES_PER})`;
          }
        } else if (!hit) {
          gestureDetected = false;
        }

        raf = requestAnimationFrame(loop);
      })
      .catch(() => { raf = requestAnimationFrame(loop); });
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function submit() {
    status = 'processing';
    headline = 'Processing…';
    subline  = '';
    stopCamera();

    const avg = descriptors[0].map((_, i) =>
      descriptors.reduce((s, d) => s + d[i], 0) / descriptors.length
    );

    try {
      const res = await fetch('/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: avg }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? `${res.status}`);
      status = 'done';
      headline = 'Enrolled!';
      subline  = 'Redirecting to dashboard…';
      setTimeout(() => goto('/student'), 1600);
    } catch (e: any) {
      status = 'error';
      headline = 'Enrollment failed';
      subline  = e.message ?? 'Please try again';
    }
  }

  function stopCamera() {
    if (raf) cancelAnimationFrame(raf);
    if (scanRaf) cancelAnimationFrame(scanRaf);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function startEnrollment() {
  status = 'loading';
  init();
}

  function retry() {
    descriptors = []; captureCount = 0; gesturesDone = 0;
    gestureDetected = false; lastNodY = null;
    status = 'loading'; init();
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

      selected = [...GESTURES].sort(() => 0.5 - Math.random()).slice(0, TOTAL);
      gestureIndex = 0; gesturesDone = 0; captureCount = 0;

      status   = 'gesture';
      headline = 'Face enrollment';
      subline  = selected[0].label;

      animateScan();
      raf = requestAnimationFrame(loop);
    } catch (e: any) {
      status   = 'error';
      headline = 'Camera error';
      subline  = e.message?.includes('denied') ? 'Allow camera access and retry' : 'Failed to load — refresh and try again';
    }
  }

  onMount(() => {});
  onDestroy(stopCamera);

  let currentGestureLabel = $derived(
    status === 'gesture' && selected[gestureIndex] ? selected[gestureIndex].label : ''
  );
</script>

<svelte:head><title>Face Enrollment — MOUAU eTest</title></svelte:head>

<div class="page">

  <!-- top bar -->
  <header class="topbar">
    <a href="/student" class="back-btn" aria-label="Go back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </a>
    <span class="top-label">Face Enrollment</span>
    <div style="width:36px"></div>
  </header>

  <!-- camera -->
  <div class="cam-wrap">
    <video bind:this={video} class="feed" autoplay muted playsinline></video>
    <canvas bind:this={canvas} class="overlay"></canvas>

    <!-- loading spinner overlay -->
    {#if status === 'loading'}
      <div class="center-state">
        <div class="spinner"></div>
        <p class="state-text">Starting camera…</p>
      </div>
    {/if}

    <!-- processing overlay -->
    {#if status === 'processing'}
      <div class="center-state">
        <div class="spinner teal"></div>
        <p class="state-text">Processing face data…</p>
      </div>
    {/if}
  </div>

 <!-- bottom panel -->
<div class="bottom">

  {#if status === 'intro'}
    <div class="intro-card">
      <div class="intro-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
          <path d="M3 20a9 9 0 0 1 18 0"/>
        </svg>
      </div>
      <h2 class="intro-title">Face Enrollment</h2>
      <p class="intro-desc">
        We'll verify you're a real person by asking you to perform
        <strong>3 simple gestures</strong> in front of your camera.
      </p>
      <ul class="intro-steps">
        <li><span class="step-dot">1</span> Allow camera access when prompted</li>
        <li><span class="step-dot">2</span> Follow each gesture shown on screen</li>
        <li><span class="step-dot">3</span> Hold each gesture briefly until captured</li>
      </ul>
      <div class="intro-note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Your face data is stored securely and only used for exam verification.
      </div>
      <button class="cta" onclick={startEnrollment}>Start Enrollment</button>
      <a href="/student" class="skip">Do this later</a>
    </div>

  {:else if status === 'done'}
    <div class="result-card">
      <div class="avatar-ring">
        <div class="avatar-check">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
      <h2 class="result-title">Face Enrolled</h2>
      <p class="result-sub">Your identity has been saved.<br>You can now sit exams.</p>
    </div>

  {:else if status === 'error'}
    <div class="bottom-text">
      <p class="headline err">Something went wrong</p>
      <p class="subline">{subline}</p>
    </div>
    <button class="cta" onclick={retry}>Try Again</button>
    <a href="/student" class="skip">Skip for now</a>

  {:else if status === 'gesture'}
    <div class="dots" role="progressbar" aria-valuenow={gesturesDone} aria-valuemax={selected.length}>
      {#each selected as _, i}
        <div class="dot" class:done={i < gesturesDone} class:active={i === gesturesDone}></div>
      {/each}
    </div>
    <div class="bottom-text">
      <p class="headline">Step {gesturesDone + 1} of {selected.length}</p>
      <p class="subline" aria-live="polite">{currentGestureLabel}</p>
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
    position: fixed; inset: 0;
    background: #0a0d0f;
    display: flex; flex-direction: column;
    font-family: 'DM Sans', 'Outfit', system-ui, sans-serif;
    color: #fff;
    overflow: hidden;
  }

  /* ── top bar ── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
    position: relative; z-index: 20;
    background: linear-gradient(to bottom, #0a0d0f 60%, transparent);
  }
  .back-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    color: #fff; text-decoration: none;
    transition: background 0.15s;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .back-btn:hover { background: rgba(255,255,255,0.14); }
  .top-label { font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; color: rgba(255,255,255,0.6); text-transform: uppercase; }

  /* ── camera ── */
  .cam-wrap { flex: 1; position: relative; overflow: hidden; }
  .feed {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; transform: scaleX(-1);
  }
  .overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none;
  }
  .center-state {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1rem; background: rgba(10,13,15,0.7); z-index: 10;
  }
  .state-text { font-size: 0.875rem; color: rgba(255,255,255,0.5); margin: 0; }

  /* ── bottom panel ── */
  .bottom {
    position: relative; z-index: 20;
    padding: 1.5rem 1.75rem 2.5rem;
    background: linear-gradient(to top, #0a0d0f 75%, transparent);
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    min-height: 160px;
  }

  .dots {
    display: flex; gap: 7px; align-items: center; margin-bottom: 0.25rem;
  }
  .dot {
    width: 6px; height: 6px; border-radius: 3px;
    background: rgba(255,255,255,0.15);
    transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .dot.active { width: 24px; background: #00c9a7; }
  .dot.done   { background: rgba(0,201,167,0.4); }

  .bottom-text { text-align: center; }
  .headline {
    font-size: 1.1rem; font-weight: 700; margin: 0 0 0.3rem;
    color: #fff; letter-spacing: -0.01em;
  }
  .headline.err { color: #ff6b6b; }
  .subline {
    font-size: 0.875rem; color: rgba(255,255,255,0.45);
    margin: 0; min-height: 1.3em;
    transition: opacity 0.2s;
  }

  .cta {
  width: 100%; max-width: 320px;
  padding: 0.9rem; background: #15803d; color: #fff;
  border: none; border-radius: 100px;
  font-weight: 700; font-size: 0.95rem;
  cursor: pointer; font-family: inherit;
  letter-spacing: 0.02em;
  transition: opacity 0.15s, transform 0.1s;
}
.cta:hover  { background: #166534; opacity: 1; }
.cta:active { transform: scale(0.98); }

  .skip {
    font-size: 0.8rem; color: rgba(255,255,255,0.28);
    text-decoration: none;
  }
  .skip:hover { color: rgba(255,255,255,0.5); }

  /* ── success card ── */
  .result-card {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(0,201,167,0.2);
    border-radius: 1.25rem; padding: 1.75rem 2rem;
    width: 100%; max-width: 320px;
    animation: slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .avatar-ring {
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid rgba(0,201,167,0.4);
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,201,167,0.08);
  }
  .avatar-check {
    width: 52px; height: 52px; border-radius: 50%;
    background: rgba(0,201,167,0.15);
    display: flex; align-items: center; justify-content: center;
  }
  .result-title {
    font-size: 1.15rem; font-weight: 700; margin: 0; color: #fff;
  }
  .result-sub {
    font-size: 0.8rem; color: rgba(255,255,255,0.4);
    margin: 0; text-align: center; line-height: 1.6;
  }

  /* ── spinner ── */
  .spinner {
    width: 40px; height: 40px;
    border: 2.5px solid rgba(255,255,255,0.08);
    border-top-color: rgba(255,255,255,0.4);
    border-radius: 50%; animation: spin 0.75s linear infinite;
  }
  .spinner.teal { border-top-color: #00c9a7; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .intro-card {
  display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
  width: 100%; max-width: 340px; text-align: center;
  animation: slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.intro-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(0,201,167,0.08); border: 1px solid rgba(0,201,167,0.25);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.25rem;
}
.intro-title {
  font-size: 1.2rem; font-weight: 800; margin: 0; color: #fff; letter-spacing: -0.02em;
}
.intro-desc {
  font-size: 0.825rem; color: rgba(255,255,255,0.45);
  margin: 0; line-height: 1.65;
}
.intro-desc strong { color: rgba(255,255,255,0.75); font-weight: 700; }

.intro-steps {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 0.6rem;
  width: 100%; text-align: left;
}
.intro-steps li {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 0.8rem; color: rgba(255,255,255,0.5);
}
.step-dot {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: rgba(0,201,167,0.15); border: 1px solid rgba(0,201,167,0.3);
  color: #00c9a7; font-size: 0.65rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.intro-note {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.72rem; color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 0.6rem; padding: 0.6rem 0.875rem;
  width: 100%; text-align: left; box-sizing: border-box;
}
.intro-note svg { flex-shrink: 0; color: rgba(255,255,255,0.25); }
</style>