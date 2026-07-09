<!-- src/lib/components/exam/FaceEnrollModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { 
		Dialog, 
		DialogContent, 
		DialogHeader, 
		DialogTitle, 
		DialogDescription,
		DialogFooter 
	} from '$lib/components/ui/dialog/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import User from '@lucide/svelte/icons/user';
	import { getHuman } from '$lib/client/face/human.js';
	import { 
		selectGestures, 
		gestureConfidence, 
		GestureTracker, 
		createTrackerForGesture,
		type GestureDefinition 
	} from './gesture-service.js';
	import { cn } from '$lib/utils.js';

	let { open, onOpenChange, onSuccess }: { 
		open: boolean; 
		onOpenChange?: (open: boolean) => void;
		onSuccess?: () => void; 
	} = $props();

	type Phase = 'loading-model' | 'requesting-camera' | 'positioning' | 'gesture' | 'processing' | 'success' | 'error';

	let phase = $state<Phase>('loading-model');
	let errorMessage = $state('');
	let statusText = $state('Loading face model…');
	let loadingProgress = $state(0);

	// Gesture state
	let selectedGestures: GestureDefinition[] = [];
	let gestureIndex = $state(0);
	let gesturesDone = $state(0);
	let holdProgress = $state(0);
	let tracker = new GestureTracker();

	// Positioning state
	let faceDetected = $state(false);
	let posHoldProgress = $state(0);
	let posHoldStart: number | null = null;
	const POS_HOLD_MS = 1000;

	// Camera refs
	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let loopHandle: number | null = null;
	let capturedDescriptors: number[][] = [];
	let stopped = false;

	// Detection throttle
	const DETECT_INTERVAL = 80;
	let lastDetectAt = 0;
	let lastResult: any = null;

	async function runDetect(): Promise<void> {
		if (!human || !videoEl || videoEl.paused || !videoEl.videoWidth) return;
		const now = performance.now();
		if (now - lastDetectAt < DETECT_INTERVAL) return;
		lastDetectAt = now;
		try {
			lastResult = await human.detect(videoEl);
		} catch {
			lastResult = null;
		}
	}

	async function start() {
		try {
			phase = 'loading-model';
			statusText = 'Loading face model…';
			const loadInterval = setInterval(() => {
				if (loadingProgress < 88) loadingProgress += 6;
			}, 180);
			
			human = await getHuman();
			clearInterval(loadInterval);
			loadingProgress = 100;

			phase = 'requesting-camera';
			statusText = 'Requesting camera access…';
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
				audio: false,
			});

			if (!videoEl) throw new Error('Video element not ready.');
			videoEl.srcObject = stream;
			await videoEl.play();

			phase = 'positioning';
			statusText = 'Position your face in the frame';
			faceDetected = false;
			runPositioningLoop();
		} catch (err) {
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Could not access the camera.';
		}
	}

	async function runPositioningLoop() {
		if (stopped || phase !== 'positioning') return;

		await runDetect();
		const faces = lastResult?.face ?? [];

		if (faces.length === 0) {
			faceDetected = false;
			posHoldStart = null;
			posHoldProgress = 0;
			statusText = 'Move closer and centre your face in the frame';
			loopHandle = requestAnimationFrame(runPositioningLoop);
			return;
		}

		if (faces.length > 1) {
			faceDetected = false;
			posHoldStart = null;
			posHoldProgress = 0;
			statusText = 'Only one person allowed in the frame';
			loopHandle = requestAnimationFrame(runPositioningLoop);
			return;
		}

		const face = faces[0];
		faceDetected = true;

		// Check if face is properly positioned
		const box = face.box;
		const faceW = Array.isArray(box) ? box[2] : box.bottomRight[0] - box.topLeft[0];
		const faceH = Array.isArray(box) ? box[3] : box.bottomRight[1] - box.topLeft[1];
		const faceCX = Array.isArray(box) ? box[0] + box[2] / 2 : (box.topLeft[0] + box.bottomRight[0]) / 2;
		const faceCY = Array.isArray(box) ? box[1] + box[3] / 2 : (box.topLeft[1] + box.bottomRight[1]) / 2;

		const canvas = document.querySelector('canvas');
		if (!canvas) return;
		
		const cx = canvas.width / 2, cy = canvas.height / 2;
		const rx = canvas.width * 0.28, ry = canvas.height * 0.44;

		const centred = Math.abs(faceCX - cx) < rx * 0.5 && Math.abs(faceCY - cy) < ry * 0.5;
		const largeEnough = faceW > canvas.width * 0.15 && faceH > canvas.height * 0.2;

		if (centred && largeEnough) {
			const now = performance.now();
			if (!posHoldStart) posHoldStart = now;
			posHoldProgress = Math.min(1, (now - posHoldStart) / POS_HOLD_MS);
			statusText = posHoldProgress < 1 ? 'Hold still…' : 'Starting gestures…';

			if (posHoldProgress >= 1) {
				selectedGestures = selectGestures(3);
				gestureIndex = 0;
				gesturesDone = 0;
				capturedDescriptors = [];
				tracker = createTrackerForGesture(selectedGestures[0].id);
				holdProgress = 0;
				phase = 'gesture';
				statusText = selectedGestures[0].label;
				if (loopHandle) cancelAnimationFrame(loopHandle);
				loopHandle = requestAnimationFrame(runGestureLoop);
				return;
			}
		} else {
			posHoldStart = null;
			posHoldProgress = 0;
			statusText = centred ? 'Move closer to the camera' : 'Centre your face in the frame';
		}

		loopHandle = requestAnimationFrame(runPositioningLoop);
	}

	async function runGestureLoop() {
		if (stopped || phase !== 'gesture') return;

		await runDetect();
		const faces = lastResult?.face ?? [];
		const gestures = lastResult?.gesture ?? [];

		if (faces.length === 0) {
			tracker.reset();
			holdProgress = 0;
			statusText = 'Keep your face in the frame';
			loopHandle = requestAnimationFrame(runGestureLoop);
			return;
		}

		if (faces.length > 1) {
			tracker.reset();
			holdProgress = 0;
			statusText = 'Only one person allowed';
			loopHandle = requestAnimationFrame(runGestureLoop);
			return;
		}

		const face = faces[0];
		const g = selectedGestures[gestureIndex];

		if (!g) {
			finishEnrollment();
			return;
		}

		const confidence = gestureConfidence(g.id, face, gestures);
		const confirmed = tracker.update(confidence);
		holdProgress = tracker.holdProgress;
		statusText = g.label;

		if (confirmed) {
			const embedding = face.embedding ? Array.from(face.embedding as number[]) : null;
			if (embedding && embedding.length > 0) {
				capturedDescriptors.push(embedding);
			}

			gesturesDone = gestureIndex + 1;

			if (gesturesDone >= selectedGestures.length) {
				finishEnrollment();
				return;
			}

			gestureIndex++;
			tracker = createTrackerForGesture(selectedGestures[gestureIndex].id);
			holdProgress = 0;
			statusText = selectedGestures[gestureIndex].label;
		}

		loopHandle = requestAnimationFrame(runGestureLoop);
	}

	async function finishEnrollment() {
		if (capturedDescriptors.length === 0) {
			phase = 'error';
			errorMessage = 'No face captures collected. Please try again.';
			return;
		}
		phase = 'processing';
		statusText = 'Processing…';
		stopCamera();
		await submitEnrollment();
	}

	async function submitEnrollment() {
		try {
			const dim = capturedDescriptors[0].length;
			const averaged = new Array(dim).fill(0);
			for (const d of capturedDescriptors) {
				for (let i = 0; i < dim; i++) averaged[i] += d[i] / capturedDescriptors.length;
			}

			const res = await fetch('/api/face/enroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					descriptor: averaged,
					embedding_dimension: averaged.length,
					samples: capturedDescriptors.length
				}),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || 'Enrollment failed. Please try again.');
			}

			phase = 'success';
			statusText = 'Face enrolled successfully!';
			setTimeout(() => {
				onSuccess?.();
				onOpenChange?.(false);
			}, 1500);
		} catch (err) {
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Enrollment failed.';
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
		gesturesDone = 0;
		gestureIndex = 0;
		holdProgress = 0;
		posHoldProgress = 0;
		posHoldStart = null;
		faceDetected = false;
		stopped = false;
		start();
	}

	function handleCancel() {
		stopCamera();
		onOpenChange?.(false);
	}

	onMount(() => {
		if (open) start();
	});

	onDestroy(stopCamera);

	$effect(() => {
		if (open) {
			start();
		} else {
			stopCamera();
		}
	});

	const currentGestureLabel = $derived(
		phase === 'gesture' && selectedGestures[gestureIndex] 
			? selectedGestures[gestureIndex].label 
			: ''
	);

	const totalSteps = $derived(selectedGestures.length || 3);
