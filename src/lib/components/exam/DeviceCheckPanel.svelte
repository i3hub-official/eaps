<!-- src/lib/components/exam/DeviceCheckPanel.svelte -->
<script lang="ts">
import { onMount, onDestroy, tick } from 'svelte'
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
	
	// ─── Location Data ─────────────────────────────────────────────────────────
	let locationData = $state<{
		latitude: number | null
		longitude: number | null
		accuracy: number | null
		address: string | null
	}>({
		latitude: null,
		longitude: null,
		accuracy: null,
		address: null
	})
	let isFetchingAddress = $state(false)

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
		await tick()  // ← wait for svelte to update bindings
		if (!videoEl) throw new Error('Video preview not ready')
		videoEl.srcObject = cameraStream
		await videoEl.play()

		const human = await getHuman()
		faceLoop(human, videoEl)
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
	async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 5000)  // 5s timeout
		
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
			{
				headers: { 'User-Agent': 'ExamApp/1.0' },
				signal: controller.signal  // abort if timeout
			}
		)
		clearTimeout(timeoutId)
		
		if (!response.ok) return null
		const data = await response.json()
		return data?.display_name ?? null
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.warn('Reverse geocoding timeout')
		} else {
			console.error('Reverse geocoding error:', error)
		}
		return null
	}
}

	async function runLocationCheck() {
		locationStatus = 'checking'
		locationError = ''
		locationData = {
			latitude: null,
			longitude: null,
			accuracy: null,
			address: null
		}
		
		if (!navigator.geolocation) {
			locationStatus = 'failed'
			locationError = 'Location services are not available on this device'
			return
		}
		
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude, accuracy } = position.coords
				
				// Store coordinates
				locationData.latitude = latitude
				locationData.longitude = longitude
				locationData.accuracy = accuracy
				
				// Try to get address
				isFetchingAddress = true
				const address = await reverseGeocode(latitude, longitude)
				isFetchingAddress = false
				
				if (address) {
					locationData.address = address
				}
				
				locationStatus = 'passed'
			},
			(err) => {
				locationStatus = 'failed'
				locationError = err.message || 'Location access denied'
			},
			{ 
				enableHighAccuracy: true, 
				timeout: 15000,
				maximumAge: 0
			}
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
		
		{#if locationStatus === 'passed' && locationData.latitude}
			<div class="mt-3 space-y-1.5 text-sm">
				<div class="flex items-start gap-2">
					<span class="font-medium text-muted-foreground min-w-[70px]">Coordinates:</span>
					<span class="font-mono text-xs">
						{locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
					</span>
				</div>
				
				{#if locationData.accuracy}
					<div class="flex items-start gap-2">
						<span class="font-medium text-muted-foreground min-w-[70px]">Accuracy:</span>
						<span>
							{locationData.accuracy < 10 
								? '±' + locationData.accuracy.toFixed(1) + 'm (Very accurate)' 
								: locationData.accuracy < 50 
									? '±' + locationData.accuracy.toFixed(0) + 'm (Accurate)'
									: '±' + locationData.accuracy.toFixed(0) + 'm (Approximate)'
							}
						</span>
					</div>
				{/if}
				
				{#if isFetchingAddress}
					<div class="flex items-center gap-2 text-muted-foreground">
						<Loader2 class="size-3 animate-spin" />
						<span>Fetching address…</span>
					</div>
				{:else if locationData.address}
					<div class="flex items-start gap-2">
						<span class="font-medium text-muted-foreground min-w-[70px]">Address:</span>
						<span class="text-xs leading-relaxed">{locationData.address}</span>
					</div>
				{/if}
				
				<!-- Google Maps link -->
				<div class="mt-2">
					<a 
						href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
					>
						<MapPin class="size-3" />
						View on Google Maps
					</a>
				</div>
			</div>
		{/if}
		
		{#if locationError}
			<p class="mt-2 flex items-center gap-1 text-xs text-destructive">
				<AlertCircle class="size-3" /> {locationError}
			</p>
		{/if}
	</div>
</div>