<script lang="ts">
  // src/lib/components/exam/FaceVerify.svelte
  // Verifies student's face against stored embedding before exam start.
  // Runs entirely client-side — no video frames sent to server.
  // Only the cosine similarity score and pass/fail result are sent.

  import { onMount, onDestroy } from 'svelte'

  let {
    studentId,
    requireLiveness = false,
    onVerified,
    onFailed,
  }: {
    studentId: string
    requireLiveness?: boolean
    onVerified: (score: number) => void
    onFailed: (reason: string) => void
  } = $props()

  type VerifyPhase = 'loading' | 'ready' | 'detecting' | 'verified' | 'failed'

  let phase = $state<VerifyPhase>('loading')
  let message = $state('Initialising face detection...')
  let score = $state(0)
  let livenessScore = $state(0)
  let attempts = $state(0)
  let videoEl = $state<HTMLVideoElement | null>(null)
  let canvasEl = $state<HTMLCanvasElement | null>(null)
  let stream = $state<MediaStream | null>(null)
  let human: any = null
  let animFrame: number | null = null
  let storedDescriptor: number[] | null = null

  const MAX_ATTEMPTS = 3
  const SIMILARITY_THRESHOLD = 0.72
  const LIVENESS_THRESHOLD = 0.6

  onMount(async () => {
    await initHuman()
    await loadStoredDescriptor()
    await startCamera()
  })

  onDestroy(() => {
    stopCamera()
    if (animFrame) cancelAnimationFrame(animFrame)
  })

  async function initHuman() {
    try {
      // Dynamically import — heavy library, don't bundle eagerly
      const { default: Human } = await import('@vladmandic/human')
      human = new Human({
        modelBasePath: '/models/human/', // serve from static/models/human/
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 1 },
          description: { enabled: true },
          antispoof: { enabled: requireLiveness },
          liveness: { enabled: requireLiveness },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
        filter: { enabled: true, flip: true },
      })
      await human.load()
      await human.warmup()
      message = 'Camera ready. Position your face in the frame.'
      phase = 'ready'
    } catch (e) {
      phase = 'failed'
      message = 'Failed to load face detection. Please refresh and try again.'
    }
  }

  async function loadStoredDescriptor() {
    // Fetch the encrypted embedding from server — server decrypts and returns
    // the float array (never stored in plaintext on client)
    try {
      const res = await fetch(`/api/student/face-descriptor`)
      if (!res.ok) throw new Error('No face descriptor found')
      const data = await res.json()
      storedDescriptor = data.descriptor as number[]
    } catch {
      phase = 'failed'
      message = 'Face enrollment not found. Please enroll your face first.'
    }
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      if (videoEl) {
        videoEl.srcObject = stream
        await videoEl.play()
        detectLoop()
      }
    } catch {
      phase = 'failed'
      message = 'Camera access denied. Please allow camera access and reload.'
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop())
    stream = null
  }

  async function detectLoop() {
    if (!human || !videoEl || phase === 'verified' || phase === 'failed') return

    phase = 'detecting'

    const result = await human.detect(videoEl)

    // Draw landmarks on canvas
    if (canvasEl && result) {
      const ctx = canvasEl.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
        await human.draw.canvas(videoEl, canvasEl)
        await human.draw.all(canvasEl, result)
      }
    }

    const face = result?.face?.[0]

    if (!face || !face.embedding) {
      message = 'No face detected. Look directly at the camera.'
      animFrame = requestAnimationFrame(detectLoop)
      return
    }

    // Liveness check (antispoof)
    if (requireLiveness) {
      livenessScore = face.liveness ?? 0
      if (livenessScore < LIVENESS_THRESHOLD) {
        message = `Liveness check failed (${(livenessScore * 100).toFixed(0)}%). Ensure you are a real person in good lighting.`
        animFrame = requestAnimationFrame(detectLoop)
        return
      }
    }

    // Cosine similarity against stored descriptor
    if (storedDescriptor) {
      const similarity = cosineSimilarity(face.embedding, storedDescriptor)
      score = similarity

      if (similarity >= SIMILARITY_THRESHOLD) {
        phase = 'verified'
        message = `Identity verified (${(similarity * 100).toFixed(1)}% match)`
        stopCamera()
        onVerified(similarity)
        return
      } else {
        attempts++
        message = `Face not recognised (${(similarity * 100).toFixed(1)}% match). Attempt ${attempts}/${MAX_ATTEMPTS}.`

        if (attempts >= MAX_ATTEMPTS) {
          phase = 'failed'
          message = 'Face verification failed. Contact your invigilator.'
          stopCamera()
          onFailed('max_attempts_exceeded')
          return
        }
      }
    }

    animFrame = requestAnimationFrame(detectLoop)
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB))
  }
</script>