</script>

<Dialog open={open} onOpenChange={onOpenChange}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<User class="size-5" />
				Face Enrollment
			</DialogTitle>
			<DialogDescription>
				We'll verify you're a real person by asking you to perform 
				<strong>3 simple gestures</strong> in front of your camera.
			</DialogDescription>
		</DialogHeader>

		<div class="relative aspect-video overflow-hidden rounded-lg bg-black">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video 
				bind:this={videoEl} 
				class="h-full w-full -scale-x-100 object-cover" 
				muted 
				playsinline
			></video>
			
			<!-- Overlay canvas for visual feedback -->
			<canvas 
				bind:this={canvasEl}
				class="absolute inset-0 h-full w-full pointer-events-none"
			></canvas>

			{#if phase === 'loading-model' || phase === 'requesting-camera' || phase === 'processing'}
				<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
					<Loader2 class="size-8 animate-spin text-white" />
					<p class="text-sm text-white/80">{statusText}</p>
					{#if phase === 'loading-model' && loadingProgress < 100}
						<div class="w-32 h-1 rounded-full bg-white/20 overflow-hidden">
							<div 
								class="h-full bg-primary transition-all duration-300"
								style="width: {loadingProgress}%"
							></div>
						</div>
					{/if}
				</div>
			{/if}

			{#if phase === 'success'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<div class="flex flex-col items-center gap-2">
						<CheckCircle2 class="size-12 text-primary" />
						<p class="text-sm font-medium text-white">Enrolled!</p>
					</div>
				</div>
			{/if}

			{#if phase === 'error'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<div class="flex flex-col items-center gap-2">
						<AlertCircle class="size-12 text-destructive" />
						<p class="text-sm font-medium text-white">Error</p>
					</div>
				</div>
			{/if}

			{#if phase === 'positioning' || phase === 'gesture'}
				<!-- Status badge -->
				<div class="absolute left-1/2 top-3 -translate-x-1/2">
					<Badge 
						variant={faceDetected ? 'default' : 'secondary'}
						class={cn(
							"px-3 py-1",
							faceDetected && "bg-primary/90"
						)}
					>
						{#if phase === 'positioning'}
							{faceDetected ? '✓ Face detected' : '⟳ Searching...'}
						{:else}
							🎯 {gesturesDone + 1}/{totalSteps}
						{/if}
					</Badge>
				</div>

				<!-- Gesture label -->
				{#if phase === 'gesture' && currentGestureLabel}
					<div class="absolute bottom-4 left-1/2 -translate-x-1/2">
						<div class="rounded-full bg-background/80 backdrop-blur-sm px-4 py-2 border border-border">
							<span class="text-sm font-medium">{currentGestureLabel}</span>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		{#if phase === 'positioning' || phase === 'gesture'}
			<div class="space-y-3">
				{#if phase === 'positioning'}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Positioning</span>
						<span class="text-muted-foreground">{Math.round(posHoldProgress * 100)}%</span>
					</div>
					<Progress value={posHoldProgress * 100} class="h-2" />
				{:else}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Gesture {gesturesDone + 1} of {totalSteps}</span>
						<span class="text-muted-foreground">{Math.round(holdProgress * 100)}%</span>
					</div>
					<Progress value={holdProgress * 100} class="h-2" />
				{/if}
				
				<p class="text-center text-sm text-muted-foreground">{statusText}</p>
			</div>
		{/if}

		{#if phase === 'error'}
			<div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
				<div class="flex items-start gap-2 text-sm text-destructive">
					<AlertCircle class="mt-0.5 size-4 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			</div>
		{/if}

		<DialogFooter class="gap-2">
			{#if phase === 'error'}
				<Button variant="outline" onclick={handleCancel} class="flex-1">
					Cancel
				</Button>
				<Button onclick={retry} class="flex-1">
					Try Again
				</Button>
			{:else if phase !== 'success' && phase !== 'processing'}
				<Button variant="outline" onclick={handleCancel} class="w-full">
					Cancel
				</Button>
			{/if}
		</DialogFooter>
	</DialogContent>
</Dialog>