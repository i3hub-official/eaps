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
	import EyeClosed from '@lucide/svelte/icons/eye-closed';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Smile from '@lucide/svelte/icons/smile';
	import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
	import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';
	import { gestureConfidence } from './gesture-service.js';

	let {
		examId,
		onSuccess,
		onCancel,
	}: { examId: string; onSuccess: () => void; onCancel: () => void } = $props();

	type Phase = 'loading-model' | 'requesting-camera' | 'scanning' | 'stabilizing' | 'checking' | 'success' | 'failed' | 'error';
	type LivenessTask = 'blink' | 'look_left' | 'look_right' | 'nod_up' | 'nod_down' | 'smile';

	let phase = $state<Phase>('loading-model');
	let statusText = $state('Loading face model…');
	let errorMessage = $state('');
	let similarityPercent = $state<number | null>(null);
	let faceDetected = $state(false);
	let verificationProgress = $state(0);

	// ─── Random Tasks ──────────────────────────────────────────────────────
	let tasks: LivenessTask[] = $state<LivenessTask[]>([]);
	let currentTaskIndex = $state(0);
	let completedTasks = $state<LivenessTask[]>([]);
	let taskConfidence = $state<Record<LivenessTask, number>>({
		blink: 0,
		look_left: 0,
		look_right: 0,
		nod_up: 0,
		nod_down: 0,
		smile: 0,
	});

	// ─── Thresholds ────────────────────────────────────────────────────────
	const MATCH_THRESHOLD = 0.65;
	const MIN_FACE_SCORE = 0.6;
	const VERIFICATION_DELAY_MS = 5000;
	const TASK_CONFIRM_FRAMES = 8;
	const MIN_ANTISPOOF = 0.4;
	const MIN_LIVENESS = 0.5;

	// ─── No Face Timeout ──────────────────────────────────────────────────
	const NO_FACE_TIMEOUT_MS = 2.5 * 60 * 1000;
	let noFaceStartTime: number | null = null;
	let faceLostAlertShown = $state(false);
	let faceLostTime: number | null = null;

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let stopped = false;
	let loopHandle: number | null = null;
	let lastResult: any = null;
	let stabilityStartTime: number | null = null;
	let taskFrameCount = 0;
	let previousEarScore: number | null = null;
	let lastBlinkTime: number | null = null;

	// ─── Task Configuration ──────────────────────────────────────────────
	const taskConfig: Record<LivenessTask, { label: string; icon: any; instruction: string }> = {
		blink: { label: 'Blink', icon: EyeClosed, instruction: 'Close both eyes and open' },
		look_left: { label: 'Look Left', icon: ArrowLeft, instruction: 'Turn your head to the left' },
		look_right: { label: 'Look Right', icon: ArrowRight, instruction: 'Turn your head to the right' },
		nod_up: { label: 'Nod Up', icon: ChevronUp, instruction: 'Nod your head up' },
		nod_down: { label: 'Nod Down', icon: ChevronDown, instruction: 'Nod your head down' },
		smile: { label: 'Smile', icon: Smile, instruction: 'Smile at the camera' },
	};

	const TASK_POOL: LivenessTask[] = ['blink', 'look_left', 'look_right', 'nod_up', 'nod_down', 'smile'];

	function selectRandomTasks(count: number = 2): LivenessTask[] {
		const shuffled = [...TASK_POOL].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, count);
	}

	function getTaskIcon(task: LivenessTask): any {
		return taskConfig[task]?.icon || MousePointerClick;
	}

	function getTaskLabel(task: LivenessTask): string {
		return taskConfig[task]?.label || task;
	}

	function getTaskInstruction(task: LivenessTask): string {
		return taskConfig[task]?.instruction || '';
	}

	// ─── Task Detection ──────────────────────────────────────────────────
	function detectTask(task: LivenessTask, face: any): number {
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
				return 0;
		}
	}

	function detectBlink(face: any): number {
		if (!face.mesh || face.mesh.length < 400) return 0;

		const LEFT_EYE_IDX = [33, 160, 158, 133, 153, 144];
		const RIGHT_EYE_IDX = [263, 387, 385, 362, 380, 373];
		const EAR_CLOSED_MAX = 0.25;

		const mesh = face.mesh as number[][];
		const leftEyePoints = LEFT_EYE_IDX.map(i => mesh[i]).filter(Boolean);
		const rightEyePoints = RIGHT_EYE_IDX.map(i => mesh[i]).filter(Boolean);

		if (leftEyePoints.length < 6 || rightEyePoints.length < 6) return 0;

		const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
		const ear = (points: number[][]): number => {
			const v = dist(points[1], points[5]) + dist(points[2], points[4]);
			const h = 2 * dist(points[0], points[3]);
			return h > 0 ? v / h : 1;
		};

		const leftEar = ear(leftEyePoints);
		const rightEar = ear(rightEyePoints);
		const avgEar = (leftEar + rightEar) / 2;

		const isBlinking = avgEar < EAR_CLOSED_MAX;
		
		if (isBlinking) {
			lastBlinkTime = Date.now();
			return 0.9;
		}
		
		// If recently blinked, give partial credit
		if (lastBlinkTime && Date.now() - lastBlinkTime < 2000) {
			return 0.5;
		}
		
		return 0;
	}

	function detectHeadPose(face: any, direction: 'left' | 'right' | 'up' | 'down'): number {
		if (!face.rotation) return 0;

		const yaw = face.rotation.angle?.yaw ?? face.rotation.yaw ?? 0;
		const pitch = face.rotation.angle?.pitch ?? face.rotation.pitch ?? 0;

		switch (direction) {
			case 'left':
				return yaw < -15 ? 0.9 : yaw < -5 ? 0.6 : 0;
			case 'right':
				return yaw > 15 ? 0.9 : yaw > 5 ? 0.6 : 0;
			case 'up':
				return pitch < -10 ? 0.9 : pitch < -3 ? 0.6 : 0;
			case 'down':
				return pitch > 10 ? 0.9 : pitch > 3 ? 0.6 : 0;
			default:
				return 0;
		}
	}

	function detectSmile(face: any): number {
		if (!face.mesh || face.mesh.length < 200) return 0;

		const MOUTH_TOP_IDX = 13;
		const MOUTH_BOT_IDX = 14;
		const CHIN_IDX = 152;
		const FOREHEAD_IDX = 10;

		const mesh = face.mesh as number[][];
		const mTop = mesh[MOUTH_TOP_IDX];
		const mBot = mesh[MOUTH_BOT_IDX];
		const chin = mesh[CHIN_IDX];
		const fore = mesh[FOREHEAD_IDX];

		if (!mTop || !mBot || !chin || !fore) return 0;

		const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
		const mouthH = dist(mTop, mBot);
		const faceH = dist(fore, chin);
		const ratio = faceH > 0 ? mouthH / faceH : 0;

		// Check for smile using expression/emotion if available
		const expression = face.expression || {};
		const emotion = face.emotion || {};
		const smileScore = Math.max(
			expression.smile || 0,
			emotion.happy || 0,
			ratio > 0.04 ? 0.7 : 0
		);

		return smileScore;
	}

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

		// ─── Face Lost Alert Overlay ──────────────────────────────────────
		if (faceLostAlertShown) {
			ctx.save();
			ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
			ctx.fillRect(0, 0, w, h);
			
			ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
			ctx.font = 'bold 18px system-ui';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('⚠️ Face Lost', cx, cy - 30);
			
			ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
			ctx.font = '14px system-ui';
			ctx.fillText('Please look back at the camera', cx, cy + 20);
			
			if (faceLostTime) {
				const elapsed = (Date.now() - faceLostTime) / 1000;
				const remaining = Math.max(0, (NO_FACE_TIMEOUT_MS - elapsed * 1000) / 1000);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
				ctx.font = '12px system-ui';
				ctx.fillText(`${Math.ceil(remaining)}s remaining before timeout`, cx, cy + 55);
			}
			ctx.restore();
		}

		// ─── Task Instruction Overlay ──────────────────────────────────────
		if (phase === 'stabilizing' && tasks.length > 0 && currentTaskIndex < tasks.length) {
			const currentTask = tasks[currentTaskIndex];
			const isCompleted = completedTasks.includes(currentTask);
			
			ctx.save();
			const pillY = h * 0.92;
			const pillH = 40;
			const label = isCompleted 
				? `✅ ${getTaskLabel(currentTask)} done!` 
				: getTaskInstruction(currentTask);
			
			ctx.font = '500 14px system-ui';
			const textW = ctx.measureText(label).width;
			const pillW = Math.min(textW + 44, w * 0.9);
			const pillX = cx - pillW / 2;
			
			ctx.fillStyle = isCompleted 
				? 'rgba(0, 201, 167, 0.2)' 
				: 'rgba(0, 0, 0, 0.7)';
			ctx.strokeStyle = isCompleted ? '#00c9a7' : 'rgba(255,255,255,0.3)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.roundRect(pillX, pillY - pillH / 2, pillW, pillH, pillH / 2);
			ctx.fill();
			ctx.stroke();
			
			ctx.fillStyle = isCompleted ? '#00c9a7' : '#ffffff';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(label, cx, pillY);
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
			currentTaskIndex = 0;
			completedTasks = [];
			taskConfidence = {
				blink: 0,
				look_left: 0,
				look_right: 0,
				nod_up: 0,
				nod_down: 0,
				smile: 0,
			};

			phase = 'scanning';
			statusText = 'Position your face in the oval';
			faceDetected = false;
			faceLostAlertShown = false;
			faceLostTime = null;
			noFaceStartTime = Date.now();
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

		const stabilityPercent = phase === 'stabilizing' && stabilityStartTime
			? Math.min(1, (Date.now() - stabilityStartTime) / VERIFICATION_DELAY_MS)
			: 0;

		verificationProgress = stabilityPercent;

		if (!face) {
			faceDetected = false;
			drawOverlay(false, false);
			stabilityStartTime = null;
			
			if (!faceLostAlertShown) {
				faceLostAlertShown = true;
				faceLostTime = Date.now();
				statusText = '⚠️ Face lost! Please look back at the camera.';
			}
			
			const elapsedSinceNoFace = noFaceStartTime ? Date.now() - noFaceStartTime : 0;
			if (elapsedSinceNoFace >= NO_FACE_TIMEOUT_MS) {
				phase = 'failed';
				statusText = 'Verification timed out. Face not detected for 2.5 minutes.';
				stopCamera();
				return;
			}
		} else if (faces.length > 1) {
			faceDetected = false;
			statusText = 'Multiple faces detected — make sure you are alone';
			drawOverlay(false, true);
			stabilityStartTime = null;
			noFaceStartTime = Date.now();
			if (faceLostAlertShown) {
				faceLostAlertShown = false;
				faceLostTime = null;
			}
		} else if ((face.faceScore ?? 0) < MIN_FACE_SCORE) {
			faceDetected = true;
			statusText = 'Move closer and look directly at the camera';
			drawOverlay(true, false);
			stabilityStartTime = null;
			noFaceStartTime = Date.now();
			if (faceLostAlertShown) {
				faceLostAlertShown = false;
				faceLostTime = null;
			}
		} else if (face.embedding) {
			faceDetected = true;
			drawOverlay(true, false);
			noFaceStartTime = Date.now();
			
			if (faceLostAlertShown) {
				faceLostAlertShown = false;
				faceLostTime = null;
				statusText = 'Face detected!';
			}

			// ─── Task Detection ──────────────────────────────────────────────
			if (phase === 'stabilizing' && tasks.length > 0 && currentTaskIndex < tasks.length) {
				const currentTask = tasks[currentTaskIndex];
				const confidence = detectTask(currentTask, face);
				taskConfidence[currentTask] = confidence;

				const isCompleted = completedTasks.includes(currentTask);

				if (!isCompleted && confidence >= 0.7) {
					taskFrameCount++;
					if (taskFrameCount >= TASK_CONFIRM_FRAMES) {
						completedTasks.push(currentTask);
						currentTaskIndex++;
						taskFrameCount = 0;
						
						if (currentTaskIndex < tasks.length) {
							statusText = getTaskInstruction(tasks[currentTaskIndex]);
						}
					}
				} else if (confidence < 0.5) {
					taskFrameCount = Math.max(0, taskFrameCount - 1);
				}

				// Update status text with task instruction
				if (!isCompleted && currentTaskIndex < tasks.length) {
					statusText = getTaskInstruction(currentTask);
				} else if (currentTaskIndex < tasks.length) {
					statusText = getTaskInstruction(tasks[currentTaskIndex]);
				}
			}

			// ─── All tasks completed ─────────────────────────────────────────
			if (completedTasks.length >= tasks.length && tasks.length > 0) {
				const antispoofScore = face.real ?? face.antispoof ?? 0;
				const livenessScore = 0.9; // All tasks completed
				await checkMatch(face.embedding, antispoofScore, livenessScore);
				return;
			}

			// ─── Start stabilizing ───────────────────────────────────────────
			if (phase === 'scanning' && !stabilityStartTime) {
				phase = 'stabilizing';
				statusText = getTaskInstruction(tasks[0] || 'Hold still…');
				stabilityStartTime = Date.now();
			}
		} else {
			faceDetected = false;
			statusText = 'Processing face...';
			drawOverlay(false, false);
			stabilityStartTime = null;
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
				throw new Error('Liveness check failed — please complete the tasks.');
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
		verificationProgress = 0;
		noFaceStartTime = null;
		faceLostAlertShown = false;
		faceLostTime = null;
		tasks = [];
		completedTasks = [];
		currentTaskIndex = 0;
		taskFrameCount = 0;
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

<!-- ─── Template ────────────────────────────────────────────────────────── -->
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
					{phase === 'stabilizing' ? `Task ${completedTasks.length + 1}/${tasks.length}` : 'Scanning'}
				</span>
			{/if}
		</div>
		<p class="mb-4 text-sm text-muted-foreground">Look directly at the camera and follow the instructions.</p>

		<div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
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

			<!-- Task Progress Overlay -->
			{#if phase === 'stabilizing' && tasks.length > 0}
				<div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
					{#each tasks as task, index}
						<div class="flex items-center gap-1">
							{#if completedTasks.includes(task)}
								<CheckCircle2 class="size-4 text-primary" />
							{:else if index === currentTaskIndex}
								<svelte:component this={getTaskIcon(task)} class="size-4 text-white animate-pulse" />
							{:else}
								<div class="size-2 rounded-full bg-white/20" />
							{/if}
						</div>
					{/each}
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

		<!-- Face Lost Alert -->
		{#if faceLostAlertShown}
			<div class="mb-3 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
				<AlertCircle class="size-4 shrink-0" />
				<span>
					<strong>Face lost!</strong> Please look back at the camera.
					{#if faceLostTime}
						{(() => {
							const elapsed = (Date.now() - faceLostTime) / 1000;
							const remaining = Math.max(0, (NO_FACE_TIMEOUT_MS - elapsed * 1000) / 1000);
							return remaining > 0 ? ` (${Math.ceil(remaining)}s remaining)` : '';
						})()}
					{/if}
				</span>
			</div>
		{/if}

		<!-- Task Status -->
		{#if phase === 'scanning' || phase === 'stabilizing'}
			<div class="mb-3 space-y-2">
				<div class="flex items-center justify-center gap-2 text-sm font-medium">
					{#if faceDetected}
						<CheckCircle2 class="size-4 text-primary" />
						<span class="text-primary">Face detected</span>
					{:else}
						<ScanFace class="size-4 text-muted-foreground" />
						<span class="text-muted-foreground">{faceLostAlertShown ? 'Face lost!' : 'Looking for face…'}</span>
					{/if}
				</div>

				{#if phase === 'stabilizing' && tasks.length > 0 && currentTaskIndex < tasks.length}
					<div class="flex items-center justify-center gap-3">
						<svelte:component this={getTaskIcon(tasks[currentTaskIndex])} class="size-6 text-primary" />
						<span class="text-sm font-medium text-muted-foreground">
							{completedTasks.includes(tasks[currentTaskIndex]) 
								? '✅ Done!' 
								: getTaskInstruction(tasks[currentTaskIndex])}
						</span>
					</div>
				{/if}

				{#if completedTasks.length > 0}
					<div class="flex justify-center gap-1 text-xs text-muted-foreground">
						<span>Completed:</span>
						{#each completedTasks as task, index}
							<span class="flex items-center gap-0.5">
								{getTaskLabel(task)}
								{#if index < completedTasks.length - 1}•{/if}
							</span>
						{/each}
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