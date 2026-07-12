<!-- src/lib/components/exam/DeviceCheckPanel.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import Camera from '@lucide/svelte/icons/camera'
	import Mic from '@lucide/svelte/icons/mic'
	import MapPin from '@lucide/svelte/icons/map-pin'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import Loader2 from '@lucide/svelte/icons/loader-2'
	import { getHuman } from '$lib/client/face/human.js'

	// `allPassed` is bindable so the parent (e.g. the lobby step) can gate its
	// "Continue" button on it without needing a callback prop.
	let { allPassed = $bindable(false) }: { allPassed?: boolean } = $props()

	type CheckStatus = 'idle' | 'checking' | 'passed' | 'failed'

	let cameraStatus = $state<CheckStatus>('idle')
	let cameraError = $state('')
	let faceDetected = $state(false)

	let micStatus = $state<CheckStatus>('idle')
	let micError = $state('')
	let micLevel = $state(0)

	let locationStatus = $state<CheckStatus>('idle')
	let locationError = $state('')

	let videoEl = $state<HTMLVideoElement | null>(null)
	let cameraStream: MediaStream | null = null
	let micStream: MediaStream | null = null
	let audioCtx: AudioContext | null = null
	let analyser: AnalyserNode | null = null
	let meterHandle: number | null = null
	let faceLoopHandle: number | null = null
	let stopped = false

	$effect(() => {
		allPassed = cameraStatus === 'passed' && micStatus === 'passed' && locationStatus === 'passed'
	})

	// ─── Camera + face detection ────────────────────────────────────────────
	async function runCameraCheck() {
		cameraStatus = 'checking'
		cameraError = ''
		faceDetected = false
		try {
			cameraStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
			})
			if (!videoEl) throw new Error('Video preview not ready')
			videoEl.srcObject = cameraStream
			await videoEl.play()

			const human = await getHuman()
			faceLoop(human)
		} catch (err) {
			cameraStatus = 'failed'
			cameraError = err instanceof Error ? err.message : 'Camera access denied or unavailable'
		}
	}

	async function faceLoop(human: Awaited<ReturnType<typeof getHuman>>) {
		if (stopped || !videoEl) return
		try {
			const result = await human.detect(videoEl)
			const faces = result?.face ?? []
			if (faces.length === 1) {
				faceDetected = true
				cameraStatus = 'passed'
				return // stop polling once passed — the preview stays live for the user
			}
			faceDetected = false
			cameraStatus = 'checking'
		} catch {
			// transient detection hiccups are fine — keep trying
		}
		faceLoopHandle = requestAnimationFrame(() => faceLoop(human))
	}

	// ─── Microphone ─────────────────────────────────────────────────────────
	async function runMicCheck() {
		micStatus = 'checking'
		micError = ''
		try {
			micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
			audioCtx = new AudioContext()
			const source = audioCtx.createMediaStreamSource(micStream)
			analyser = audioCtx.createAnalyser()
			analyser.fftSize = 512
			source.connect(analyser)
			micStatus = 'passed'
			meterLoop()
		} catch (err) {
			micStatus = 'failed'
			micError = err instanceof Error ? err.message : 'Microphone access denied or unavailable'
		}
	}

	function meterLoop() {
		if (stopped || !analyser) return
		const data = new Uint8Array(analyser.frequencyBinCount)
		analyser.getByteTimeDomainData(data)
		let sum = 0
		for (const v of data) sum += Math.abs(v - 128)
		micLevel = Math.min(1, sum / data.length / 40)
		meterHandle = requestAnimationFrame(meterLoop)
	}

	// ─── Location ───────────────────────────────────────────────────────────
	function runLocationCheck() {
		locationStatus = 'checking'
		locationError = ''
		if (!navigator.geolocation) {
			locationStatus = 'failed'
			locationError = 'Location services are not available on this device'
			return
		}
		navigator.geolocation.getCurrentPosition(
			() => {
				locationStatus = 'passed'
			},
			(err) => {
				locationStatus = 'failed'
				locationError = err.message || 'Location access denied'
			},
			{ enableHighAccuracy: false, timeout: 10_000 }
		)
	}

	function runAllChecks() {
		runCameraCheck()
		runMicCheck()
		runLocationCheck()
	}

	function cleanup() {
		stopped = true
		if (faceLoopHandle) cancelAnimationFrame(faceLoopHandle)
		if (meterHandle) cancelAnimationFrame(meterHandle)
		cameraStream?.getTracks().forEach((t) => t.stop())
		micStream?.getTracks().forEach((t) => t.stop())
		audioCtx?.close().catch(() => {})
		cameraStream = null
		micStream = null
		audioCtx = null
	}

	onMount(runAllChecks)
	onDestroy(cleanup)
</script>

<div class="space-y-3">
	<div class="overflow-hidden rounded-lg border bg-black">
		<div class="relative aspect-video">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>
			{#if cameraStatus === 'checking'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/40">
					<Loader2 class="size-6 animate-spin text-white" />
				</div>
			{/if}
		</div>
	</div>

	<div class="rounded-lg border p-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm font-medium">
				<Camera class="size-4" /> Camera &amp; face check
			</div>
			{#if cameraStatus === 'passed'}
				<Badge><CheckCircle2 class="mr-1 size-3" /> Passed</Badge>
			{:else if cameraStatus === 'failed'}
				<Button size="sm" variant="outline" onclick={runCameraCheck}>Retry</Button>
			{:else}
				<Badge variant="secondary">{faceDetected ? 'Confirming…' : 'Looking for face…'}</Badge>
			{/if}
		</div>
		{#if cameraError}
			<p class="mt-2 flex items-center gap-1 text-xs text-destructive">
				<AlertCircle class="size-3" /> {cameraError}
			</p>
		{/if}
	</div>

	<div class="rounded-lg border p-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm font-medium">
				<Mic class="size-4" /> Microphone check
			</div>
			{#if micStatus === 'passed'}
				<Badge><CheckCircle2 class="mr-1 size-3" /> Passed</Badge>
			{:else if micStatus === 'failed'}
				<Button size="sm" variant="outline" onclick={runMicCheck}>Retry</Button>
			{:else}
				<Badge variant="secondary">Checking…</Badge>
			{/if}
		</div>
		{#if micStatus === 'passed'}
			<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div class="h-full bg-primary transition-all" style="width: {micLevel * 100}%"></div>
			</div>
		{/if}
		{#if micError}
			<p class="mt-2 flex items-center gap-1 text-xs text-destructive">
				<AlertCircle class="size-3" /> {micError}
			</p>
		{/if}
	</div>

	<div class="rounded-lg border p-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm font-medium">
				<MapPin class="size-4" /> Location check
			</div>
			{#if locationStatus === 'passed'}
				<Badge><CheckCircle2 class="mr-1 size-3" /> Passed</Badge>
			{:else if locationStatus === 'failed'}
				<Button size="sm" variant="outline" onclick={runLocationCheck}>Retry</Button>
			{:else}
				<Badge variant="secondary">Checking…</Badge>
			{/if}
		</div>
		{#if locationError}
			<p class="mt-2 flex items-center gap-1 text-xs text-destructive">
				<AlertCircle class="size-3" /> {locationError}
			</p>
		{/if}
	</div>
</div>