<div class="face-verify">
  <div class="verify-header">
    <h2>Face Verification</h2>
    <p class="subtitle">We need to verify your identity before the exam begins.</p>
  </div>

  <div class="camera-wrap">
    <video
      bind:this={videoEl}
      class="camera-feed"
      class:hidden={phase === 'verified' || phase === 'failed' || phase === 'loading'}
      muted
      playsinline
      aria-label="Camera feed"
    ></video>

    <canvas
      bind:this={canvasEl}
      class="camera-overlay"
      class:hidden={phase === 'verified' || phase === 'failed' || phase === 'loading'}
      width={640}
      height={480}
    ></canvas>

    {#if phase === 'loading'}
      <div class="camera-placeholder">
        <div class="spinner"></div>
        <p>Loading face detection...</p>
      </div>
    {/if}

    {#if phase === 'verified'}
      <div class="camera-placeholder success">
        <div class="check-icon">✓</div>
        <p>Identity Verified</p>
      </div>
    {/if}

    {#if phase === 'failed'}
      <div class="camera-placeholder error">
        <div class="x-icon">✕</div>
        <p>Verification Failed</p>
      </div>
    {/if}

    <!-- Face guide overlay -->
    {#if phase === 'ready' || phase === 'detecting'}
      <div class="face-guide" aria-hidden="true"></div>
    {/if}
  </div>

  <div class="status-bar" class:success={phase === 'verified'} class:error={phase === 'failed'}>
    {#if phase === 'detecting' || phase === 'ready'}
      <div class="dot-pulse"></div>
    {/if}
    <p class="status-message">{message}</p>
  </div>

  {#if requireLiveness && (phase === 'detecting' || phase === 'ready')}
    <div class="liveness-bar">
      <span class="liveness-label">Liveness</span>
      <div class="liveness-track">
        <div
          class="liveness-fill"
          style="width: {Math.min(livenessScore * 100, 100)}%"
          class:good={livenessScore >= LIVENESS_THRESHOLD}
        ></div>
      </div>
      <span class="liveness-value">{(livenessScore * 100).toFixed(0)}%</span>
    </div>
  {/if}

  {#if score > 0 && phase !== 'verified'}
    <div class="score-bar">
      <span class="score-label">Match</span>
      <div class="score-track">
        <div
          class="score-fill"
          style="width: {Math.min(score * 100, 100)}%"
          class:good={score >= SIMILARITY_THRESHOLD}
        ></div>
      </div>
      <span class="score-value">{(score * 100).toFixed(1)}%</span>
    </div>
  {/if}

  {#if phase === 'failed'}
    <p class="failed-note">
      Please raise your hand to notify your invigilator for manual verification.
    </p>
  {/if}
</div>

<style>
  .face-verify {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    max-width: 480px;
    width: 100%;
    padding: 2rem;
    background: var(--bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
  }

  .verify-header { text-align: center; }
  .verify-header h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
  .subtitle { margin: 0; color: var(--color-muted); font-size: 0.875rem; }

  .camera-wrap {
    position: relative;
    width: 320px;
    height: 240px;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #000;
    border: 2px solid var(--color-border);
  }

  .camera-feed {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* mirror */
  }

  .camera-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .hidden { display: none; }

  .camera-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: white;
    background: #000;
    font-size: 0.875rem;
  }

  .camera-placeholder.success { background: #052e16; }
  .camera-placeholder.error { background: #450a0a; }

  .check-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: var(--g500, #22c55e);
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.75rem; font-weight: 700;
  }

  .x-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: var(--color-danger, #ef4444);
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.75rem; font-weight: 700;
  }

  /* Oval face guide */
  .face-guide {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 160px; height: 200px;
    border: 3px solid rgba(255,255,255,0.6);
    border-radius: 50%;
    pointer-events: none;
  }

  /* Status */
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--bg-muted);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .status-bar.success { background: var(--g50); border-color: var(--g300); }
  .status-bar.error { background: #fef2f2; border-color: #fca5a5; }

  .status-message { margin: 0; font-size: 0.85rem; color: var(--color-text); }

  /* Liveness / score bars */
  .liveness-bar, .score-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    font-size: 0.75rem;
  }

  .liveness-label, .score-label {
    width: 52px;
    color: var(--color-muted);
    font-weight: 500;
    flex-shrink: 0;
  }

  .liveness-track, .score-track {
    flex: 1;
    height: 6px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .liveness-fill, .score-fill {
    height: 100%;
    background: var(--color-danger, #ef4444);
    border-radius: 999px;
    transition: width 0.3s, background 0.3s;
  }

  .liveness-fill.good, .score-fill.good {
    background: var(--g500, #22c55e);
  }

  .liveness-value, .score-value {
    width: 36px;
    text-align: right;
    color: var(--color-muted);
    font-weight: 600;
  }

  .failed-note {
    font-size: 0.8rem;
    color: var(--color-muted);
    text-align: center;
    margin: 0;
    padding: 0.75rem;
    background: #fef9c3;
    border: 1px solid #fde047;
    border-radius: 0.5rem;
    line-height: 1.5;
  }

  /* Spinner */
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Dot pulse */
  .dot-pulse {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: pulse-dot 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.5); opacity: 0.4; }
  }
</style>