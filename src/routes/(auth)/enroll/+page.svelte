<!-- src/routes/(auth)/enroll/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let stream: MediaStream | null = null;
  let status = $state<'idle' | 'loading' | 'capturing' | 'processing' | 'done' | 'error'>('loading');
  let message = $state('Loading face detection models…');
  let captureCount = $state(0);
  let descriptors: number[][] = [];
  let isProcessing = $state(false);
  const REQUIRED_CAPTURES = 5;

  // Dynamically imported so it never runs on the server (no window/canvas there)
  let faceapi: typeof import('@vladmandic/face-api') | null = null;

  async function loadModels() {
    try {
      // Dynamic import keeps face-api out of the SSR bundle entirely
      faceapi = await import('@vladmandic/face-api');

      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      status = 'idle';
      message = 'Models loaded. Click "Start Camera" to begin.';
    } catch (err) {
      console.error('Model load error:', err);
      status = 'error';
      message = 'Failed to load face detection models. Check your connection and try refreshing.';
    }
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      video.srcObject = stream;
      await video.play();
      status = 'capturing';
      message = `Look directly at the camera. Capturing ${REQUIRED_CAPTURES} samples…`;
      captureLoop();
    } catch (err) {
      console.error('Camera error:', err);
      status = 'error';
      message = 'Camera access denied. Please allow camera access and try again.';
    }
  }

  async function captureLoop() {
    if (status !== 'capturing' || !faceapi || isProcessing) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (detection) {
        descriptors.push(Array.from(detection.descriptor));
        captureCount = descriptors.length;
        message = `Captured ${captureCount}/${REQUIRED_CAPTURES} — keep looking at the camera…`;

        if (captureCount >= REQUIRED_CAPTURES) {
          await submitEnrollment();
          return;
        }
      } else {
        message = 'No face detected — position your face in the frame.';
      }
    } catch (err) {
      console.error('Detection error:', err);
      message = 'Detection error. Please ensure good lighting and face visibility.';
    }

    setTimeout(captureLoop, 600);
  }

  async function submitEnrollment() {
    if (isProcessing) return;
    isProcessing = true;
    status = 'processing';
    message = 'Processing face data…';

    // Calculate average descriptor
    const avg = descriptors[0].map((_, i) =>
      descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
    );

    try {
      const res = await fetch('/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: avg }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? body.message ?? `Server error ${res.status}`);
      }

      status = 'done';
      message = 'Face enrolled successfully! Redirecting...';
      stopCamera();
      setTimeout(() => goto('/student'), 1500);
    } catch (err: any) {
      console.error('Enrollment error:', err);
      status = 'error';
      message = err.message ?? 'Enrollment failed. Please try again.';
    } finally {
      isProcessing = false;
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function retry() {
    descriptors = [];
    captureCount = 0;
    status = 'idle';
    message = 'Click "Start Camera" to try again.';
    isProcessing = false;
  }

  onMount(() => {
    loadModels();
  });
  
  onDestroy(() => {
    stopCamera();
  });
</script>

<div class="enroll-container">
  <div class="enroll-card">
    <h1>Face Enrollment</h1>
    <p class="subtitle">Register your face for exam proctoring</p>

    <div class="camera-container">
      {#if status !== 'done'}
        <video
          bind:this={video}
          autoplay
          muted
          playsinline
          class:video-hidden={status === 'loading' || status === 'error'}
        ></video>
        <canvas bind:this={canvas} style="display: none;"></canvas>
        
        {#if status === 'loading' || status === 'error'}
          <div class="placeholder">
            {#if status === 'loading'}
              <div class="spinner"></div>
            {:else}
              <div class="error-icon">⚠️</div>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="success-placeholder">
          <div class="success-icon">✓</div>
        </div>
      {/if}
    </div>

    <div class="status-message" class:error={status === 'error'} class:success={status === 'done'}>
      {message}
    </div>

    <div class="progress" class:visible={status === 'capturing'}>
      <div class="progress-bar" style="width: {(captureCount / REQUIRED_CAPTURES) * 100}%"></div>
    </div>

    <div class="actions">
      {#if status === 'idle'}
        <button class="btn-primary" onclick={startCamera}>
          Start Camera
        </button>
      {:else if status === 'error'}
        <button class="btn-secondary" onclick={retry}>
          Try Again
        </button>
        <button class="btn-outline" onclick={() => goto('/student')}>
          Skip for Now
        </button>
      {:else if status === 'capturing' || status === 'processing'}
        <button class="btn-secondary" onclick={stopCamera} disabled={status === 'processing'}>
          Cancel
        </button>
      {:else if status === 'done'}
        <div class="done-message">Redirecting to dashboard...</div>
      {/if}
    </div>

    <div class="info">
      <p>📸 Please ensure:</p>
      <ul>
        <li>Good lighting on your face</li>
        <li>No glasses or remove if possible</li>
        <li>Look directly at the camera</li>
        <li>Keep a neutral expression</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .enroll-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--color-bg);
  }

  .enroll-card {
    max-width: 500px;
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    padding: 2rem;
    text-align: center;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  .subtitle {
    color: var(--color-muted);
    margin-bottom: 1.5rem;
  }

  .camera-container {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #000;
    border-radius: 0.75rem;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-hidden {
    opacity: 0;
  }

  .placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
  }

  .success-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #22c55e, #16a34a);
  }

  .success-icon {
    font-size: 4rem;
    color: white;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.3);
    border-top-color: #22c55e;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-icon {
    font-size: 3rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status-message {
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    background: var(--color-surface-elevated);
    color: var(--color-text);
  }

  .status-message.error {
    background: #fef2f2;
    color: #dc2626;
  }

  .status-message.success {
    background: #f0fdf4;
    color: #16a34a;
  }

  .progress {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    margin-bottom: 1.5rem;
    overflow: hidden;
    opacity: 0;
  }

  .progress.visible {
    opacity: 1;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    transition: width 0.3s ease;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  button {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .btn-primary {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    border: none;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34,197,94,0.3);
  }

  .btn-secondary {
    background: var(--color-surface-elevated);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    border-color: #22c55e;
    color: #22c55e;
  }

  .btn-outline {
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }

  .btn-outline:hover {
    border-color: #dc2626;
    color: #dc2626;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .done-message {
    color: #16a34a;
    font-weight: 500;
  }

  .info {
    text-align: left;
    padding: 1rem;
    background: var(--color-surface-elevated);
    border-radius: 0.5rem;
    font-size: 0.8rem;
  }

  .info p {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  .info ul {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--color-muted);
  }

  .info li {
    margin: 0.25rem 0;
  }
</style>