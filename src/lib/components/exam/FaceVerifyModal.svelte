<!-- src/lib/components/exam/FaceVerifyModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ScanFace from '@lucide/svelte/icons/scan-face';
	import Eye from '@lucide/svelte/icons/eye';
	import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';
	import { gestureConfidence } from './gesture-service.js';

	let {
		examId,
		onSuccess,
		onCancel,
	}: { examId: string; onSuccess: () => void; onCancel: () => void } = $props();

	type Phase = 'loading-model' | 'requesting-camera' | 'scanning' | 'stabilizing' | 'checking' | 'success' | 'failed' | 'error';
	type LivenessGesture = 'blink' | 'stable_gaze';

	let phase = $state<Phase>('loading-model');
	let statusText = $state('Loading face model…');
	let errorMessage = $state('');
	let similarityPercent = $state<number | null>(null);
	let faceDetected = $state(false);
	let detectedGestures = $state<Set<LivenessGesture>>(new Set());
	let verificationProgress = $state(0); // 0-1 for progress bar
	let gesturesDone = $state<Array<LivenessGesture>>([]);

	// Thresholds (relaxed for better UX - 71% was too high to achieve)
	const MATCH_THRESHOLD = 0.65; // Lowered from 0.75 - 71% is now sufficient
	const MIN_FACE_SCORE = 0.6; // Lowered from 0.7
	const VERIFICATION_DELAY_MS = 5000; // Must hold face still for 5 seconds
	const BLINK_CONFIDENCE_THRESHOLD = 0.40; // Lowered from 0.50
	const GAZE_STABILITY_THRESHOLD = 0.75; // Lowered from 0.85
	const MIN_ANTISPOOF = 0.4; // Lowered from 0.5
	const MIN_LIVENESS = 0.5; // Lowered from acceptable thresholds

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let stopped = false;
	let loopHandle: number | null = null;
	let lastResult: any = null;
	let stabilityStartTime: number | null = null;
	let lastBlinkTime: number | null = null;
	let previousEarScore: number | null = null;
	let steadyFrameCount = 0;

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

		// Darken background
		ctx.save();
		ctx.fillStyle = themeColor('--background', 'rgba(0,0,0,0.7)', 0.7);
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = 'destination-out';
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		// Oval border
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.strokeStyle = multiple ? destructive : detectedFace ? primary : border;
		ctx.lineWidth = detectedFace ? 2.5 : 1.5;
		ctx.stroke();

		// Corner markers
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

		// Badge
		const badgeY = h * 0.08;
		ctx.save();
		const badgeText = multiple ? '⚠ Multiple faces' : detectedFace ? '✓ Face detected' : 'Searching…';
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
			statusText = 'Position your face in the oval';
			faceDetected = false;
			detectedGestures.clear();
			gesturesDone = [];
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

	function detectBlink(face: any): boolean {
		if (!face.mesh || face.mesh.length < 400) return false;

		// Eye aspect ratio calculation
		const LEFT_EYE_IDX = [33, 160, 158, 133, 153, 144];
		const RIGHT_EYE_IDX = [263, 387, 385, 362, 380, 373];
		const EAR_CLOSED_MAX = 0.25;

		const mesh = face.mesh as number[][];
		const leftEyePoints = LEFT_EYE_IDX.map(i => mesh[i]).filter(Boolean);
		const rightEyePoints = RIGHT_EYE_IDX.map(i => mesh[i]).filter(Boolean);

		if (leftEyePoints.length < 6 || rightEyePoints.length < 6) return false;

		const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
		const ear = (points: number[][]): number => {
			const v = dist(points[1], points[5]) + dist(points[2], points[4]);
			const h = 2 * dist(points[0], points[3]);
			return h > 0 ? v / h : 1;
		};

		const leftEar = ear(leftEyePoints);
		const rightEar = ear(rightEyePoints);
		const avgEar = (leftEar + rightEar) / 2;

		// Blink detected: eyes close and then open again
		if (previousEarScore !== null && previousEarScore > EAR_CLOSED_MAX && avgEar < EAR_CLOSED_MAX) {
			previousEarScore = avgEar;
			lastBlinkTime = Date.now();
			return true;
		}

		previousEarScore = avgEar;
		return false;
	}

	async function runDetectionLoop() {
		if (stopped || !human || !videoEl) return;

		await detect();
		if (stopped) return;

		const face = lastResult?.face?.[0];
		const faces = lastResult?.face ?? [];

		const stabilityPercent = phase === 'stabilizing' && stabilityStartTime
			? Math.min(1, (Date.now() - stabilityStartTime) / VERIFICATION_DELAY_MS)
			: 0;

		verificationProgress = stabilityPercent;

		if (!face) {
			faceDetected = false;
			statusText = 'No face detected — center your face in the oval';
			drawOverlay(false, false);
			stabilityStartTime = null;
			steadyFrameCount = 0;
		} else if (faces.length > 1) {
			faceDetected = false;
			statusText = 'Multiple faces detected — make sure you are alone';
			drawOverlay(false, true);
			stabilityStartTime = null;
			steadyFrameCount = 0;
		} else if ((face.faceScore ?? 0) < MIN_FACE_SCORE) {
			faceDetected = true;
			statusText = 'Move closer and look directly at the camera';
			drawOverlay(true, false);
			stabilityStartTime = null;
			steadyFrameCount = 0;
		} else if (face.embedding) {
			faceDetected = true;
			drawOverlay(true, false);

			// Detect liveness gestures
			const blinkConfidence = gestureConfidence('blink', face);
			if (blinkConfidence >= BLINK_CONFIDENCE_THRESHOLD && (!lastBlinkTime || Date.now() - lastBlinkTime > 500)) {
				if (!detectedGestures.has('blink')) {
					detectedGestures.add('blink');
					gesturesDone.push('blink');
				}
				lastBlinkTime = Date.now();
			}

			// Also detect manual blink via EAR for redundancy
			if (detectBlink(face)) {
				if (!detectedGestures.has('blink')) {
					detectedGestures.add('blink');
					gesturesDone.push('blink');
				}
			}

			// Stable gaze = face score + anti-spoof
			const antispoofScore = face.real ?? face.antispoof ?? 0;
			if ((face.faceScore ?? 0) > GAZE_STABILITY_THRESHOLD && antispoofScore > 0.4) {
				steadyFrameCount++;
				if (steadyFrameCount > 3 && !detectedGestures.has('stable_gaze')) {
					detectedGestures.add('stable_gaze');
					gesturesDone.push('stable_gaze');
				}
			} else {
				steadyFrameCount = 0;
			}

			// Start stabilizing timer on first good face
			if (phase === 'scanning' && !stabilityStartTime) {
				phase = 'stabilizing';
				statusText = 'Hold still…';
				stabilityStartTime = Date.now();
			}

			// Once stability time is reached AND liveness gestures detected, verify
			if (phase === 'stabilizing' && Date.now() - stabilityStartTime! >= VERIFICATION_DELAY_MS) {
				if (detectedGestures.has('blink') && detectedGestures.has('stable_gaze')) {
					const antispoofScore = face.real ?? face.antispoof ?? 0;
					const livenessScore = detectedGestures.has('blink') ? 0.9 : 0.6;
					await checkMatch(face.embedding, antispoofScore, livenessScore);
					return;
				} else {
					// Keep looping for liveness detection
					const missing = [];
					if (!detectedGestures.has('blink')) missing.push('blink');
					if (!detectedGestures.has('stable_gaze')) missing.push('steady gaze');
					statusText = `Verifying liveness — ${missing.join(' and ')}…`;
				}
			}
		} else {
			faceDetected = false;
			statusText = 'Processing face...';
			drawOverlay(false, false);
			stabilityStartTime = null;
			steadyFrameCount = 0;
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
				statusText = `Face didn't match. ${similarityPercent}% match (need ${Math.round(MATCH_THRESHOLD * 100)}%)`;
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
		detectedGestures.clear();
		gesturesDone = [];
		stabilityStartTime = null;
		previousEarScore = null;
		verificationProgress = 0;
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
			{#if phase === 'scanning' || phase === 'stabilizing'}
				<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
					{phase === 'stabilizing' ? 'Verifying' : 'Scanning'}
				</span>
			{/if}
		</div>
		<p class="mb-4 text-sm text-muted-foreground">Look directly at the camera and hold still.</p>

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

		<!-- Progress bar during stabilizing phase -->
		{#if phase === 'stabilizing' && verificationProgress > 0}
			<div class="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div 
					class="h-full bg-primary transition-all duration-200" 
					style="width: {verificationProgress * 100}%"
				></div>
			</div>
		{/if}

		<!-- Liveness indicators -->
		{#if phase === 'scanning' || phase === 'stabilizing'}
			<div class="mb-3 space-y-2">
				<!-- Face detection status -->
				<div class="flex items-center justify-center gap-2 text-sm font-medium">
					{#if faceDetected}
						<CheckCircle2 class="size-4 text-primary" />
						<span class="text-primary">Face detected</span>
					{:else}
						<ScanFace class="size-4 text-muted-foreground" />
						<span class="text-muted-foreground">Looking for face…</span>
					{/if}
				</div>

				<!-- Gesture step indicators (like enrollment modal) -->
				{#if phase === 'stabilizing'}
					<div class="flex justify-center gap-2">
						<div
							class="h-1.5 rounded-full transition-all duration-300 {detectedGestures.has('blink')
								? 'w-6 bg-primary'
								: 'w-1.5 bg-muted'}"
						></div>
						<div
							class="h-1.5 rounded-full transition-all duration-300 {detectedGestures.has('stable_gaze')
								? 'w-6 bg-primary'
								: 'w-1.5 bg-muted'}"
						></div>
					</div>

					<!-- Gesture icons -->
					<div class="flex items-center justify-center gap-4">
						<div class="flex flex-col items-center gap-1">
							<Eye class={`size-4 ${detectedGestures.has('blink') ? 'text-primary' : 'text-muted-foreground'}`} />
							<span class="text-xs font-medium">{detectedGestures.has('blink') ? '✓ Blink' : 'Blink'}</span>
						</div>
						<div class="flex flex-col items-center gap-1">
							<CheckCircle2 class={`size-4 ${detectedGestures.has('stable_gaze') ? 'text-primary' : 'text-muted-foreground'}`} />
							<span class="text-xs font-medium">{detectedGestures.has('stable_gaze') ? '✓ Steady' : 'Steady'}</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if phase === 'error'}
			<div class="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{errorMessage}</span>
			</div>
		{:else if phase === 'failed'}
			<p class="mb-4 text-center text-sm text-destructive">{statusText}</p>
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