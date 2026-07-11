<!-- src/lib/components/exam/FaceEnrollModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ScanFace from '@lucide/svelte/icons/scan-face';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Eye from '@lucide/svelte/icons/eye';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import SmilePlus from '@lucide/svelte/icons/smile-plus';
	import { getHuman } from '$lib/client/face/human.js';
	import {
		selectGestures,
		gestureConfidence,
		createTrackerForGesture,
		GestureTracker,
		type GestureDefinition
	} from './gesture-service.js';

	let { onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void } = $props();

	type Phase = 'loading-model' | 'requesting-camera' | 'positioning' | 'gesture' | 'processing' | 'success' | 'error';

	let phase = $state<Phase>('loading-model');
	let errorMessage = $state('');
	let statusText = $state('Loading face model…');
	let faceDetected = $state(false);

	let posHoldProgress = $state(0);
	let posHoldStart: number | null = null;
	const POS_HOLD_MS = 1000;

	let selected: GestureDefinition[] = [];
	let gestureIndex = $state(0);
	let gesturesDone = $state(0);
	let holdProgress = $state(0);
	let tracker = $state.raw(new GestureTracker());
	const GESTURE_COUNT = 3;

	let descriptors: number[][] = [];
	let confidenceDisplay = $state(0);

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let loopHandle: number | null = null;
	let stopped = false;
	let lastResult: any = null;
	let frameCount = 0;

	function themeColor(varName: string, fallback: string, alpha = 1) {
		if (typeof window === 'undefined') return fallback;
		const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
		if (!raw) return fallback;
		return alpha < 1 ? `hsl(${raw} / ${alpha})` : `hsl(${raw})`;
	}

	function drawOverlay(detectedFace: boolean, multiple: boolean, progress: number, label?: string) {
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
		const card = themeColor('--card', '#0f1115');

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

		if (progress > 0 && detectedFace && !multiple) {
			ctx.save();
			ctx.beginPath();
			ctx.ellipse(cx, cy, rx + 10, ry + 10, 0, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
			ctx.strokeStyle = themeColor('--primary', '#00c9a7', 0.4 + progress * 0.4);
			ctx.lineWidth = 4;
			ctx.lineCap = 'round';
			ctx.stroke();
			ctx.restore();
		}

		if (label && !multiple) {
			ctx.save();
			const pillH = 36;
			const pillY = h * 0.94 - pillH / 2;
			ctx.font = '600 13px system-ui';
			const textW = ctx.measureText(label).width;
			const pillW = Math.min(textW + 44, w * 0.85);
			const pillX = cx - pillW / 2;
			ctx.fillStyle = card;
			ctx.strokeStyle = border;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = progress > 0 ? primary : themeColor('--card-foreground', '#fff');
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(label, cx, pillY + pillH / 2);
			ctx.restore();
		}
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

			phase = 'positioning';
			statusText = 'Centre your face in the oval';
			posHoldStart = null;
			posHoldProgress = 0;
			loopHandle = requestAnimationFrame(positioningLoop);
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

	async function positioningLoop() {
		if (stopped || phase !== 'positioning' || !canvasEl) return;
		await detect();
		if (stopped || phase !== 'positioning') return;

		const faces = lastResult?.face ?? [];

		if (faces.length === 0) {
			faceDetected = false;
			posHoldStart = null;
			posHoldProgress = 0;
			statusText = 'No face detected — centre your face in the oval';
			drawOverlay(false, false, 0);
		} else if (faces.length > 1) {
			faceDetected = false;
			posHoldStart = null;
			posHoldProgress = 0;
			statusText = 'Multiple faces detected — make sure you are alone';
			drawOverlay(false, true, 0);
		} else {
			faceDetected = true;
			const face = faces[0];
			const box = face.box;
			const faceW = Array.isArray(box) ? box[2] : box.bottomRight[0] - box.topLeft[0];
			const faceH = Array.isArray(box) ? box[3] : box.bottomRight[1] - box.topLeft[1];
			const faceCX = Array.isArray(box) ? box[0] + box[2] / 2 : (box.topLeft[0] + box.bottomRight[0]) / 2;
			const faceCY = Array.isArray(box) ? box[1] + box[3] / 2 : (box.topLeft[1] + box.bottomRight[1]) / 2;

			const w = canvasEl.width;
			const h = canvasEl.height;
			const cx = w / 2;
			const cy = h / 2;
			
			const rx = w * 0.22;
			const ry = h * 0.48;

			const centred = Math.abs(faceCX - cx) < rx * 0.5 && Math.abs(faceCY - cy) < ry * 0.5;
			const largeEnough = faceW > w * 0.12 && faceH > h * 0.18;

			if (centred && largeEnough) {
				const now = performance.now();
				if (!posHoldStart) posHoldStart = now;
				posHoldProgress = Math.min(1, (now - posHoldStart) / POS_HOLD_MS);
				statusText = posHoldProgress < 1 ? 'Hold still…' : 'Starting gestures…';
				drawOverlay(true, false, posHoldProgress);

				if (posHoldProgress >= 1) {
					selected = selectGestures(GESTURE_COUNT);
					gestureIndex = 0;
					gesturesDone = 0;
					descriptors = [];
					tracker = new GestureTracker();
					holdProgress = 0;
					confidenceDisplay = 0;
					frameCount = 0;
					phase = 'gesture';
					statusText = selected[0]?.label || '';
					loopHandle = requestAnimationFrame(gestureLoop);
					return;
				}
			} else {
				posHoldStart = null;
				posHoldProgress = 0;
				statusText = centred ? 'Move closer' : 'Centre your face in the oval';
				drawOverlay(true, false, 0);
			}
		}

		loopHandle = requestAnimationFrame(positioningLoop);
	}

	async function gestureLoop() {
		if (stopped || phase !== 'gesture') return;
		frameCount++;
		await detect();
		if (stopped || phase !== 'gesture') return;

		const faces = lastResult?.face ?? [];
		const gestures = lastResult?.gesture ?? [];

		if (faces.length === 0) {
			tracker.reset();
			holdProgress = 0;
			confidenceDisplay = 0;
			statusText = 'Keep your face in the oval';
			drawOverlay(false, false, 0, selected[gestureIndex]?.label);
			loopHandle = requestAnimationFrame(gestureLoop);
			return;
		}
		if (faces.length > 1) {
			tracker.reset();
			holdProgress = 0;
			confidenceDisplay = 0;
			statusText = 'Only one person allowed';
			drawOverlay(false, true, 0);
			loopHandle = requestAnimationFrame(gestureLoop);
			return;
		}

		const face = faces[0];
		const g = selected[gestureIndex];
		if (!g) {
			await finishCapture();
			return;
		}

		// ─── Gesture Detection ─────────────────────────────────────────────
		const confidence = gestureConfidence(g.id, face, gestures);
		confidenceDisplay = confidence;
		
		// Log for debugging (every 10 frames to avoid spam)
		if (frameCount % 10 === 0) {
			console.log(`[Gesture] ${g.label}: confidence=${confidence.toFixed(2)}, holdProgress=${tracker.holdProgress.toFixed(2)}`);
		}

		const confirmed = tracker.update(confidence);
		holdProgress = tracker.holdProgress;

		drawOverlay(true, false, holdProgress, g.label);
		statusText = g.label;

		if (confirmed) {
			console.log(`[Gesture] ✅ ${g.label} confirmed!`);
			if (face.embedding) descriptors.push(Array.from(face.embedding as number[]));
			gesturesDone = gestureIndex + 1;

			if (gesturesDone >= selected.length) {
				await finishCapture();
				return;
			}

			gestureIndex++;
			tracker = new GestureTracker();
			holdProgress = 0;
			confidenceDisplay = 0;
			statusText = selected[gestureIndex]?.label || '';
		}

		loopHandle = requestAnimationFrame(gestureLoop);
	}

	async function finishCapture() {
		stopped = true;
		phase = 'processing';
		statusText = 'Processing…';

		try {
			if (descriptors.length === 0) throw new Error('No face captures collected. Please try again.');

			const dim = descriptors[0].length;
			const averaged = new Array(dim).fill(0);
			for (const d of descriptors) {
				for (let i = 0; i < dim; i++) averaged[i] += d[i] / descriptors.length;
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
		descriptors = [];
		gestureIndex = 0;
		gesturesDone = 0;
		holdProgress = 0;
		posHoldProgress = 0;
		posHoldStart = null;
		faceDetected = false;
		confidenceDisplay = 0;
		frameCount = 0;
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

		<div class="mb-1 flex items-center gap-2">
			<h2 class="text-lg font-semibold">Face enrollment</h2>
			{#if phase === 'gesture'}
				<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
					Step {gesturesDone + 1} of {selected.length}
				</span>
			{/if}
		</div>
		<p class="mb-4 text-sm text-muted-foreground">
			We'll use this to verify your identity before tests and exams.
		</p>

		<div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>
			<canvas bind:this={canvasEl} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>

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

			<!-- Confidence Display (debug) -->
			{#if phase === 'gesture' && confidenceDisplay > 0}
				<div class="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-1 rounded">
					Confidence: {(confidenceDisplay * 100).toFixed(0)}%
				</div>
			{/if}
		</div>

		{#if phase === 'positioning'}
			<div class="mb-3 flex items-center justify-center gap-2 text-sm font-medium">
				{#if faceDetected}
					<CheckCircle2 class="size-4 text-primary" />
					<span class="text-primary">Face detected</span>
				{:else}
					<ScanFace class="size-4 text-muted-foreground" />
					<span class="text-muted-foreground">Looking for face…</span>
				{/if}
			</div>
			{#if faceDetected && posHoldProgress > 0}
				<div class="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
					<div class="h-full bg-primary transition-all" style="width: {posHoldProgress * 100}%"></div>
				</div>
			{/if}
		{/if}

		{#if phase === 'gesture'}
			<div class="mb-3 flex items-center justify-center gap-2">
				{#each selected as _, i}
					<div
						class="h-1.5 rounded-full transition-all duration-300 {i === gestureIndex
							? 'w-6 bg-primary'
							: i < gesturesDone
								? 'w-1.5 bg-primary/40'
								: 'w-1.5 bg-muted'}"
					></div>
				{/each}
			</div>
			<div class="mb-2 flex items-center justify-center gap-2 text-primary">
				{#if selected[gestureIndex]?.icon === 'left'}
					<ArrowLeft class="size-5" />
				{:else if selected[gestureIndex]?.icon === 'right'}
					<ArrowRight class="size-5" />
				{:else if selected[gestureIndex]?.icon === 'blink'}
					<Eye class="size-5" />
				{:else if selected[gestureIndex]?.icon === 'nod'}
					<ChevronUp class="size-5" />
				{:else if selected[gestureIndex]?.icon === 'mouth'}
					<SmilePlus class="size-5" />
				{/if}
			</div>
			{#if holdProgress > 0}
				<div class="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
					<div class="h-full bg-primary transition-all" style="width: {holdProgress * 100}%"></div>
				</div>
			{/if}
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