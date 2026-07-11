<!-- src/lib/components/exam/ExamMonitor.svelte - OPTIMIZED -->
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

	// ─── Violation Cooldown (prevents spam logging) ────────────────────────────
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

		// Show local alert immediately
		showAlert(type as AlertType, getViolationMessage(type), severity);

		// Log to server asynchronously (don't block UI)
		try {
			await fetch(`/api/assessment/session/${sessionId}/violation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId, type, severity, metadata }),
			}).catch(err => console.error(`[Monitor] Failed to log ${type}:`, err));
		} catch (err) {
			console.error(`[Monitor] Error logging ${type}:`, err);
		}
	}

	function getViolationMessage(type: string): string {
		const messages: Record<string, string> = {
			FACE_NOT_DETECTED: 'Face not detected — stay in view of camera',
			FACE_MISMATCH: 'Face does not match enrolled profile',
			MULTIPLE_FACES: 'Multiple faces detected',
			DEVTOOLS_OPEN: 'Developer tools detected',
			FULLSCREEN_EXIT: 'Exam exited fullscreen',
			TAB_SWITCH: 'You switched to another tab',
			COPY_ATTEMPT: 'Copy disabled during exam',
			PASTE_ATTEMPT: 'Paste disabled during exam',
			KEYBOARD_SHORTCUT: 'Keyboard shortcut blocked',
			FOCUS_LOSS: 'Window lost focus',
			IDLE_TIMEOUT: 'Exam paused due to inactivity',
			NETWORK_DROP: 'Lost internet connection',
		};
		return messages[type] || 'Violation detected';
	}

	function showAlert(type: AlertType, message: string, severity: number) {
		const id = `${type}-${Date.now()}`;
		alerts.push({ id, type, message, severity, timestamp: Date.now() });
		console.log(`[Monitor] Alert: ${message}`);

		// Auto-dismiss after 8 seconds
		setTimeout(() => {
			alerts = alerts.filter(a => a.id !== id);
		}, 8000);
	}

	// ─── Face Monitoring ──────────────────────────────────────────────────────
	async function initFaceMonitoring() {
		try {
			console.log('[Monitor] Initializing face detection...');
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
				console.log('[Monitor] Camera ready');
			}

			// Fetch enrolled descriptor once (cached)
			try {
				const descRes = await fetch('/api/face/descriptor');
				if (descRes.ok) {
					const data = await descRes.json();
					enrolledDescriptor = data.descriptor;
					console.log('[Monitor] Enrolled descriptor loaded');
				}
			} catch (err) {
				console.warn('[Monitor] Could not fetch descriptor:', err);
			}

			// Start continuous face checking
			faceIntervalHandle = setInterval(runFaceCheck, FACE_CHECK_INTERVAL_MS);
			console.log('[Monitor] Face detection started');
		} catch (err) {
			console.error('[Monitor] Face monitoring init failed:', err);
			showAlert('face', 'Camera unavailable', 1);
		}
	}

	async function runFaceCheck() {
		if (!human || !videoEl || stopped) return;

		try {
			const result = await human.detect(videoEl);
			if (stopped) return;

			// ─── No Face Detected ─────────────────────────────────────────────
			if (!result?.face || result.face.length === 0) {
				noFaceStrikes++;

				if (noFaceStrikes >= NO_FACE_STRIKES_BEFORE_LOG) {
					status = 'violation';
					await logViolation('FACE_NOT_DETECTED', 3);
					noFaceStrikes = 0; // Reset after logging
				}
				return;
			}

			noFaceStrikes = 0;

			// ─── Multiple Faces ───────────────────────────────────────────────
			if (result.face.length > 1) {
				status = 'violation';
				await logViolation('MULTIPLE_FACES', 3, { count: result.face.length });
				return;
			}

			// ─── Face Matching ────────────────────────────────────────────────
			const face = result.face[0];
			if (enrolledDescriptor && face.embedding) {
				const similarity = cosineSimilarity(face.embedding, enrolledDescriptor);
				if (similarity < FACE_MATCH_THRESHOLD) {
					status = 'violation';
					await logViolation('FACE_MISMATCH', 3, { similarity: Math.round(similarity * 100) });
					return;
				}
			}

			// ─── All Checks Passed ────────────────────────────────────────────
			status = 'ok';
		} catch (err) {
			console.error('[Monitor] Face check error:', err);
		}
	}

	// ─── Fullscreen Monitoring ────────────────────────────────────────────────
	function handleFullscreenChange() {
		const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

		if (isFullscreen && !isCurrentlyFullscreen) {
			status = 'warning';
			logViolation('FULLSCREEN_EXIT', 2);
		}

		isFullscreen = isCurrentlyFullscreen;
	}

	// ─── Tab/Window Switch Monitoring ────────────────────────────────────────
	function handleVisibilityChange() {
		if (document.hidden) {
			status = 'violation';
			logViolation('TAB_SWITCH', 2);
		}
	}

	function handleFocusChange() {
		if (!document.hasFocus()) {
			status = 'warning';
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
				logViolation('DEVTOOLS_OPEN', 3);
			}
		} else {
			devtoolsOpen = false;
		}
	}

	// ─── Copy/Paste Detection ────────────────────────────────────────────────
	function handleCopy(e: ClipboardEvent) {
		e.preventDefault();
		logViolation('COPY_ATTEMPT', 1);
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		logViolation('PASTE_ATTEMPT', 1);
	}

	// ─── Keyboard Shortcut Prevention ────────────────────────────────────────
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
		logViolation('NETWORK_DROP', 1);
	}

	// ─── Initialization ───────────────────────────────────────────────────────
	async function init() {
		console.log('[Monitor] Initializing exam monitor...');
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

		// DevTools check every 1 second
		const devtoolsCheckInterval = setInterval(() => {
			if (stopped) clearInterval(devtoolsCheckInterval);
			detectDevTools();
		}, 1000);

		resetIdleTimer();
		console.log('[Monitor] Exam monitor initialized');
	}

	function cleanup() {
		console.log('[Monitor] Cleaning up...');
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

<!-- Monitor Panel (bottom-right): live camera preview + alerts + status pill -->
<div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
	<!-- Camera Feed -->
	<div
		class="relative overflow-hidden rounded-lg border-2 shadow-lg"
		class:border-primary={status === 'ok'}
		class:border-yellow-500={status === 'warning'}
		class:border-destructive={status === 'violation'}
		style="width:112px;height:84px;"
	>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={videoEl} class="h-full w-full object-cover" muted playsinline></video>
		{#if !cameraReady}
			<div class="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
				Camera off
			</div>
		{/if}
	</div>

	<!-- Alerts Stack (max 3) -->
	{#each alerts.slice(-3) as alert (alert.id)}
		<div
			class="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg animate-in fade-in slide-in-from-right-2 duration-200"
			style:border-color={alert.severity >= 3 
				? 'hsl(var(--destructive) / 0.3)' 
				: alert.severity === 2 
					? 'hsl(43 96% 56% / 0.3)' 
					: 'hsl(var(--primary) / 0.3)'}
			style:background-color={alert.severity >= 3 
				? 'hsl(var(--destructive) / 0.1)' 
				: alert.severity === 2 
					? 'hsl(43 96% 56% / 0.1)' 
					: 'hsl(var(--primary) / 0.1)'}
			style:color={alert.severity >= 3 
				? 'hsl(var(--destructive))' 
				: alert.severity === 2 
					? 'hsl(43 96% 56% / 0.9)' 
					: 'hsl(var(--primary))'}
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
		class:bg-primary-10={status === 'ok'}
		class:text-primary={status === 'ok'}
		class:border-yellow-500={status === 'warning'}
		class:bg-yellow-500={status === 'warning'}
		class:text-yellow-700={status === 'warning'}
		class:border-destructive={status === 'violation'}
		class:bg-destructive-10={status === 'violation'}
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