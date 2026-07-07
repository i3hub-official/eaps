<script lang="ts">
  // src/routes/(student)/verify/+page.svelte
  // Face verification using @vladmandic/human
  // Replaces gesture-based liveness with human's built-in antispoof + liveness models.
  // No video frames leave the browser — only the similarity score is sent to the server.

  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // ─── Phase ────────────────────────────────────────────────────────────────
  type Phase = 'loading' | 'ready' | 'scanning' | 'matching' | 'success' | 'failed'
  let phase       = $state<Phase>('loading')
  let headline    = $state('Starting camera…')
  let subline     = $state('')
  let matchScore  = $state(0)        // 0–100 display value
  let livenessScore = $state(0)      // 0–1 from human
  let antispoofScore = $state(0)     // 0–1 from human
  let retryCount  = $state(0)
  let scanY       = $state(0)        // animated scan line 0–1

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  let videoEl   = $state<HTMLVideoElement | null>(null)
  let canvasEl  = $state<HTMLCanvasElement | null>(null)

  // ─── Internals ────────────────────────────────────────────────────────────
  let human: any = null
  let stream: MediaStream | null = null
  let detectRaf: number | null = null
  let scanRaf:   number | null = null
  let scanDir    = 1
  let storedDescriptor: number[] | null = null

  // ─── Thresholds ───────────────────────────────────────────────────────────
  // human uses cosine similarity (higher = more similar, 1.0 = identical)
  const SIMILARITY_THRESHOLD = 0.60   // cosine similarity — lower than face-api's distance
  const LIVENESS_THRESHOLD   = 0.50   // human's liveness score
  const ANTISPOOF_THRESHOLD  = 0.50   // human's antispoof score (real person vs photo/screen)
  const MAX_RETRIES          = 3

  // ─── Derived ─────────────────────────────────────────────────────────────
  const securityPass = $derived(
    livenessScore  >= LIVENESS_THRESHOLD &&
    antispoofScore >= ANTISPOOF_THRESHOLD
  )

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  onMount(init)
  onDestroy(stopAll)

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    phase    = 'loading'
    headline = 'Loading face detection…'
    subline  = 'This may take a moment on first load'

    try {
      // Lazy import — ~8 MB, don't block page load
      const { default: Human } = await import('@vladmandic/human')

      human = new Human({
        modelBasePath: '/models/human/',
        // Only load what we need — keeps initial load fast
        face: {
          enabled: true,
          detector:    { rotation: true, maxDetected: 1, minConfidence: 0.5 },
          description: { enabled: true },   // 192-d face descriptor
          antispoof:   { enabled: true },    // reject photos / screens
          liveness:    { enabled: true },    // detect real movement
          emotion:     { enabled: false },
        },
        body:    { enabled: false },
        hand:    { enabled: false },
        gesture: { enabled: false },
        object:  { enabled: false },
        filter:  { enabled: true, flip: true },
      })

      await human.load()
      await human.warmup()   // pre-run inference once so first real frame is fast

      // Load stored descriptor from server (decrypted server-side)
      const res = await fetch('/api/face/descriptor')
      if (!res.ok) {
        phase    = 'failed'
        headline = 'Not enrolled'
        subline  = 'You must enroll your face before taking an exam.'
        return
      }
      const { descriptor } = await res.json()
      storedDescriptor = descriptor as number[]

      // Start camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      if (videoEl) {
        videoEl.srcObject = stream
        await videoEl.play()

        if (canvasEl) {
          canvasEl.width  = videoEl.videoWidth  || 640
          canvasEl.height = videoEl.videoHeight || 480
        }
      }

      phase    = 'ready'
      headline = 'Position your face'
      subline  = 'Look directly at the camera. Keep still.'

      animateScan()
      detectLoop()

    } catch (e: any) {
      phase    = 'failed'
      headline = 'Camera error'
      subline  = e.message?.includes('denied')
        ? 'Allow camera access and retry.'
        : e.message ?? 'Failed to start. Refresh and try again.'
    }
  }

  // ─── Detection loop ────────────────────────────────────────────────────────
  // Runs continuously during 'ready' and 'scanning' phases.
  // As soon as liveness + antispoof pass, moves to face matching.

  async function detectLoop() {
    if (!human || !videoEl) return
    if (phase === 'success' || phase === 'failed' || phase === 'matching') return

    const result = await human.detect(videoEl).catch(() => null)

    // Draw human's own overlay on the canvas
    if (canvasEl && result) {
      await human.draw.canvas(videoEl, canvasEl)
      await human.draw.all(canvasEl, result, {
        face: {
          drawBoxes:       false,
          drawPolygons:    true,
          fillPolygons:    false,
          useDepth:        false,
          drawGaze:        false,
          drawLabels:      false,
          drawPoints:      false,
        },
      })
    }

    const face = result?.face?.[0]

    if (!face) {
      phase    = 'ready'
      headline = 'No face detected'
      subline  = 'Position your face in the oval and look at the camera.'
      detectRaf = requestAnimationFrame(detectLoop)
      return
    }

    // Update live scores for the progress bars
    livenessScore   = face.liveness   ?? 0
    antispoofScore  = face.antispoof  ?? 0

    if (!securityPass) {
      phase    = 'scanning'
      headline = 'Security check'
      subline  = antispoofScore < ANTISPOOF_THRESHOLD
        ? 'Ensure you are a real person in good lighting.'
        : 'Hold still — checking liveness…'
      detectRaf = requestAnimationFrame(detectLoop)
      return
    }

    // Security passed — match face
    if (phase !== 'matching') {
      await matchFace(face)
      return
    }

    detectRaf = requestAnimationFrame(detectLoop)
  }

  // ─── Face match ────────────────────────────────────────────────────────────
  async function matchFace(face: any) {
    if (!storedDescriptor || !face.embedding) return

    phase    = 'matching'
    headline = 'Verifying identity…'
    subline  = 'Please keep still.'

    // human returns embedding as Float32Array — convert to plain array
    const live: number[] = Array.from(face.embedding)

    // Cosine similarity (human uses this natively)
    const similarity = cosineSimilarity(live, storedDescriptor)
    matchScore = Math.round(similarity * 100)

    if (similarity >= SIMILARITY_THRESHOLD) {
      // Record verification on server
      await fetch('/api/face/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified:        true,
          similarityScore: matchScore,
          antispoofScore:  Math.round(antispoofScore * 100),
          livenessScore:   Math.round(livenessScore * 100),
          examId:          data.exam?.id ?? null,
        }),
      }).catch(() => {}) // non-blocking — don't fail verification on network hiccup

      stopAll()
      phase    = 'success'
      headline = 'Identity Verified'
      subline  = `${matchScore}% match — you may proceed.`

      setTimeout(() => {
        if (data.returnTo) {
          goto(data.returnTo)
        } else if (data.exam?.hasExistingSession && data.exam?.sessionId) {
          goto(`/student/exams/${data.exam.sessionId}`)
        } else if (data.exam?.id) {
          goto(`/student/exams/${data.exam.id}`)
        } else {
          goto('/student')
        }
      }, 1600)

    } else {
      retryCount++
      stopAll()
      phase    = 'failed'
      headline = 'Not recognised'
      subline  = `${matchScore}% match — ${SIMILARITY_THRESHOLD * 100}% required. Attempt ${retryCount}/${MAX_RETRIES}.`
    }
  }

  // ─── Retry ────────────────────────────────────────────────────────────────
  async function retry() {
    livenessScore  = 0
    antispoofScore = 0
    matchScore     = 0
    await init()
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  function stopAll() {
    if (detectRaf) { cancelAnimationFrame(detectRaf); detectRaf = null }
    if (scanRaf)   { cancelAnimationFrame(scanRaf);   scanRaf   = null }
    stream?.getTracks().forEach(t => t.stop())
    stream = null
  }

  // ─── Scan line animation ──────────────────────────────────────────────────
  function animateScan() {
    scanY += scanDir * 0.006
    if (scanY >= 1) { scanY = 1; scanDir = -1 }
    if (scanY <= 0) { scanY = 0; scanDir =  1 }
    scanRaf = requestAnimationFrame(animateScan)
  }

  // ─── Cosine similarity ────────────────────────────────────────────────────
  function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < a.length; i++) {
      dot  += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB)
    return denom === 0 ? 0 : dot / denom
  }
