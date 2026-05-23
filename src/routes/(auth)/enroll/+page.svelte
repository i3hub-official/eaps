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
  const REQUIRED_CAPTURES = 5;

  // face-api.js is loaded via CDN in app.html
  // @ts-ignore
  const faceapi = () => (window as any).faceapi;

  async function loadModels() {
    const MODEL_URL = '/models'; // place face-api models in /static/models/
    try {
      await Promise.all([
        faceapi().nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi().nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi().nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      status = 'idle';
      message = 'Models loaded. Click "Start Camera" to begin.';
    } catch {
      status = 'error';
      message = 'Failed to load face detection models.';
    }
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      video.srcObject = stream;
      await video.play();
      status = 'capturing';
      message = `Look directly at the camera. Capturing ${REQUIRED_CAPTURES} samples…`;
      captureLoop();
    } catch {
      status = 'error';
      message = 'Camera access denied. Please allow camera access and try again.';
    }
  }

  async function captureLoop() {
    if (status !== 'capturing') return;

    const detection = await faceapi()
      .detectSingleFace(video, new faceapi().TinyFaceDetectorOptions())
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

    setTimeout(captureLoop, 600);
  }

  async function submitEnrollment() {
    status = 'processing';
    message = 'Processing face data…';

    // Average the descriptors for a stable representation
    const avg = descriptors[0].map((_, i) =>
      descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
    );

    try {
      const res = await fetch('/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: avg }),
      });

      if (!res.ok) throw new Error('Server error');

      status = 'done';
      message = 'Face enrolled successfully!';
      stopCamera();
      setTimeout(() => goto('/dashboard'), 1500);
    } catch {
      status = 'error';
      message = 'Enrollment failed. Please try again.';
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function retry() {
    descriptors = [];
    captureCount = 0;
    status = 'idle';
    message = 'Click "Start Camera" to try again.';
  }

  onMount(loadModels);
  onDestroy(stopCamera);
</script>

<svelte:head><title>Face Enrollment — MOUAU eTest</title></svelte:head>

<div class="enroll-page">
  <div class="card">
    <h1>Face Enrollment</h1>
    <p class="sub">
      {data.enrolled
        ? 'You are already enrolled. You can re-enroll below.'
        : 'Enroll your face to take exams. This is required before starting any exam.'}
    </p>

    <div class="camera-wrap">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={video} class="video" class:hidden={status !== 'capturing'} playsinline muted></video>
      <canvas bind:this={canvas} class="canvas hidden"></canvas>

      {#if status !== 'capturing'}
        <div class="camera-placeholder">
          <span class="camera-icon" aria-hidden="true">
            {status === 'done' ? '✅' : status === 'error' ? '❌' : '📷'}
          </span>
        </div>
      {/if}
    </div>

    <!-- Progress bar -->
    {#if status === 'capturing'}
      <div class="progress-wrap">
        <div class="progress-bar" style="width:{(captureCount / REQUIRED_CAPTURES) * 100}%"></div>
      </div>
    {/if}

    <p class="message" class:success={status === 'done'} class:error-msg={status === 'error'}>
      {message}
    </p>

    <div class="actions">
      {#if status === 'idle'}
        <button class="btn-primary" onclick={startCamera} type="button">Start Camera</button>
      {:else if status === 'error'}
        <button class="btn-primary" onclick={retry} type="button">Try Again</button>
      {:else if status === 'done'}
        <a href="/dashboard" class="btn-primary">Go to Dashboard</a>
      {/if}
      <a href="/dashboard" class="btn-ghost">Skip for now</a>
    </div>

    <div class="tips">
      <p class="tip-title">Tips for best results:</p>
      <ul>
        <li>Ensure good lighting on your face</li>
        <li>Look directly at the camera</li>
        <li>Remove glasses if possible</li>
        <li>Keep your face still during capture</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .enroll-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem; background: var(--color-bg);
  }

  .card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 2rem; max-width: 440px; width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
    text-align: center;
  }

  h1   { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .sub { font-size: 0.875rem; color: var(--color-muted); margin: 0; line-height: 1.5; }

  .camera-wrap {
    width: 280px; height: 210px; border-radius: 0.75rem; overflow: hidden;
    background: var(--color-bg); border: 2px solid var(--color-border);
    position: relative; display: flex; align-items: center; justify-content: center;
  }

  .video  { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
  .canvas { position: absolute; inset: 0; }
  .hidden { display: none; }

  .camera-placeholder {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%;
  }
  .camera-icon { font-size: 3.5rem; }

  .progress-wrap {
    width: 100%; height: 6px; background: var(--color-border); border-radius: 999px; overflow: hidden;
  }
  .progress-bar {
    height: 100%; background: var(--color-primary);
    border-radius: 999px; transition: width 0.3s ease;
  }

  .message { font-size: 0.875rem; color: var(--color-muted); margin: 0; }
  .message.success  { color: #16a34a; font-weight: 600; }
  .message.error-msg { color: #dc2626; }

  .actions { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
  .btn-primary {
    padding: 0.7rem 1.5rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.95rem;
    cursor: pointer; text-decoration: none; text-align: center;
  }
  .btn-ghost {
    padding: 0.5rem; color: var(--color-muted); font-size: 0.82rem;
    text-decoration: none; text-align: center;
  }
  .btn-ghost:hover { color: var(--color-text); }

  .tips {
    width: 100%; background: var(--color-bg); border-radius: 0.5rem;
    padding: 0.875rem 1rem; text-align: left;
  }
  .tip-title { font-size: 0.8rem; font-weight: 600; margin: 0 0 0.5rem; }
  .tips ul   { margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .tips li   { font-size: 0.8rem; color: var(--color-muted); }
</style>