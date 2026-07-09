<!-- src/lib/components/exam/FaceEnrollModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { getHuman } from '$lib/client/face/human.js';

	let { onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void } = $props();

	type Phase = 'loading-model' | 'requesting-camera' | 'capturing' | 'processing' | 'success' | 'error';

	let phase = $state<Phase>('loading-model');
	let errorMessage = $state('');
	let statusText = $state('Loading face model…');
	let capturedCount = $state(0);
	const REQUIRED_CAPTURES = 5;

	let videoEl = $state<HTMLVideoElement | null>(null);
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let loopHandle: number | null = null;
	let capturedDescriptors: number[][] = [];
	let lastCaptureAt = 0;
	const CAPTURE_INTERVAL_MS = 600;
	let stopped = false;

	async function start() {
		try {
			phase = 'loading-model';
			statusText = 'Loading face model…';
			human = await getHuman();

			phase = 'requesting-camera';
			statusText = 'Requesting camera access…';
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
				audio: false,
			});

			if (!videoEl) throw new Error('Video element not ready.');
			videoEl.srcObject = stream;
			await videoEl.play();

			phase = 'capturing';
			statusText = 'Position your face in the frame';
			runDetectionLoop();
		} catch (err) {
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Could not access the camera.';
		}
	}

	async function runDetectionLoop() {
		if (stopped || !human || !videoEl) return;

		const result = await human.detect(videoEl);
		const face = result.face[0];

		if (!face) {
			statusText = 'No face detected — center your face in the frame';
		} else if (result.face.length > 1) {
			statusText = 'Multiple faces detected — make sure you are alone';
		} else if ((face.faceScore ?? 0) < 0.7) {
			statusText = 'Move closer and look directly at the camera';
		} else if (face.embedding) {
			const now = Date.now();
			if (now - lastCaptureAt > CAPTURE_INTERVAL_MS) {
				lastCaptureAt = now;
				capturedDescriptors.push(face.embedding);
				capturedCount = capturedDescriptors.length;
				statusText = `Captured ${capturedCount} of ${REQUIRED_CAPTURES} — hold steady`;
			}
		}

		if (capturedDescriptors.length >= REQUIRED_CAPTURES) {
			await finishCapture();
			return;
		}

		loopHandle = requestAnimationFrame(runDetectionLoop);
	}

	async function finishCapture() {
		stopped = true;
		phase = 'processing';
		statusText = 'Processing…';

		try {
			const dim = capturedDescriptors[0].length;
			const averaged = new Array(dim).fill(0);
			for (const d of capturedDescriptors) {
				for (let i = 0; i < dim; i++) averaged[i] += d[i] / capturedDescriptors.length;
			}

			const res = await fetch('/api/face/enroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ descriptor: averaged }),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || 'Enrollment failed. Please try again.');
			}

			phase = 'success';
			stopCamera();
			setTimeout(() => onSuccess?.(), 1200);
		} catch (err) {
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Enrollment failed.';
			stopCamera();
		}
	}

	function stopCamera() {
		stopped = true;
		if (loopHandle) cancelAnimationFrame(loopHandle);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	function retry() {
		errorMessage = '';
		capturedDescriptors = [];
		capturedCount = 0;
		stopped = false;
		start();
	}

	function handleCancel() {
		stopCamera();
		onCancel?.();
	}

	onMount(start);
	onDestroy(stopCamera);
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
	<div class="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
		<button
			type="button"
			onclick={handleCancel}
			class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
			aria-label="Close"
		>
			<X class="size-5" />
		</button>

		<h2 class="mb-1 text-lg font-semibold">Face enrollment</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			We'll use this to verify your identity before tests and exams.
		</p>

		<div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>

			{#if phase === 'loading-model' || phase === 'requesting-camera' || phase === 'processing'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<Loader2 class="size-8 animate-spin text-white" />
				</div>
			{/if}

			{#if phase === 'success'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<CheckCircle2 class="size-12 text-primary" />
				</div>
			{/if}
		</div>

		{#if phase === 'capturing'}
			<div class="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full bg-primary transition-all"
					style="width: {(capturedCount / REQUIRED_CAPTURES) * 100}%"
				></div>
			</div>
		{/if}

		{#if phase === 'error'}
			<div class="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{errorMessage}</span>
			</div>
		{:else}
			<p class="mb-4 text-center text-sm text-muted-foreground">{statusText}</p>
		{/if}

		<div class="flex gap-2">
			{#if phase === 'error'}
				<Button variant="outline" class="flex-1" onclick={handleCancel}>Cancel</Button>
				<Button class="flex-1" onclick={retry}>Try again</Button>
			{:else if phase !== 'success'}
				<Button variant="outline" class="w-full" onclick={handleCancel}>Cancel</Button>
			{/if}
		</div>
	</div>
</div>