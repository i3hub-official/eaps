<script lang="ts">
  // src/lib/components/face/FaceEnroll.svelte
  // Multi-step face enrollment: capture multiple angles, average descriptors,
  // encrypt and store via API. Runs entirely client-side.

  import { onMount, onDestroy } from 'svelte'

  let {
    onComplete,
    onError,
  }: {
    onComplete: () => void
    onError: (msg: string) => void
  } = $props()

  type EnrollPhase = 'loading' | 'instructions' | 'capturing' | 'processing' | 'done' | 'error'

  let phase = $state<EnrollPhase>('loading')
  let message = $state('')
  let captureCount = $state(0)
  let videoEl = $state<HTMLVideoElement | null>(null)
  let canvasEl = $state<HTMLCanvasElement | null>(null)
  let stream = $state<MediaStream | null>(null)
  let human: any = null
  let animFrame: number | null = null
  let capturedDescriptors: number[][] = []

  const REQUIRED_CAPTURES = 5   // capture 5 samples, average them
  const CAPTURE_INTERVAL_MS = 800

  onMount(async () => {
    await initHuman()
  })

  onDestroy(() => {
    stopCamera()
    if (animFrame) cancelAnimationFrame(animFrame)
  })

  async function initHuman() {
    try {
      const { default: Human } = await import('@vladmandic/human')
      human = new Human({
        modelBasePath: '/models/human/',
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 1 },
          description: { enabled: true },
          antispoof: { enabled: false },
          liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
        filter: { enabled: true, flip: true },
      })
      await human.load()
      await human.warmup()
      phase = 'instructions'
    } catch {
      phase = 'error'
      message = 'Failed to initialise face detection. Please try again.'
    }
  }

  async function startEnrollment() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      if (videoEl) {
        videoEl.srcObject = stream
        await videoEl.play()
      }
      phase = 'capturing'
      captureCount = 0
      capturedDescriptors = []
      message = 'Look directly at the camera. Keep still.'
      captureLoop()
    } catch {
      phase = 'error'
      message = 'Camera access denied. Please allow camera access.'
    }
  }

  let lastCapture = 0
  async function captureLoop() {
    if (phase !== 'capturing' || !videoEl) return

    const now = Date.now()
    if (now - lastCapture >= CAPTURE_INTERVAL_MS) {
      const result = await human.detect(videoEl)

      // Draw
      if (canvasEl) {
        const ctx = canvasEl.getContext('2d')
        ctx?.clearRect(0, 0, canvasEl.width, canvasEl.height)
        await human.draw.canvas(videoEl, canvasEl)
        await human.draw.all(canvasEl, result)
      }

      const face = result?.face?.[0]
      if (face?.embedding && face.embedding.length > 0) {
        // Check face box confidence
        if ((face.boxScore ?? 0) >= 0.8) {
          capturedDescriptors.push([...face.embedding])
          captureCount++
          message = `Capturing... ${captureCount}/${REQUIRED_CAPTURES}`
          lastCapture = now

          if (captureCount >= REQUIRED_CAPTURES) {
            stopCamera()
            await processEnrollment()
            return
          }
        } else {
          message = 'Face detected but confidence low. Move closer to the camera.'
        }
      } else {
        message = 'No face detected. Position your face in the oval guide.'
      }
    }

    animFrame = requestAnimationFrame(captureLoop)
  }

  async function processEnrollment() {
    phase = 'processing'
    message = 'Processing your face data...'

    // Average the captured descriptors
    const len = capturedDescriptors[0].length
    const averaged = new Array(len).fill(0)
    for (const desc of capturedDescriptors) {
      for (let i = 0; i < len; i++) {
        averaged[i] += desc[i]
      }
    }
    for (let i = 0; i < len; i++) {
      averaged[i] /= capturedDescriptors.length
    }

    // Normalise
    const magnitude = Math.sqrt(averaged.reduce((s, v) => s + v * v, 0))
    const normalised = averaged.map(v => v / magnitude)

    // Send to server — server encrypts and stores
    const res = await fetch('/api/student/face-enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor: normalised }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      phase = 'error'
      message = err.message ?? 'Enrollment failed. Please try again.'
      onError(message)
      return
    }

    phase = 'done'
    message = 'Face enrolled successfully!'
    onComplete()
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    if (animFrame) cancelAnimationFrame(animFrame)
  }

  function retry() {
    capturedDescriptors = []
    captureCount = 0
    phase = 'instructions'
  }
