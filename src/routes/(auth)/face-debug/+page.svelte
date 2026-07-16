<!-- src/routes/(auth)/face-debug/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Camera from '@lucide/svelte/icons/camera';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import { getHuman, checkModelsLoaded } from '$lib/client/face/human';

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let isRunning = $state(false);
	let faceData = $state<any>(null);
	let detections = $state<string[]>([]);
	let error = $state<string>('');
	let modelLoadInfo = $state<string[]>([]);

	let humanInstance: any = null;
	let hasCheckedModels = false;
	let rafId: number | null = null;

	onMount(async () => {
		try {
			// Use the SAME configured singleton the rest of the app uses —
			// not a fresh `new Human()`, which silently drops all config
			// (detector.rotation, antispoof, liveness, modelBasePath, etc).
			humanInstance = await getHuman();

			const loaded = humanInstance.models.loaded();
			modelLoadInfo = loaded;
			console.log('[FaceDebug] Models loaded from shared instance:', loaded);

			if (!videoElement) return;

			const constraints = {
				video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
			};

			navigator.mediaDevices
				.getUserMedia(constraints)
				.then(async (stream) => {
					videoElement.srcObject = stream;
					videoElement.onloadedmetadata = () => {
						videoElement.play();
						isRunning = true;
						runDetection();
					};
				})
				.catch((err) => {
					error = `Camera access denied: ${err.message}`;
					console.error(err);
				});
		} catch (err) {
			error = `Failed to load human.js: ${err}`;
			console.error(err);
		}
	});

	onDestroy(() => {
		stop();
	});

	async function runDetection() {
		if (!videoElement || !canvasElement || !isRunning || !humanInstance) return;

		const result = await humanInstance.detect(videoElement);

		// Some models (antispoof/liveness) can lazy-load on first real detect()
		// rather than at human.load() time — confirm once, after the first frame.
		if (!hasCheckedModels) {
			const { loaded, missing } = checkModelsLoaded(humanInstance);
			modelLoadInfo = loaded;
			if (missing.length > 0) {
				console.warn('[FaceDebug] Still missing post-detect:', missing);
			}
			hasCheckedModels = true;
		}

		if (result?.face && result.face.length > 0) {
			const face = result.face[0];
			faceData = JSON.stringify(face, null, 2);

			detections = [];
			if (face.mesh) detections.push(`✓ Mesh (${face.mesh.length} points)`);

			// Correct path: yaw/pitch/roll live under face.rotation.angle, not face.rotation directly
			const angle = face.rotation?.angle;
			if (angle) {
				detections.push(
					`✓ Rotation (yaw: ${angle.yaw?.toFixed(2)}, pitch: ${angle.pitch?.toFixed(2)}, roll: ${angle.roll?.toFixed(2)})`
				);
			}

			// Correct path: gaze lives under face.rotation.gaze as {bearing, strength}, not top-level {x, y}
			const gaze = face.rotation?.gaze;
			if (gaze && typeof gaze.bearing === 'number') {
				detections.push(`✓ Gaze (bearing: ${gaze.bearing.toFixed(3)}, strength: ${gaze.strength?.toFixed(3)})`);
			}

			if (face.real !== undefined) detections.push(`✓ Antispoof (real) score: ${face.real?.toFixed(2)}`);
			if (face.live !== undefined) detections.push(`✓ Liveness (live) score: ${face.live?.toFixed(2)}`);

			const ctx = canvasElement.getContext('2d');
			if (ctx && face.box) {
				canvasElement.width = videoElement.videoWidth;
				canvasElement.height = videoElement.videoHeight;
				ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
				ctx.strokeStyle = '#00ff00';
				ctx.lineWidth = 2;
				ctx.strokeRect(face.box[0], face.box[1], face.box[2], face.box[3]);
			}
		} else {
			detections = ['No face detected'];
		}

		if (isRunning) {
			rafId = requestAnimationFrame(() => runDetection());
		}
	}

	function stop() {
		isRunning = false;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		if (videoElement?.srcObject) {
			(videoElement.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
		}
	}
</script>

<div class="flex min-h-screen flex-col gap-6 bg-background p-6">
	<div>
		<h1 class="text-2xl font-bold">Face Detection Debug</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Testing the app's shared, configured Human instance — same singleton used in production
		</p>
	</div>

	{#if error}
		<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	{#if modelLoadInfo.length > 0}
		<div class="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-700">
			<span>Loaded models: {modelLoadInfo.join(', ')}</span>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<Card class="flex flex-col gap-4 p-4">
			<div class="relative overflow-hidden rounded-lg border border-border bg-muted">
				<video bind:this={videoElement} class="w-full" playsinline muted />
				<canvas bind:this={canvasElement} class="absolute inset-0 w-full" />
			</div>

			<div class="flex gap-2">
				<Button disabled={isRunning} onclick={() => { isRunning = true; runDetection(); }} class="flex-1">
					<Camera class="mr-2 size-4" />
					Start
				</Button>
				<Button disabled={!isRunning} onclick={stop} variant="outline" class="flex-1">
					Stop
				</Button>
			</div>
		</Card>

		<Card class="flex flex-col gap-4 p-4">
			<div>
				<h3 class="font-semibold">Detected Data</h3>
				<p class="text-xs text-muted-foreground">What human.js found in this frame</p>
			</div>

			{#if detections.length === 0}
				<div class="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
					<AlertCircle class="size-3.5" />
					<span>No face detected. Ensure good lighting and your face is centered.</span>
				</div>
			{:else}
				<div class="flex flex-col gap-2">
					{#each detections as detection}
						<div class="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700">
							<CheckCircle2 class="size-3.5 shrink-0" />
							<span>{detection}</span>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	</div>

	{#if faceData}
		<Card class="flex flex-col gap-4 p-4">
			<div>
				<h3 class="font-semibold">Raw Face Object (JSON)</h3>
				<p class="text-xs text-muted-foreground">Complete face detection data for inspection</p>
			</div>
			<pre class="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">{faceData}</pre>
		</Card>
	{/if}

	<Card class="flex flex-col gap-4 p-4">
		<h3 class="font-semibold">Configuration Checklist</h3>
		<div class="space-y-2 text-xs">
			<div class="flex items-center gap-2">
				<input type="checkbox" checked={true} disabled />
				<span>Is human.js imported correctly?</span>
			</div>
			<div class="flex items-center gap-2">
				<input type="checkbox" checked={!!detections.length} disabled />
				<span>Is a face being detected?</span>
			</div>
			<div class="flex items-center gap-2">
				<input type="checkbox" checked={detections.some(d => d.includes('Rotation'))} disabled />
				<span>Is head rotation available?</span>
			</div>
			<div class="flex items-center gap-2">
				<input type="checkbox" checked={detections.some(d => d.includes('Gaze'))} disabled />
				<span>Is gaze tracking available?</span>
			</div>
			<div class="flex items-center gap-2">
				<input type="checkbox" checked={detections.some(d => d.includes('Liveness') || d.includes('Antispoof'))} disabled />
				<span>Is liveness scoring available?</span>
			</div>
		</div>
	</Card>
</div>