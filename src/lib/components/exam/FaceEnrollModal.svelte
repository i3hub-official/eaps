<!-- src/lib/components/exam/FaceVerifyModal.svelte -->
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
	import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';

	let {
		examId,
		onSuccess,
		onCancel,
	}: { examId: string; onSuccess: () => void; onCancel: () => void } = $props();

	type Phase =
		| 'loading-model'
		| 'requesting-camera'
		| 'positioning'
		| 'gesture'
		| 'checking'
		| 'success'
		| 'failed'
		| 'error';

	type LivenessTask = 'blink' | 'look_left' | 'look_right' | 'nod_up' | 'nod_down' | 'smile';

	let phase = $state<Phase>('loading-model');
	let errorMessage = $state('');
	let statusText = $state('Loading face model…');
	let faceDetected = $state(false);
	let similarityPercent = $state<number | null>(null);
	let verificationProgress = $state(0);

	// ─── Random Tasks ──────────────────────────────────────────────────────
	let tasks: LivenessTask[] = $state<LivenessTask[]>([]);
	let taskIndex = $state(0);
	let tasksDone = $state(0);
	let taskFrameCount = $state(0);

	// ─── Positioning Hold ──────────────────────────────────────────────────
	let posHoldProgress = $state(0);
	let posHoldStart: number | null = null;
	const POS_HOLD_MS = 1000;

	// ─── Thresholds ────────────────────────────────────────────────────────
	const MATCH_THRESHOLD = 0.65;
	const MIN_FACE_SCORE = 0.6;
	const TASK_CONFIRM_FRAMES = 10;
	const MIN_ANTISPOOF = 0.4;

	// ─── No Face Timeout ──────────────────────────────────────────────────
	const NO_FACE_TIMEOUT_MS = 2.5 * 60 * 1000;
	let noFaceStartTime: number | null = null;

	// ─── DOM Refs ─────────────────────────────────────────────────────────
	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let loopHandle: number | null = null;
	let stopped = false;
	let lastResult: any = null;
	let previousEarScore: number | null = null;
	let lastBlinkTime: number | null = null;
	let taskCompleted = false;

	// ─── Task Configuration ──────────────────────────────────────────────
	const taskConfig: Record<LivenessTask, { label: string; icon: any }> = {
		blink: { label: 'Blink', icon: Eye },
		look_left: { label: 'Look Left', icon: ArrowLeft },
		look_right: { label: 'Look Right', icon: ArrowRight },
		nod_up: { label: 'Nod Up', icon: ChevronUp },
		nod_down: { label: 'Nod Down', icon: ChevronUp },
		smile: { label: 'Smile', icon: SmilePlus },
	};

	const TASK_POOL: LivenessTask[] = ['blink', 'look_left', 'look_right', 'nod_up', 'nod_down', 'smile'];

	function selectRandomTasks(count: number = 2): LivenessTask[] {
		const shuffled = [...TASK_POOL].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, count);
	}

	function getTaskIcon(task: LivenessTask): any {
		return taskConfig[task]?.icon || Eye;
	}

	function getTaskLabel(task: LivenessTask): string {
		return taskConfig[task]?.label || task;
	}

	// ─── Task Detection ──────────────────────────────────────────────────
	function detectTask(task: LivenessTask, face: any): boolean {
		switch (task) {
			case 'blink':
				return detectBlink(face);
			case 'look_left':
				return detectHeadPose(face, 'left');
			case 'look_right':
				return detectHeadPose(face, 'right');
			case 'nod_up':
				return detectHeadPose(face, 'up');
			case 'nod_down':
				return detectHeadPose(face, 'down');
			case 'smile':
				return detectSmile(face);
			default:
				return false;
		}
	}

	function detectBlink(face: any): boolean {
		if (!face.mesh || face.mesh.length < 400) return false;

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

		// Blink detected: eyes are currently closed
		const isBlinking = avgEar < EAR_CLOSED_MAX;
		
		if (isBlinking) {
			lastBlinkTime = Date.now();
			return true;
		}
		
		// If recently blinked (within 2 seconds), count it as a blink
		if (lastBlinkTime && Date.now() - lastBlinkTime < 2000) {
			return true;
		}
		
		return false;
	}

	function detectHeadPose(face: any, direction: 'left' | 'right' | 'up' | 'down'): boolean {
		if (!face.rotation) return false;

		const yaw = face.rotation.angle?.yaw ?? face.rotation.yaw ?? 0;
		const pitch = face.rotation.angle?.pitch ?? face.rotation.pitch ?? 0;

		switch (direction) {
			case 'left':
				return yaw < -15;
			case 'right':
				return yaw > 15;
			case 'up':
				return pitch < -10;
			case 'down':
				return pitch > 10;
			default:
				return false;
		}
	}

	function detectSmile(face: any): boolean {
		if (!face.mesh || face.mesh.length < 200) return false;

		const MOUTH_TOP_IDX = 13;
		const MOUTH_BOT_IDX = 14;
		const CHIN_IDX = 152;
		const FOREHEAD_IDX = 10;

		const mesh = face.mesh as number[][];
		const mTop = mesh[MOUTH_TOP_IDX];
		const mBot = mesh[MOUTH_BOT_IDX];
		const chin = mesh[CHIN_IDX];
		const fore = mesh[FOREHEAD_IDX];

		if (!mTop || !mBot || !chin || !fore) return false;

		const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
		const mouthH = dist(mTop, mBot);
		const faceH = dist(fore, chin);
		const ratio = faceH > 0 ? mouthH / faceH : 0;

		const expression = face.expression || {};
		const emotion = face.emotion || {};
		
		return (
			(expression.smile || 0) > 0.5 ||
			(emotion.happy || 0) > 0.5 ||
			ratio > 0.045
		);
	}

	// ─── Theme Colors ────────────────────────────────────────────────────
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

			// Select random tasks
			tasks = selectRandomTasks(2);
			taskIndex = 0;
			tasksDone = 0;
			taskFrameCount = 0;
			taskCompleted = false;

			phase = 'positioning';
			statusText = 'Centre your face in the oval';
			posHoldStart = null;
			posHoldProgress = 0;
			noFaceStartTime = Date.now();
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
			
			const elapsedSinceNoFace = noFaceStartTime ? Date.now() - noFaceStartTime : 0;
			if (elapsedSinceNoFace >= NO_FACE_TIMEOUT_MS) {
				phase = 'failed';
				statusText = 'Verification timed out. Face not detected for 2.5 minutes.';
				stopCamera();
				return;
			}
		} else if (faces.length > 1) {
			faceDetected = false;
			posHoldStart = null;
			posHoldProgress = 0;
			statusText = 'Multiple faces detected — make sure you are alone';
			drawOverlay(false, true, 0);
			noFaceStartTime = Date.now();
		} else {
			faceDetected = true;
			noFaceStartTime = Date.now();
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
				statusText = posHoldProgress < 1 ? 'Hold still…' : 'Starting verification…';
				drawOverlay(true, false, posHoldProgress);

				if (posHoldProgress >= 1 && face.embedding) {
					phase = 'gesture';
					taskIndex = 0;
					tasksDone = 0;
					taskFrameCount = 0;
					taskCompleted = false;
					statusText = getTaskLabel(tasks[0]);
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
		await detect();
		if (stopped || phase !== 'gesture') return;

		const faces = lastResult?.face ?? [];
		const face = faces[0];

		// Check for face loss
		if (faces.length === 0) {
			taskFrameCount = 0;
			statusText = 'Keep your face in the oval';
			drawOverlay(false, false, 0, getTaskLabel(tasks[tasksDone] || 'Complete tasks'));
			loopHandle = requestAnimationFrame(gestureLoop);
			return;
		}
		
		if (faces.length > 1) {
			taskFrameCount = 0;
			statusText = 'Only one person allowed';
			drawOverlay(false, true, 0);
			loopHandle = requestAnimationFrame(gestureLoop);
			return;
		}

		if (!face?.embedding) {
			statusText = 'Processing face...';
			drawOverlay(true, false, 0);
			loopHandle = requestAnimationFrame(gestureLoop);
			return;
		}

		faceDetected = true;

		// Check if all tasks are done
		if (tasksDone >= tasks.length) {
			// All tasks completed - proceed to verification
			const antispoofScore = face.real ?? face.antispoof ?? 0;
			await checkMatch(face.embedding, antispoofScore);
			return;
		}

		const currentTask = tasks[tasksDone];
		const isTaskDetected = detectTask(currentTask, face);

		if (isTaskDetected) {
			taskFrameCount++;
			const progress = Math.min(1, taskFrameCount / TASK_CONFIRM_FRAMES);
			drawOverlay(true, false, progress, getTaskLabel(currentTask));
			
			if (taskFrameCount >= TASK_CONFIRM_FRAMES) {
				// Task completed
				tasksDone++;
				taskFrameCount = 0;
				
				if (tasksDone < tasks.length) {
					// Move to next task
					statusText = getTaskLabel(tasks[tasksDone]);
					drawOverlay(true, false, 0, getTaskLabel(tasks[tasksDone]));
				} else {
					// All tasks done - will be handled in next loop iteration
					statusText = 'All tasks complete!';
					drawOverlay(true, false, 1, 'Complete!');
				}
			}
		} else {
			// Task not detected - reset progress
			taskFrameCount = Math.max(0, taskFrameCount - 1);
			const progress = taskFrameCount / TASK_CONFIRM_FRAMES;
			drawOverlay(true, false, progress, getTaskLabel(currentTask));
			statusText = getTaskLabel(currentTask);
		}

		loopHandle = requestAnimationFrame(gestureLoop);
	}

	async function checkMatch(liveEmbedding: number[], antispoofScore: number) {
		stopped = true;
		phase = 'checking';
		statusText = 'Verifying…';

		try {
			if (antispoofScore < MIN_ANTISPOOF) {
				throw new Error('Spoof check failed — please use your own live camera feed.');
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
					livenessScore: 90,
					examId,
				}),
			});

			if (verified) {
				phase = 'success';
				stopCamera();
				setTimeout(() => onSuccess(), 1200);
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
		tasks = [];
		taskIndex = 0;
		tasksDone = 0;
		taskFrameCount = 0;
		taskCompleted = false;
		posHoldProgress = 0;
		posHoldStart = null;
		noFaceStartTime = null;
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
			<h2 class="text-lg font-semibold">Verify your identity</h2>
			{#if phase === 'gesture'}
				<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
					Step {tasksDone + 1} of {tasks.length}
				</span>
			{/if}
		</div>
		<p class="mb-4 text-sm text-muted-foreground">
			Look directly at the camera and follow the instructions.
		</p>

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
				{#each tasks as _, i}
					<div
						class="h-1.5 rounded-full transition-all duration-300 {i === tasksDone
							? 'w-6 bg-primary'
							: i < tasksDone
								? 'w-1.5 bg-primary/40'
								: 'w-1.5 bg-muted'}"
					></div>
				{/each}
			</div>
			<div class="mb-2 flex items-center justify-center gap-2 text-primary">
				{#if tasks[tasksDone] === 'look_left'}
					<ArrowLeft class="size-5" />
				{:else if tasks[tasksDone] === 'look_right'}
					<ArrowRight class="size-5" />
				{:else if tasks[tasksDone] === 'blink'}
					<Eye class="size-5" />
				{:else if tasks[tasksDone] === 'nod_up' || tasks[tasksDone] === 'nod_down'}
					<ChevronUp class="size-5" />
				{:else if tasks[tasksDone] === 'smile'}
					<SmilePlus class="size-5" />
				{/if}
			</div>
			<div class="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
				<div class="h-full bg-primary transition-all" style="width: {Math.min(100, (taskFrameCount / TASK_CONFIRM_FRAMES) * 100)}%"></div>
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