</script>

<div class="enroll-wrap">
  {#if phase === 'loading'}
    <div class="center-state">
      <div class="spinner"></div>
      <p>Loading face detection models...</p>
    </div>

  {:else if phase === 'instructions'}
    <div class="instructions">
      <div class="enroll-icon">📷</div>
      <h2>Face Enrollment</h2>
      <p>We'll capture your face to verify your identity during exams.</p>
      <ul class="tips">
        <li>✓ Sit in a well-lit environment</li>
        <li>✓ Look directly at the camera</li>
        <li>✓ Remove glasses or hats if possible</li>
        <li>✓ Keep your face within the oval guide</li>
        <li>✗ Do not let others be in frame</li>
      </ul>
      <button class="btn-primary" onclick={startEnrollment}>
        Begin Enrollment
      </button>
    </div>

  {:else if phase === 'capturing' || phase === 'processing'}
    <div class="capture-ui">
      <div class="camera-wrap">
        <video
          bind:this={videoEl}
          class="camera-feed"
          class:hidden={phase === 'processing'}
          muted playsinline
        ></video>
        <canvas
          bind:this={canvasEl}
          class="camera-overlay"
          class:hidden={phase === 'processing'}
          width={640} height={480}
        ></canvas>
        <div class="face-guide" aria-hidden="true"></div>

        {#if phase === 'processing'}
          <div class="camera-placeholder">
            <div class="spinner"></div>
            <p>Processing...</p>
          </div>
        {/if}
      </div>

      <!-- Capture progress dots -->
      <div class="capture-dots" aria-label="Capture progress">
        {#each Array(REQUIRED_CAPTURES) as _, i}
          <div class="dot" class:filled={i < captureCount}></div>
        {/each}
      </div>

      <p class="capture-msg">{message}</p>
    </div>

  {:else if phase === 'done'}
    <div class="center-state success">
      <div class="check-icon">✓</div>
      <h2>Enrollment Complete</h2>
      <p>Your face has been enrolled. You can now take exams that require face verification.</p>
    </div>

  {:else if phase === 'error'}
    <div class="center-state error">
      <div class="x-icon">✕</div>
      <h2>Enrollment Failed</h2>
      <p>{message}</p>
      <button class="btn-secondary" onclick={retry}>Try Again</button>
    </div>
  {/if}
</div>

<style>
  .enroll-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 480px;
    width: 100%;
  }

  .center-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  .center-state.success h2 { color: var(--g600); }
  .center-state.error h2 { color: var(--color-danger); }

  .instructions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  .enroll-icon { font-size: 3rem; }

  .tips {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    background: var(--bg-muted);
    padding: 1rem 1.25rem;
    border-radius: 0.625rem;
    width: 100%;
  }

  .capture-ui {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

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
    transform: scaleX(-1);
  }

  .camera-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .hidden { display: none; }

  .face-guide {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -52%);
    width: 150px; height: 190px;
    border: 2px solid rgba(255,255,255,0.7);
    border-radius: 50%;
    pointer-events: none;
  }

  .camera-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: #000;
    color: white;
    font-size: 0.875rem;
  }

  .capture-dots {
    display: flex;
    gap: 0.5rem;
  }

  .dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background: transparent;
    transition: all 0.2s;
  }

  .dot.filled {
    background: var(--g500, #22c55e);
    border-color: var(--g500, #22c55e);
  }

  .capture-msg {
    font-size: 0.875rem;
    color: var(--color-muted);
    text-align: center;
    margin: 0;
  }

  .check-icon {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--g500);
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; font-weight: 700;
  }

  .x-icon {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--color-danger);
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; font-weight: 700;
  }

  .btn-primary {
    padding: 0.75rem 2rem;
    background: var(--g600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    padding: 0.625rem 1.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    cursor: pointer;
    color: var(--color-text);
  }

  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>