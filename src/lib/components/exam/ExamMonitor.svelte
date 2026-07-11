<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Eye from '@lucide/svelte/icons/eye';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Wifi from '@lucide/svelte/icons/wifi';
	import Clock from '@lucide/svelte/icons/clock';
	import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';

	let { sessionId }: { sessionId: string } = $props();

	// ─── Face Monitoring ──────────────────────────────────────────────────────
	const FACE_CHECK_INTERVAL_MS = 8000;
	const NO_FACE_STRIKES_BEFORE_LOG = 2;
	const FACE_MATCH_THRESHOLD = 0.7;

	// ─── Other Violations ────────────────────────────────────────────────────
	const VIOLATION_COOLDOWN: Record<string, number> = {
		FOCUS_LOSS: 5000,
		NETWORK_DROP: 10000,
		FACE_NOT_DETECTED: 8000,
		FULLSCREEN_EXIT: 15000,
		TAB_SWITCH: 15000,
		DEVTOOLS_OPEN: 30000,
		COPY_ATTEMPT: 10000,
		PASTE_ATTEMPT: 10000,
	};

	type Status = 'ok' | 'warning' | 'violation';
	type AlertType = 'face' | 'tab' | 'fullscreen' | 'devtools' | 'clipboard' | 'network' | 'idle';

	let status = $state<Status>('ok');
	let alerts = $state<Array<{ id: string; type: AlertType; message: string; severity: number; timestamp: number }>>([]);
	let violationCount = $state(0);
	let cameraReady = $state(false);

	// Face monitoring
	let videoEl = $state<HTMLVideoElement | null>(null);
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let enrolledDescriptor: number[] | null = null;
	let faceIntervalHandle: ReturnType<typeof setInterval> | null = null;
	let noFaceStrikes = 0;
	let stopped = false;
	const lastLoggedAt: Record<string, number> = {};

	// Other violation tracking
	let isFullscreen = false;
	let devtoolsOpen = false;
	let idleTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
	const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

	function canLog(type: string): boolean {
		const last = lastLoggedAt[type] ?? 0;
		const cooldown = VIOLATION_COOLDOWN[type] ?? 5000;
		if (Date.now() - last < cooldown) return false;
		lastLoggedAt[type] = Date.now();
		return true;
	}

	async function logViolation(type: string, severity: number, metadata?: Record<string, unknown>) {
		if (!canLog(type)) return;

		violationCount++;
		status = severity >= 3 ? 'violation' : 'warning';

		try {
			const res = await fetch(`/api/assessment/session/${sessionId}/violation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId, type, severity, metadata }),
			});

			if (!res.ok) {
				console.error(`[Violation] Failed to log ${type}`);
			}
		} catch (err) {
			console.error(`[Violation] Error logging ${type}:`, err);
		}

		if (severity >= 3) {
			showAlert(type as AlertType, 'Critical violation detected', severity);
		}
	}

	function showAlert(type: AlertType, message: string, severity: number) {
		const id = `${type}-${Date.now()}`;
		alerts.push({ id, type, message, severity, timestamp: Date.now() });

		setTimeout(() => {
			alerts = alerts.filter(a => a.id !== id);
		}, 8000);
	}

	// ─── Face Monitoring ──────────────────────────────────────────────────────
	async function initFaceMonitoring() {
		try {
			human = await getHuman();
			if (stopped) return;

			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
				audio: false,
			});

			if (stopped) {
				stream?.getTracks().forEach(t => t.stop());
				return;
			}

			if (videoEl) {
				videoEl.srcObject = stream;
				await videoEl.play();
				cameraReady = true;
			}

			const descRes = await fetch('/api/face/descriptor');
			if (descRes.ok) {
				const data = await descRes.json();
				enrolledDescriptor = data.descriptor;
			}

			faceIntervalHandle = setInterval(runFaceCheck, FACE_CHECK_INTERVAL_MS);
		} catch (err) {
			console.error('[ExamMonitor] Face monitoring init failed:', err);
			showAlert('face', 'Camera unavailable', 1);
		}
	}

	async function runFaceCheck() {
		if (!human || !videoEl || stopped) return;

		try {
			const result = await human.detect(videoEl);
			if (stopped) return;

			if (!result?.face || result.face.length === 0) {
				noFaceStrikes++;
				status = 'warning';

				if (noFaceStrikes >= NO_FACE_STRIKES_BEFORE_LOG && canLog('FACE_NOT_DETECTED')) {
					status = 'violation';
					showAlert('face', 'Face not detected — stay in view of camera', 3);
					await logViolation('FACE_NOT_DETECTED', 3);
				}
				return;
			}

			noFaceStrikes = 0;

			if (result.face.length > 1) {
				if (canLog('MULTIPLE_FACES')) {
					status = 'violation';
					showAlert('face', 'Multiple faces detected', 3);
					await logViolation('MULTIPLE_FACES', 3, { count: result.face.length });
				}
				return;
			}

			const face = result.face[0];
			if (enrolledDescriptor && face.embedding) {
				const similarity = cosineSimilarity(face.embedding, enrolledDescriptor);
				if (similarity < FACE_MATCH_THRESHOLD) {
					if (canLog('FACE_MISMATCH')) {
						status = 'violation';
						showAlert('face', 'Face does not match enrolled profile', 3);
						await logViolation('FACE_MISMATCH', 3, { similarity: Math.round(similarity * 100) });
					}
					return;
				}
			}

			status = 'ok';
		} catch (err) {
			console.error('[ExamMonitor] Face check error:', err);
		}
	}

	// ─── Fullscreen Monitoring ────────────────────────────────────────────────
	function handleFullscreenChange() {
		const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

		if (isFullscreen && !isCurrentlyFullscreen) {
			status = 'warning';
			showAlert('fullscreen', 'Exam exited fullscreen', 2);
			logViolation('FULLSCREEN_EXIT', 2);
		}

		isFullscreen = isCurrentlyFullscreen;
	}

	// ─── Tab/Window Switch Monitoring ────────────────────────────────────────
	function handleVisibilityChange() {
		if (document.hidden) {
			status = 'violation';
			showAlert('tab', 'You switched to another tab', 2);
			logViolation('TAB_SWITCH', 2);
		}
	}

	function handleFocusChange() {
		if (!document.hasFocus()) {
			status = 'warning';
			showAlert('tab', 'Window lost focus', 1);
			logViolation('FOCUS_LOSS', 1);
		}
	}

	// ─── DevTools Detection ───────────────────────────────────────────────────
	function detectDevTools() {
		const threshold = 160;
		if (
			window.outerHeight - window.innerHeight > threshold ||
			window.outerWidth - window.innerWidth > threshold
		) {
			if (!devtoolsOpen && canLog('DEVTOOLS_OPEN')) {
				devtoolsOpen = true;
				status = 'violation';
				showAlert('devtools', 'Developer tools detected', 3);
				logViolation('DEVTOOLS_OPEN', 3);
			}
		} else {
			devtoolsOpen = false;
		}
	}

	// ─── Copy/Paste Detection ────────────────────────────────────────────────
	function handleCopy(e: ClipboardEvent) {
		e.preventDefault();
		showAlert('clipboard', 'Copy disabled during exam', 1);
		logViolation('COPY_ATTEMPT', 1);
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		showAlert('clipboard', 'Paste disabled during exam', 1);
		logViolation('PASTE_ATTEMPT', 1);
	}

	// ─── Keyboard Shortcut Prevention ────────────────────────────────────────
	// Note: this only intercepts modifier-key combos and F-keys, so it does
	// not conflict with the plain A–D / Y / N / R answer shortcuts handled
	// in the exam page itself.
	function handleKeyDown(e: KeyboardEvent) {
		const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
		const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

		const dangerousShortcuts = ['c', 'x', 'v', 's', 'p', 'q', 't', 'n', 'w'];
		const isShiftTab = e.shiftKey && e.key === 'Tab';

		if (ctrlOrCmd && dangerousShortcuts.includes(e.key.toLowerCase())) {
			e.preventDefault();
			logViolation('KEYBOARD_SHORTCUT', 1, { key: `Ctrl+${e.key}` });
			return;
		}

		if (isShiftTab) {
			e.preventDefault();
			logViolation('KEYBOARD_SHORTCUT', 1, { key: 'Shift+Tab' });
			return;
		}

		if (
			e.key === 'F12' ||
			e.key === 'F11' ||
			(ctrlOrCmd && e.shiftKey && ['i', 'j', 'k', 'c'].includes(e.key.toLowerCase()))
		) {
			e.preventDefault();
			logViolation('DEVTOOLS_OPEN', 3, { key: e.key });
			return;
		}
	}

	// ─── Idle Detection ───────────────────────────────────────────────────────
	function resetIdleTimer() {
		if (idleTimeoutHandle) clearTimeout(idleTimeoutHandle);

		idleTimeoutHandle = setTimeout(() => {
			showAlert('idle', 'Exam paused due to inactivity', 1);
			logViolation('IDLE_TIMEOUT', 1);
		}, IDLE_TIMEOUT_MS);
	}

	// ─── Network Detection ────────────────────────────────────────────────────
	function handleOnline() {
		if (!navigator.onLine) return;
		status = 'ok';
	}

	function handleOffline() {
		status = 'warning';
		showAlert('network', 'Lost internet connection', 1);
		logViolation('NETWORK_DROP', 1);
	}

	// ─── Initialization ───────────────────────────────────────────────────────
	async function init() {
		stopped = false;
		await initFaceMonitoring();

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleFocusChange);
		window.addEventListener('blur', handleFocusChange);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('copy', handleCopy);
		document.addEventListener('paste', handlePaste);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('mousemove', resetIdleTimer);
		document.addEventListener('keypress', resetIdleTimer);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		const devtoolsCheckInterval = setInterval(() => {
			if (stopped) clearInterval(devtoolsCheckInterval);
			detectDevTools();
		}, 1000);

		resetIdleTimer();
	}

	function cleanup() {
		stopped = true;
		if (faceIntervalHandle) clearInterval(faceIntervalHandle);
		if (idleTimeoutHandle) clearTimeout(idleTimeoutHandle);
		stream?.getTracks().forEach(t => t.stop());

		document.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('focus', handleFocusChange);
		window.removeEventListener('blur', handleFocusChange);
		document.removeEventListener('fullscreenchange', handleFullscreenChange);
		document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.removeEventListener('copy', handleCopy);
		document.removeEventListener('paste', handlePaste);
		document.removeEventListener('keydown', handleKeyDown);
		document.removeEventListener('mousemove', resetIdleTimer);
		document.removeEventListener('keypress', resetIdleTimer);
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	}

	onMount(init);
	onDestroy(cleanup);
</script>

<!-- Monitor Panel (bottom-right): live camera preview + alerts + status pill.
     The video is a plain inline element (no dialog/modal role, no focus
     trap), so it can't itself register as a fullscreen exit or a focus-loss
     violation the way an actual popup would. -->
<div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
	<div
		class="relative overflow-hidden rounded-lg border-2 shadow-lg"
		class:border-primary={status === 'ok'}
		class:border-yellow-500={status === 'warning'}
		class:border-destructive={status === 'violation'}
		style="width:112px;height:84px;"
	>
		<video bind:this={videoEl} class="h-full w-full object-cover" muted playsinline autoplay></video>
		{#if !cameraReady}
			<div class="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
				Camera off
			</div>
		{/if}
	</div>

	<!-- Alerts Stack -->
	{#each alerts.slice(-3) as alert (alert.id)}
		<div
			class="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg animate-in fade-in slide-in-from-right-2 duration-200"
			class:border-destructive/30={alert.severity >= 3}
			class:bg-destructive/10={alert.severity >= 3}
			class:text-destructive={alert.severity >= 3}
			class:border-yellow-500/30={alert.severity === 2}
			class:bg-yellow-500/10={alert.severity === 2}
			class:text-yellow-700={alert.severity === 2}
			class:border-blue-500/30={alert.severity === 1}
			class:bg-blue-500/10={alert.severity === 1}
			class:text-blue-700={alert.severity === 1}
		>
			{#if alert.type === 'face'}
				<Eye class="mt-0.5 size-3.5 shrink-0" />
			{:else if alert.type === 'tab' || alert.type === 'fullscreen'}
				<Monitor class="mt-0.5 size-3.5 shrink-0" />
			{:else if alert.type === 'network'}
				<Wifi class="mt-0.5 size-3.5 shrink-0" />
			{:else if alert.type === 'idle'}
				<Clock class="mt-0.5 size-3.5 shrink-0" />
			{:else}
				<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
			{/if}
			<span>{alert.message}</span>
		</div>
	{/each}

	<!-- Status Indicator Pill -->
	<div
		class="flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-medium shadow-lg"
		class:border-primary={status === 'ok'}
		class:bg-primary/10={status === 'ok'}
		class:text-primary={status === 'ok'}
		class:border-yellow-500={status === 'warning'}
		class:bg-yellow-500/10={status === 'warning'}
		class:text-yellow-700={status === 'warning'}
		class:border-destructive={status === 'violation'}
		class:bg-destructive/10={status === 'violation'}
		class:text-destructive={status === 'violation'}
	>
		<div
			class="size-2 rounded-full animate-pulse"
			class:bg-primary={status === 'ok'}
			class:bg-yellow-500={status === 'warning'}
			class:bg-destructive={status === 'violation'}
		></div>
		<span>
			{#if status === 'ok'}
				Monitoring
			{:else if status === 'warning'}
				⚠ Warning ({violationCount})
			{:else}
				🛑 Violation ({violationCount})
			{/if}
		</span>
	</div>
</div>

<style>
	:global(.animate-in) { animation: slideInRight 0.2s ease-out; }
	:global(.fade-in) { animation: fadeIn 0.2s ease-out; }
	:global(.slide-in-from-right-2) { animation: slideInRight 0.2s ease-out; }

	@keyframes slideInRight {
		from { opacity: 0; transform: translateX(10px); }
		to { opacity: 1; transform: translateX(0); }
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>