</script>

<svelte:head>
  <title>Identity Verification — MOUAU eTest</title>
</svelte:head>

<div class="page">

  <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
  <header class="topbar">
    <a href={data.returnTo || '/student'} class="back-btn" aria-label="Go back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </a>
    <span class="top-label">Face Verification</span>
    <div style="width:36px"></div>
  </header>

  <!-- ── Camera area ──────────────────────────────────────────────────────── -->
  <div class="cam-wrap">
    <video
      bind:this={videoEl}
      class="feed"
      class:hidden={phase === 'loading' || phase === 'success' || phase === 'failed'}
      autoplay muted playsinline
    ></video>

    <canvas
      bind:this={canvasEl}
      class="overlay"
      class:hidden={phase === 'loading' || phase === 'success' || phase === 'failed'}
    ></canvas>

    <!-- Oval guide + scan line (drawn on top of human's canvas) -->
    {#if phase === 'ready' || phase === 'scanning' || phase === 'matching'}
      <svg class="oval-svg" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet">
        <defs>
          <mask id="oval-mask">
            <rect width="640" height="480" fill="white"/>
            <ellipse cx="320" cy="240" rx="210" ry="200" fill="black"/>
          </mask>
          <!-- Scan line gradient -->
          <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color={phase === 'matching' ? '#00c9a7' : '#f59e0b'} stop-opacity="0"/>
            <stop offset="50%"  stop-color={phase === 'matching' ? '#00c9a7' : '#f59e0b'} stop-opacity="0.55"/>
            <stop offset="100%" stop-color={phase === 'matching' ? '#00c9a7' : '#f59e0b'} stop-opacity="0"/>
          </linearGradient>
          <clipPath id="oval-clip">
            <ellipse cx="320" cy="240" rx="208" ry="198"/>
          </clipPath>
        </defs>

        <!-- Dark overlay with oval cutout -->
        <rect width="640" height="480" fill="rgba(10,13,15,0.65)" mask="url(#oval-mask)"/>

        <!-- Oval border -->
        <ellipse cx="320" cy="240" rx="210" ry="200"
          fill="none"
          stroke={phase === 'matching' ? '#00c9a7' : securityPass ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
          stroke-width={securityPass || phase === 'matching' ? '2.5' : '1.5'}
        />

        <!-- Corner brackets -->
        {#each [[-1,-1],[1,-1],[-1,1],[1,1]] as [dx, dy]}
          {@const bx = 320 + dx * 210}
          {@const by = 240 + dy * 200}
          <path
            d="M {bx + dx * -22} {by} L {bx} {by} L {bx} {by + dy * -22}"
            fill="none"
            stroke={phase === 'matching' ? '#00c9a7' : securityPass ? '#f59e0b' : 'rgba(0,201,167,0.5)'}
            stroke-width="2.5" stroke-linecap="round"
          />
        {/each}

        <!-- Animated scan line (clipped to oval) -->
        {@const sy = (240 - 200) + scanY * 400}
        <rect
          x="110" y={sy - 14} width="420" height="28"
          fill="url(#scan-grad)"
          clip-path="url(#oval-clip)"
        />
      </svg>
    {/if}

    <!-- Loading state -->
    {#if phase === 'loading'}
      <div class="center-state">
        <div class="spinner"></div>
        <p class="state-text">Loading face detection…</p>
      </div>
    {/if}

    <!-- Success state -->
    {#if phase === 'success'}
      <div class="center-state success">
        <div class="result-ring teal">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="#00c9a7" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="state-text" style="color:#00c9a7">Identity Verified</p>
        <p class="state-sub">
          {data.exam?.hasExistingSession ? 'Resuming your exam…' : 'Proceeding to exam…'}
        </p>
      </div>
    {/if}

    <!-- Failed state -->
    {#if phase === 'failed' && retryCount < MAX_RETRIES}
      <div class="center-state error">
        <div class="result-ring red">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="#ef4444" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <p class="state-text" style="color:#ef4444">{headline}</p>
        <p class="state-sub">{subline}</p>
      </div>
    {/if}
  </div>

  <!-- ── Bottom panel ──────────────────────────────────────────────────────── -->
  <div class="bottom">

    {#if phase === 'loading'}
      <div class="bottom-text">
        <p class="headline">{headline}</p>
        <p class="subline">{subline}</p>
      </div>

    {:else if phase === 'ready' || phase === 'scanning'}
      <div class="score-bars">
        <div class="score-row">
          <span class="score-lbl">Liveness</span>
          <div class="score-track">
            <div
              class="score-fill"
              class:pass={livenessScore >= LIVENESS_THRESHOLD}
              style="width:{Math.min(livenessScore * 100, 100)}%"
            ></div>
          </div>
          <span class="score-val">{Math.round(livenessScore * 100)}%</span>
        </div>
        <div class="score-row">
          <span class="score-lbl">Antispoof</span>
          <div class="score-track">
            <div
              class="score-fill"
              class:pass={antispoofScore >= ANTISPOOF_THRESHOLD}
              style="width:{Math.min(antispoofScore * 100, 100)}%"
            ></div>
          </div>
          <span class="score-val">{Math.round(antispoofScore * 100)}%</span>
        </div>
      </div>
      <div class="bottom-text">
        <p class="headline">{headline}</p>
        <p class="subline" aria-live="polite">{subline}</p>
      </div>

    {:else if phase === 'matching'}
      <div class="bottom-text">
        <p class="headline">Verifying identity…</p>
        <p class="subline">Please keep still</p>
      </div>

    {:else if phase === 'success'}
      <div class="bottom-text">
        <p class="headline" style="color:#00c9a7">{headline}</p>
        <p class="subline">{subline}</p>
      </div>

    {:else if phase === 'failed'}
      <div class="score-bars">
        <div class="score-row">
          <span class="score-lbl">Match</span>
          <div class="score-track">
            <div
              class="score-fill"
              class:pass={matchScore >= SIMILARITY_THRESHOLD * 100}
              style="width:{matchScore}%"
            ></div>
          </div>
          <span class="score-val">{matchScore}%</span>
        </div>
      </div>
      <div class="bottom-text">
        <p class="headline err">{headline}</p>
        <p class="subline">{subline}</p>
      </div>

      {#if retryCount < MAX_RETRIES}
        <button class="cta" onclick={retry}>
          Try again ({MAX_RETRIES - retryCount} left)
        </button>
      {:else}
        <p class="subline" style="color:#ef4444;text-align:center">
          Too many failed attempts. Please contact your invigilator.
        </p>
      {/if}

      <a href="/student" class="skip">Cancel</a>
    {/if}

  </div>
</div>

<style>
  :global(html), :global(body) { margin: 0; background: #0a0d0f; }

  .page {
    position: fixed; inset: 0;
    background: #0a0d0f;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #fff;
    overflow: hidden;
  }

  /* ── Top bar ─────────────────────────────────────────────────────────── */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
    z-index: 20;
    background: linear-gradient(to bottom, #0a0d0f 60%, transparent);
    flex-shrink: 0;
  }

  .back-btn {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    color: #fff; text-decoration: none;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .back-btn:hover { background: rgba(255,255,255,0.14); }

  .top-label {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: rgba(255,255,255,0.55);
    text-transform: uppercase;
  }

  /* ── Camera area ─────────────────────────────────────────────────────── */
  .cam-wrap {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .feed {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* mirror */
  }

  .overlay {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    transform: scaleX(-1);
  }

  .hidden { display: none; }

  /* SVG overlay for oval + scan line */
  .oval-svg {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
  }

  /* Centre states (loading, success, failed) */
  .center-state {
    position: absolute; inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    background: rgba(10,13,15,0.85);
    z-index: 10;
  }

  .center-state.success { background: rgba(0,30,20,0.9); }
  .center-state.error   { background: rgba(30,0,0,0.9); }

  .result-ring {
    width: 68px; height: 68px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    animation: pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .result-ring.teal { background: rgba(0,201,167,0.12); border: 2px solid rgba(0,201,167,0.35); }
  .result-ring.red  { background: rgba(239,68,68,0.12); border: 2px solid rgba(239,68,68,0.35); }

  .state-text { font-size: 1rem; font-weight: 600; margin: 0; }
  .state-sub  { font-size: 0.8rem; color: rgba(255,255,255,0.45); margin: 0; text-align: center; }

  /* ── Bottom panel ────────────────────────────────────────────────────── */
  .bottom {
    position: relative;
    z-index: 20;
    padding: 1.25rem 1.75rem 2.5rem;
    background: linear-gradient(to top, #0a0d0f 80%, transparent);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    min-height: 190px;
    flex-shrink: 0;
  }

  /* Score bars */
  .score-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 340px;
  }

  .score-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.75rem;
  }

  .score-lbl {
    width: 62px;
    color: rgba(255,255,255,0.45);
    font-weight: 500;
    flex-shrink: 0;
  }

  .score-track {
    flex: 1;
    height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    background: #ef4444;
    border-radius: 999px;
    transition: width 0.4s ease, background 0.4s ease;
  }

  .score-fill.pass { background: #00c9a7; }

  .score-val {
    width: 36px;
    text-align: right;
    color: rgba(255,255,255,0.45);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  /* Text */
  .bottom-text { text-align: center; }
  .headline {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.3rem;
    letter-spacing: -0.01em;
  }
  .headline.err { color: #ef4444; }
  .subline {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.4);
    margin: 0;
    min-height: 1.3em;
    line-height: 1.5;
  }

  /* CTA */
  .cta {
    width: 100%; max-width: 320px;
    padding: 0.875rem;
    background: #00c9a7;
    color: #0a0d0f;
    border: none;
    border-radius: 100px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0.02em;
    transition: opacity 0.15s, transform 0.1s;
  }
  .cta:hover  { opacity: 0.88; }
  .cta:active { transform: scale(0.98); }

  .skip {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.25);
    text-decoration: none;
  }
  .skip:hover { color: rgba(255,255,255,0.5); }

  /* Spinner */
  .spinner {
    width: 40px; height: 40px;
    border: 2.5px solid rgba(255,255,255,0.08);
    border-top-color: rgba(255,255,255,0.4);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pop-in  {
    from { opacity: 0; transform: scale(0.6); }
    to   { opacity: 1; transform: scale(1); }
  }
</style>