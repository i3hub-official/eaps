<!-- src/routes/student/face-enroll/+page.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import ScanFace from '@lucide/svelte/icons/scan-face';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Camera from '@lucide/svelte/icons/camera';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let { data, form } = $props();

	type Phase =
		| 'idle'
		| 'loading-model'
		| 'camera-active'
		| 'ready-to-capture'
		| 'captured'
		| 'submitting'
		| 'error';

	let phase = $state<Phase>('idle');
	let errorMessage = $state('');
	let statusText = $state('');
	let capturedDescriptor = $state<number[] | null>(null);
	let stableFrameCount = $state(0);

	// Consecutive good frames required before allowing capture — a crude
	// liveness gate so a printed photo held up to the camera can't just
	// instantly "pass" on a single lucky frame.
	const REQUIRED_STABLE_FRAMES = 15;
	const MIN_CONFIDENCE = 0.6;
	const MIN_ANTISPOOF = 0.5;

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let human: any = null;
	let stream: MediaStream | null = null;
	let rafId: number | null = null;
	let destroyed = false;

	async function loadHuman() {
		if (!browser) return null;
		const { default: Human } = await import('@vladmandic/human');
		const h = new Human({
			backend: 'webgl',
			modelBasePath: '/models/human',
			hand: { enabled: false },
			body: { enabled: false },
			object: { enabled: false },
			segmentation: { enabled: false },
			gesture: { enabled: false },
			face: {
				enabled: true,
				detector: { maxDetected: 1, minConfidence: MIN_CONFIDENCE, return: true },
				description: { enabled: true },
				mesh: { enabled: true },
				emotion: { enabled: false },
				iris: { enabled: false },
				antispoof: { enabled: true },
				liveness: { enabled: true },
			},
		});
		await h.load();
		await h.warmup();
		return h;
	}

	async function startCamera() {
		errorMessage = '';
		phase = 'loading-model';
		statusText = 'Loading face detection model…';

		try {
			human = await loadHuman();
		} catch (err) {
			console.error('[face-enroll] model load failed', err);
			phase = 'error';
			errorMessage = 'Could not load the face detection model. Please refresh and try again.';
			return;
		}

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
				audio: false,
			});
		} catch (err) {
			console.error('[face-enroll] camera access failed', err);
			phase = 'error';
			errorMessage = 'Camera access was denied. Please allow camera access and try again.';
			return;
		}

		if (!videoEl) return;
		videoEl.srcObject = stream;
		await videoEl.play();

		phase = 'camera-active';
		statusText = 'Position your face inside the frame…';
		stableFrameCount = 0;
		detectLoop();
	}

	async function detectLoop() {
		if (destroyed || !human || !videoEl || phase === 'captured' || phase === 'submitting') return;

		try {
			const result = await human.detect(videoEl);
			const face = result.face?.[0];

			if (canvasEl && face) drawFaceBox(face);

			if (
				face &&
				face.faceScore >= MIN_CONFIDENCE &&
				(face.real === undefined || face.real >= MIN_ANTISPOOF) &&
				face.embedding
			) {
				stableFrameCount++;
				statusText = `Hold still… (${Math.min(stableFrameCount, REQUIRED_STABLE_FRAMES)}/${REQUIRED_STABLE_FRAMES})`;

				if (stableFrameCount >= REQUIRED_STABLE_FRAMES) {
					capturedDescriptor = Array.from(face.embedding);
					phase = 'ready-to-capture';
					statusText = 'Face detected clearly. Ready to enroll.';
					return; // stop the loop — user confirms manually below
				}
			} else {
				stableFrameCount = 0;
				statusText = face
					? 'Face detected but not clear enough — move closer to good lighting.'
					: 'No face detected — center your face in the frame.';
			}
		} catch (err) {
			console.error('[face-enroll] detection error', err);
		}

		rafId = requestAnimationFrame(detectLoop);
	}

	function drawFaceBox(face: any) {
		if (!canvasEl || !videoEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;
		canvasEl.width = videoEl.videoWidth;
		canvasEl.height = videoEl.videoHeight;
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		if (face.box) {
			const [x, y, w, h] = face.box;
			ctx.strokeStyle = stableFrameCount >= REQUIRED_STABLE_FRAMES ? '#22c55e' : '#3b82f6';
			ctx.lineWidth = 3;
			ctx.strokeRect(x, y, w, h);
		}
	}

	function retryCapture() {
		capturedDescriptor = null;
		stableFrameCount = 0;
		phase = 'camera-active';
		statusText = 'Position your face inside the frame…';
		detectLoop();
	}

	function stopCamera() {
		if (rafId) cancelAnimationFrame(rafId);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	$effect(() => {
		return () => {
			destroyed = true;
			stopCamera();
		};
	});
</script>

<Topbar title="Face Enroll" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if form?.enrollSuccess}
		<Card class="flex flex-col items-center gap-3 p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
				<CheckCircle2 class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">Face enrollment complete</p>
				<p class="mt-1 text-sm text-muted-foreground">
					You can now take tests and exams that require face verification.
				</p>
			</div>
		</Card>
	{:else}
		{#if data.alreadyEnrolled}
			<div
				class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>
					You're already enrolled. Re-enrolling will replace your existing face data — only do
					this if enrollment failed to work correctly during tests.
				</span>
			</div>
		{/if}

		{#if form?.enrollError}
			<div
				class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{form.enrollError}</span>
			</div>
		{/if}

		{#if errorMessage}
			<div
				class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<Card class="flex flex-col items-center gap-4 p-8">
			{#if phase === 'idle'}
				<div class="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
					<ScanFace class="size-6" />
				</div>
				<div class="text-center">
					<p class="text-base font-semibold">
						{data.alreadyEnrolled ? 'Re-enroll your face' : 'Enroll your face'}
					</p>
					<p class="mt-1 max-w-sm text-sm text-muted-foreground">
						You'll need a clear, well-lit view of your face. This is used to verify your identity
						during tests and exams.
					</p>
				</div>
				<Button onclick={startCamera}>
					<Camera class="size-4" />
					Start camera
				</Button>
			{:else}
				<div class="relative w-full max-w-md overflow-hidden rounded-lg bg-black">
					<!-- svelte-ignore a11y_media_has_caption -->
					<video bind:this={videoEl} class="w-full" playsinline muted></video>
					<canvas bind:this={canvasEl} class="absolute inset-0 h-full w-full"></canvas>

					{#if phase === 'loading-model'}
						<div class="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
							<Loader2 class="size-6 animate-spin" />
						</div>
					{/if}
				</div>

				<p class="text-sm text-muted-foreground">{statusText}</p>

				{#if phase === 'ready-to-capture'}
					<form
						method="POST"
						action="?/enroll"
						use:enhance={() => {
							phase = 'submitting';
							stopCamera();
							return async ({ update }) => {
								await update();
								if (form?.enrollError) {
									phase = 'error';
									errorMessage = '';
								}
							};
						}}
					>
						<input type="hidden" name="descriptor" value={JSON.stringify(capturedDescriptor)} />
						<div class="flex gap-2">
							<Button type="button" variant="ghost" onclick={retryCapture}>Retake</Button>
							<Button type="submit">Confirm & enroll</Button>
						</div>
					</form>
				{:else if phase === 'error'}
					<Button onclick={startCamera}>Try again</Button>
				{:else if phase === 'submitting'}
					<Button disabled>
						<Loader2 class="size-4 animate-spin" />
						Enrolling…
					</Button>
				{/if}
			{/if}
		</Card>
	{/if}
</main>