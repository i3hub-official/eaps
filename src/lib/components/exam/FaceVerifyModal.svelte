<!-- src/lib/components/exam/FaceVerifyModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ScanFace from '@lucide/svelte/icons/scan-face';
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
	let faceDetected = $state(false);

	const MATCH_THRESHOLD = 0.75;
	const MIN_FACE_SCORE = 0.7;
	const MIN_LIVENESS = 0.5;
	const MIN_ANTISPOOF = 0.5;

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let stopped = false;
	let loopHandle: number | null = null;
	let lastResult: any = null;

	function themeColor(varName: string, fallback: string, alpha = 1) {
		if (typeof window === 'undefined') return fallback;
		const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
		if (!raw) return fallback;
		return alpha < 1 ? `hsl(${raw} / ${alpha})` : `hsl(${raw})`;
	}

	function drawOverlay(detectedFace: boolean, multiple: boolean) {
		if (!ctx || !canvasEl) return;
		const w = canvasEl.width;
		const h = canvasEl.height;
		const cx = w / 2;
		const cy = h / 2;
		
		const rx = w * 0.22;
		const ry = h * 0.48;

		const primary = themeColor('--primary', '#00c9a7');
		const destructive = themeColor('--destructive', '#ef4444');
		const border = themeColor('--border', 'rgba(255,255,255,0.18)');

		ctx.clearRect(0, 0, w, h);

		ctx.save();
		ctx.fillStyle = themeColor('--background', 'rgba(0,0,0,0.7)', 0.7);
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = 'destination-out';
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.strokeStyle = multiple ? destructive : detectedFace ? primary : border;
		ctx.lineWidth = detectedFace ? 2.5 : 1.5;
		ctx.stroke();

		const cornerOffset = 16;
		const corners: [number, number, [number, number]][] = [
			[cx - rx, cy - ry, [1,  1]],
			[cx + rx, cy - ry, [-1, 1]],
			[cx - rx, cy + ry, [1, -1]],
			[cx + rx, cy + ry, [-1,-1]],
		];
		ctx.strokeStyle = multiple ? destructive : detectedFace ? primary : themeColor('--primary', 'rgba(0,201,167,0.6)', 0.6);
		ctx.lineWidth = 2.5;
		ctx.lineCap = 'round';
		for (const [x, y, [dx, dy]] of corners) {
			ctx.beginPath();
			ctx.moveTo(x + dx * cornerOffset, y);
			ctx.lineTo(x, y);
			ctx.lineTo(x, y + dy * cornerOffset);
			ctx.stroke();
		}

		const badgeY = h * 0.08;
		ctx.save();
		const badgeText = multiple ? '⚠ Multiple faces' : detectedFace ? '✓ Face detected' : 'Searching for face...';
		const badgeColor = multiple ? destructive : detectedFace ? primary : border;
		const bgColor = multiple ? themeColor('--destructive', 'rgba(239,68,68,0.2)', 0.2) : 
						detectedFace ? themeColor('--primary', 'rgba(0,201,167,0.15)', 0.15) : 
						themeColor('--muted', 'rgba(255,255,255,0.07)', 0.07);
		
		ctx.fillStyle = bgColor;
		ctx.strokeStyle = badgeColor;
		ctx.lineWidth = 1;
		const textWidth = ctx.measureText(badgeText).width;
		const pillW = Math.min(textWidth + 40, w * 0.8);
		const pillX = cx - pillW / 2;
		ctx.beginPath();
		ctx.roundRect(pillX, badgeY - 14, pillW, 28, 14);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = badgeColor;
		ctx.font = '600 12px system-ui';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(badgeText, cx, badgeY);
		ctx.restore();
	}

	async function start() {
		try {
			stopped = false;
			phase = 'loading-model';
			statusText = 'Loading face model…';
			human = await getHuman();

			if (stopped) return;

			phase = 'requesting-camera';
			statusText = 'Requesting camera access…';
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
				audio: false,
			});

			if (stopped) {
				stream.getTracks().forEach(t => t.stop());
				return;
			}

			if (!videoEl) throw new Error('Video element not ready.');
			videoEl.srcObject = stream;
			await videoEl.play();

			if (canvasEl) {
				canvasEl.width = videoEl.videoWidth || 640;
				canvasEl.height = videoEl.videoHeight || 480;
				ctx = canvasEl.getContext('2d');
			}

			phase = 'scanning';
			statusText = 'Position your face in the frame';
			faceDetected = false;
			runDetectionLoop();
		} catch (err) {
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Could not access the camera.';
		}
	}

	async function detect() {
		if (!human || !videoEl || stopped) return;
		try {
			lastResult = await human.detect(videoEl);
		} catch {
			lastResult = null;
		}
	}

	async function runDetectionLoop() {
		if (stopped || !human || !videoEl) return;

		await detect();
		if (stopped) return;

		const face = lastResult?.face?.[0];
		const faces = lastResult?.face ?? [];

		if (!face) {
			faceDetected = false;
			statusText = 'No face detected — center your face in the frame';
			drawOverlay(false, false);
		} else if (faces.length > 1) {
			faceDetected = false;
			statusText = 'Multiple faces detected — make sure you are alone';
			drawOverlay(false, true);
		} else if ((face.faceScore ?? 0) < MIN_FACE_SCORE) {
			faceDetected = true;
			statusText = 'Move closer and look directly at the camera';
			drawOverlay(true, false);
		} else if (face.embedding) {
			faceDetected = true;
			drawOverlay(true, false);
			
			// Safe model fallback parsing for anti-spoof and liveness structures
			const antispoofScore = face.real ?? face.antispoof ?? 0;
			const livenessScore = face.live ?? face.liveness ?? 0;
			
			await checkMatch(face.embedding, antispoofScore, livenessScore);
			return;
		} else {
			faceDetected = false;
			statusText = 'Processing face...';
			drawOverlay(false, false);
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
		faceDetected = false;
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

		<div class="mb-1 flex items-center gap-2">
			<h2 class="text-lg font-semibold">Verify your identity</h2>
			{#if phase === 'scanning'}
				<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
					Scanning
				</span>
			{/if}
		</div>
		<p class="mb-4 text-sm text-muted-foreground">Look directly at the camera to continue.</p>

		<div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>
			<canvas bind:this={canvasEl} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>

			{#if phase === 'loading-model' || phase === 'requesting-camera' || phase === 'checking'}
				<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
					<Loader2 class="size-8 animate-spin text-white" />
					<p class="text-sm text-white/80">{statusText}</p>
				</div>
			{/if}

			{#if phase === 'success'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<div class="flex flex-col items-center gap-2">
						<CheckCircle2 class="size-12 text-primary" />
						<p class="text-sm font-medium text-white">Verified!</p>
					</div>
				</div>
			{/if}

			{#if phase === 'failed'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<div class="flex flex-col items-center gap-2">
						<AlertCircle class="size-12 text-destructive" />
						<p class="text-sm font-medium text-white">Verification Failed</p>
					</div>
				</div>
			{/if}
		</div>

		{#if phase === 'scanning'}
			<div class="mb-3 flex items-center justify-center gap-2 text-sm font-medium">
				{#if faceDetected}
					<CheckCircle2 class="size-4 text-primary" />
					<span class="text-primary">Face detected</span>
				{:else}
					<ScanFace class="size-4 text-muted-foreground" />
					<span class="text-muted-foreground">Looking for face…</span>
				{/if}
			</div>
		{/if}

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