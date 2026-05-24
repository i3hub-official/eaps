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
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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
    if (status !== 'capturing' || !faceapi) return;

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
    }

    setTimeout(captureLoop, 600);
  }

  async function submitEnrollment() {
    status = 'processing';
    message = 'Processing face data…';

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
        throw new Error(body.message ?? `Server error ${res.status}`);
      }

      status = 'done';
      message = 'Face enrolled successfully!';
      stopCamera();
      setTimeout(() => goto('/student'), 1500);
    } catch (err: any) {
      console.error('Enrollment error:', err);
      status = 'error';
      message = err.message ?? 'Enrollment failed. Please try again.';
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