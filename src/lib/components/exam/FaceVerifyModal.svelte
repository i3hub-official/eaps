<!-- src/lib/components/exam/FaceVerifyModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';

	let {
		examId,
		onSuccess,
		onCancel,
	}: { examId: string; onSuccess: () => void; onCancel: () => void } = $props();

	type Phase = 'loading-model' | 'requesting-camera' | 'scanning' | 'checking' | 'success' | 'failed' | 'error';

	let phase = $state<Phase>('loading-model');
	let statusText = $state('Loading face model…');
	let errorMessage = $state('');
	let similarityPercent = $state<number | null>(null);

	// Tune these against your Human model's actual false-accept/false-reject
	// rates in production — these are reasonable starting points, not
	// guaranteed-correct values.
	const MATCH_THRESHOLD = 0.75;
	const MIN_FACE_SCORE = 0.7;
	const MIN_LIVENESS = 0.5;
	const MIN_ANTISPOOF = 0.5;

	let videoEl = $state<HTMLVideoElement | null>(null);
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let stopped = false;
	let loopHandle: number | null = null;

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

			phase = 'scanning';
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
		} else if ((face.faceScore ?? 0) < MIN_FACE_SCORE) {
			statusText = 'Move closer and look directly at the camera';
		} else if (face.embedding) {
			await checkMatch(face.embedding, face.real ?? 0, face.live ?? 0);
			return;
		}

		loopHandle = requestAnimationFrame(runDetectionLoop);
	}

	async function checkMatch(liveEmbedding: number[], antispoofScore: number, livenessScore: number) {
		stopped = true;
		phase = 'checking';
		statusText = 'Verifying…';

		try {
			if (antispoofScore < MIN_ANTISPOOF) {
				throw new Error('Spoof check failed — please use your own live camera feed.');
			}
			if (livenessScore < MIN_LIVENESS) {
				throw new Error('Liveness check failed — please blink and look directly at the camera.');
			}

			const descRes = await fetch('/api/face/descriptor');
			if (!descRes.ok) {
				if (descRes.status === 404) throw new Error('No enrolled face found. Please enroll first.');
				throw new Error('Could not load your enrolled face data.');
			}
			const { descriptor: storedDescriptor } = await descRes.json();

			const similarity = cosineSimilarity(liveEmbedding, storedDescriptor);
			similarityPercent = Math.round(similarity * 100);
			const verified = similarity >= MATCH_THRESHOLD;

			await fetch('/api/face/verify-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					verified,
					similarityScore: similarityPercent,
					antispoofScore: Math.round(antispoofScore * 100),
					livenessScore: Math.round(livenessScore * 100),
					examId,
				}),
			});

			if (verified) {
				phase = 'success';
				stopCamera();
				setTimeout(() => onSuccess(), 1000);
			} else {
				phase = 'failed';
				statusText = "Face didn't match your enrolled profile.";
				stopCamera();
			}
		} catch (err) {
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Verification failed.';
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
		similarityPercent = null;
		stopped = false;
		start();
	}

	function handleCancel() {
		stopCamera();
		onCancel();
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

		<h2 class="mb-1 text-lg font-semibold">Verify your identity</h2>
		<p class="mb-4 text-sm text-muted-foreground">Look directly at the camera to continue.</p>

		<div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>

			{#if phase === 'loading-model' || phase === 'requesting-camera' || phase === 'checking'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<Loader2 class="size-8 animate-spin text-white" />
				</div>
			{/if}

			{#if phase === 'success'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<CheckCircle2 class="size-12 text-primary" />
				</div>
			{/if}

			{#if phase === 'failed'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<AlertCircle class="size-12 text-destructive" />
				</div>
			{/if}
		</div>

		{#if phase === 'error'}
			<div class="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{errorMessage}</span>
			</div>
		{:else if phase === 'failed'}
			<p class="mb-4 text-center text-sm text-destructive">
				{statusText}{similarityPercent !== null ? ` (${similarityPercent}% match)` : ''}
			</p>
		{:else}
			<p class="mb-4 text-center text-sm text-muted-foreground">{statusText}</p>
		{/if}

		<div class="flex gap-2">
			{#if phase === 'error' || phase === 'failed'}
				<Button variant="outline" class="flex-1" onclick={handleCancel}>Cancel</Button>
				<Button class="flex-1" onclick={retry}>Try again</Button>
			{:else if phase !== 'success'}
				<Button variant="outline" class="w-full" onclick={handleCancel}>Cancel</Button>
			{/if}
		</div>
	</div>
</div>