<!-- src/lib/components/exam/FaceMonitorModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';

	let { sessionId }: { sessionId: string } = $props();

	const CHECK_INTERVAL_MS = 8000;
	const VIOLATION_COOLDOWN_MS = 30000; 
	const NO_FACE_STRIKES_BEFORE_LOG = 2; 
	const MATCH_THRESHOLD = 0.7; 

	type Status = 'ok' | 'warning' | 'violation';
	let status = $state<Status>('ok');
	let banner = $state('');

	let videoEl = $state<HTMLVideoElement | null>(null);
	let stream: MediaStream | null = null;
	let human: Awaited<ReturnType<typeof getHuman>> | null = null;
	let enrolledDescriptor: number[] | null = null;
	let intervalHandle: ReturnType<typeof setInterval> | null = null;
	let bannerTimeout: ReturnType<typeof setTimeout> | null = null;
	let noFaceStrikes = 0;
	let stopped = false;
	const lastLoggedAt: Record<string, number> = {};

	async function init() {
		try {
			stopped = false;
			human = await getHuman();

			if (stopped) return;

			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
				audio: false,
			});
			
			if (stopped) {
				stream.getTracks().forEach(t => t.stop());
				return;
			}

			if (videoEl) {
				videoEl.srcObject = stream;
				await videoEl.play();
			}

			const descRes = await fetch('/api/face/descriptor');
			if (descRes.ok) {
				const data = await descRes.json();
				enrolledDescriptor = data.descriptor;
			}

			intervalHandle = setInterval(runCheck, CHECK_INTERVAL_MS);
		} catch (err) {
			console.error('[FaceMonitorModal] Failed to initialize:', err);
			status = 'warning';
			showBanner('Camera monitoring unavailable.');
		}
	}

	function canLog(type: string): boolean {
		const last = lastLoggedAt[type] ?? 0;
		if (Date.now() - last < VIOLATION_COOLDOWN_MS) return false;
		lastLoggedAt[type] = Date.now();
		return true;
	}

	async function logViolation(type: string, severity: number, metadata?: Record<string, unknown>) {
		try {
			await fetch('/api/face/violation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId, type, severity, metadata }),
			});
		} catch (err) {
			console.error('[FaceMonitorModal] Failed to log violation:', err);
		}
	}

	function showBanner(text: string) {
		banner = text;
		if (bannerTimeout) clearTimeout(bannerTimeout);
		bannerTimeout = setTimeout(() => (banner = ''), 5000);
	}

	async function runCheck() {
		if (!human || !videoEl || stopped) return;

		const result = await human.detect(videoEl);
		if (stopped) return;

		if (!result || !result.face || result.face.length === 0) {
			noFaceStrikes += 1;
			status = 'warning';
			if (noFaceStrikes >= NO_FACE_STRIKES_BEFORE_LOG && canLog('FACE_NOT_DETECTED')) {
				status = 'violation';
				showBanner('Face not detected — please stay in view of the camera.');
				await logViolation('FACE_NOT_DETECTED', 2);
			}
			return;
		}

		noFaceStrikes = 0;

		if (result.face.length > 1) {
			status = 'violation';
			if (canLog('MULTIPLE_FACES')) {
				showBanner('Multiple faces detected.');
				await logViolation('MULTIPLE_FACES', 3, { count: result.face.length });
			}
			return;
		}

		const face = result.face[0];

		if (enrolledDescriptor && face.embedding) {
			const similarity = cosineSimilarity(face.embedding, enrolledDescriptor);
			if (similarity < MATCH_THRESHOLD) {
				status = 'violation';
				if (canLog('FACE_MISMATCH')) {
					showBanner('Face does not match your enrolled profile.');
					await logViolation('FACE_MISMATCH', 3, { similarity: Math.round(similarity * 100) });
				}
				return;
			}
		}

		status = 'ok';
	}

	function stopCamera() {
		stopped = true;
		if (intervalHandle) clearInterval(intervalHandle);
		if (bannerTimeout) clearTimeout(bannerTimeout);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	onMount(init);
	onDestroy(stopCamera);
</script>

<div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
	{#if banner}
		<div class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-lg">
			<AlertTriangle class="size-3.5 shrink-0" />
			{banner}
		</div>
	{/if}

	<div
		class="relative h-20 w-20 overflow-hidden rounded-full border-2 shadow-lg"
		class:border-primary={status === 'ok'}
		class:border-yellow-500={status === 'warning'}
		class:border-destructive={status === 'violation'}
	>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>
		<div
			class="absolute bottom-1 right-1 size-2.5 rounded-full border border-white"
			class:bg-primary={status === 'ok'}
			class:bg-yellow-500={status === 'warning'}
			class:bg-destructive={status === 'violation'}
		></div>
	</div>
</div>