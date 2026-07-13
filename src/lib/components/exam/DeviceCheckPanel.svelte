<!-- src/lib/components/exam/DeviceCheckPanel.svelte -->
<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import Camera from '@lucide/svelte/icons/camera'
	import Mic from '@lucide/svelte/icons/mic'
	import MapPin from '@lucide/svelte/icons/map-pin'
	import Monitor from '@lucide/svelte/icons/monitor'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import Loader2 from '@lucide/svelte/icons/loader-2'
	import { getHuman } from '$lib/client/face/human.js'
	import { isMobileDevice } from '$lib/utils/permissions.js'

	interface Props {
		/**
		 * When false, the camera + face detection check is skipped entirely
		 * and the mic check is also skipped (no proctoring audio needed).
		 * Defaults to true so the panel is safe to drop in without props.
		 */
		requireFaceVerify?: boolean
		/**
		 * Called once every required check has passed. The parent uses this
		 * to advance past the device-check step.
		 */
		onDeviceCheckComplete?: () => void
		/**
		 * Bindable mirror of the "all passed" state — kept for parents that
		 * prefer two-way binding over a callback.
		 */
		allPassed?: boolean
	}

	let {
		requireFaceVerify = true,
		onDeviceCheckComplete,
		allPassed = $bindable(false),
	}: Props = $props()

	type CheckStatus = 'idle' | 'checking' | 'passed' | 'failed' | 'skipped'

	// ─── Camera + face ──────────────────────────────────────────────────────
	let cameraStatus = $state<CheckStatus>('idle')
	let cameraError = $state('')
	let faceDetected = $state(false)

	// ─── Microphone ─────────────────────────────────────────────────────────
	let micStatus = $state<CheckStatus>('idle')
	let micError = $state('')
	let micLevel = $state(0)

	// ─── Location ───────────────────────────────────────────────────────────
	let locationStatus = $state<CheckStatus>('idle')
	let locationError = $state('')
	let locationData = $state<{
		latitude: number | null
		longitude: number | null
		accuracy: number | null
		address: string | null
	}>({ latitude: null, longitude: null, accuracy: null, address: null })
	let isFetchingAddress = $state(false)

	// ─── Window / screen management ─────────────────────────────────────────
	// Skipped automatically on mobile — students can't be expected to manage
	// a second monitor from a phone. Also skipped on Firefox/Safari which
	// don't implement getScreenDetails().
	const isMobile = typeof window !== 'undefined' ? isMobileDevice() : false
	const windowMgmtSupported =
		!isMobile && typeof window !== 'undefined' && 'getScreenDetails' in window

	let windowStatus = $state<CheckStatus>('idle')
	let windowError = $state('')
	let screenCount = $state(0)
	let multiScreenDetected = $state(false)

	// ─── DOM ref + raw handles ───────────────────────────────────────────────
	let videoEl = $state<HTMLVideoElement | null>(null)
	let cameraStream: MediaStream | null = null
	let micStream: MediaStream | null = null
	let audioCtx: AudioContext | null = null
	let analyser: AnalyserNode | null = null
	let meterHandle: number | null = null
	let faceLoopHandle: number | null = null
	let stopped = false

	// ─── "All passed" derivation ─────────────────────────────────────────────
	// A check that was never required resolves as 'skipped', which counts as
	// passing for the purposes of gating the Continue button.
	function isOk(s: CheckStatus) {
		return s === 'passed' || s === 'skipped'
	}

	$effect(() => {
		const passed =
			isOk(cameraStatus) &&
			isOk(micStatus) &&
			isOk(locationStatus) &&
			isOk(windowStatus)

		allPassed = passed

		if (passed) {
			onDeviceCheckComplete?.()
		}
	})

	// ─── Camera + face detection ─────────────────────────────────────────────
	async function runCameraCheck() {
		if (!requireFaceVerify) {
			cameraStatus = 'skipped'
			return
		}

		cameraStatus = 'checking'
		cameraError = ''
		faceDetected = false

		try {
			cameraStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
			})
			await tick() // wait for Svelte to bind videoEl
			if (!videoEl) throw new Error('Video preview not ready')
			videoEl.srcObject = cameraStream
			await videoEl.play()

			const human = await getHuman()
			faceLoop(human, videoEl)
		} catch (err) {
			cameraStatus = 'failed'
			cameraError =
				err instanceof Error ? err.message : 'Camera access denied or unavailable'
		}
	}

	async function faceLoop(human: Awaited<ReturnType<typeof getHuman>>, el: HTMLVideoElement) {
		if (stopped || !el) return
		try {
			const result = await human.detect(el)
			const faces = result?.face ?? []
			if (faces.length === 1) {
				faceDetected = true
				cameraStatus = 'passed'
				return // stop polling — preview stays live for the student
			}
			faceDetected = false
			cameraStatus = 'checking'
		} catch {
			// transient detection hiccups are fine — keep trying
		}
		faceLoopHandle = requestAnimationFrame(() => faceLoop(human, el))
	}

	// ─── Microphone ──────────────────────────────────────────────────────────
	async function runMicCheck() {
		if (!requireFaceVerify) {
			// No proctoring audio needed if face verify is off
			micStatus = 'skipped'
			return
		}

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
			micError =
				err instanceof Error ? err.message : 'Microphone access denied or unavailable'
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

	// ─── Location ────────────────────────────────────────────────────────────
	async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 5000)
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
				{ headers: { 'User-Agent': 'ExamApp/1.0' }, signal: controller.signal }
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
		locationData = { latitude: null, longitude: null, accuracy: null, address: null }

		if (!navigator.geolocation) {
			locationStatus = 'failed'
			locationError = 'Location services are not available on this device'
			return
		}

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude, accuracy } = position.coords
				locationData.latitude = latitude
				locationData.longitude = longitude
				locationData.accuracy = accuracy

				isFetchingAddress = true
				const address = await reverseGeocode(latitude, longitude)
				isFetchingAddress = false
				if (address) locationData.address = address

				locationStatus = 'passed'
			},
			(err) => {
				locationStatus = 'failed'
				locationError = err.message || 'Location access denied'
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		)
	}

	// ─── Window / screen management ───────────────────────────────────────────
	async function runWindowCheck() {
		// Mobile devices never have a multi-screen risk — skip silently.
		if (isMobile) {
			windowStatus = 'skipped'
			return
		}

		// Unsupported browser (Firefox, Safari) — auto-pass rather than blocking.
		if (!windowMgmtSupported) {
			windowStatus = 'passed'
			windowError = ''
			return
		}

		windowStatus = 'checking'
		windowError = ''

		try {
			const screenDetails = await (window as any).getScreenDetails()
			screenCount = screenDetails.screens?.length ?? 1
			multiScreenDetected = screenCount > 1
			// Multiple screens is a proctoring signal, not a hard block.
			windowStatus = 'passed'
		} catch (err) {
			windowStatus = 'failed'
			windowError =
				err instanceof Error
					? err.message
					: 'Window management permission denied or unavailable'
		}
	}

	// ─── Orchestration ────────────────────────────────────────────────────────
	function runAllChecks() {
		runCameraCheck()
		runMicCheck()
		runLocationCheck()
		runWindowCheck()
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
	<!-- ─── Camera preview ──────────────────────────────────────────────────── -->
	{#if requireFaceVerify}
		<div class="overflow-hidden rounded-lg border bg-black">
			<div class="relative aspect-video">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					bind:this={videoEl}
					class="h-full w-full -scale-x-100 object-cover"
					muted
					playsinline
				></video>
				{#if cameraStatus === 'checking'}
					<div class="absolute inset-0 flex items-center justify-center bg-black/40">
						<Loader2 class="size-6 animate-spin text-white" />
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ─── Camera & face check ────────────────────────────────────────────── -->
	{#if requireFaceVerify}
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
	{/if}

	<!-- ─── Microphone check ────────────────────────────────────────────────── -->
	{#if requireFaceVerify}
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
	{/if}

	<!-- ─── Location check ─────────────────────────────────────────────────── -->
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
					<span class="min-w-[70px] font-medium text-muted-foreground">Coordinates:</span>
					<span class="font-mono text-xs">
						{locationData.latitude.toFixed(6)}, {locationData.longitude?.toFixed(6)}
					</span>
				</div>

				{#if locationData.accuracy}
					<div class="flex items-start gap-2">
						<span class="min-w-[70px] font-medium text-muted-foreground">Accuracy:</span>
						<span>
							{locationData.accuracy < 10
								? '±' + locationData.accuracy.toFixed(1) + 'm (Very accurate)'
								: locationData.accuracy < 50
									? '±' + locationData.accuracy.toFixed(0) + 'm (Accurate)'
									: '±' + locationData.accuracy.toFixed(0) + 'm (Approximate)'}
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
						<span class="min-w-[70px] font-medium text-muted-foreground">Address:</span>
						<span class="text-xs leading-relaxed">{locationData.address}</span>
					</div>
				{/if}

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

	<!-- ─── Window management check ────────────────────────────────────────── -->
	{#if !isMobile}
		<div class="rounded-lg border p-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm font-medium">
					<Monitor class="size-4" /> Window management check
				</div>
				{#if windowStatus === 'passed'}
					<Badge><CheckCircle2 class="mr-1 size-3" /> Passed</Badge>
				{:else if windowStatus === 'failed'}
					<Button size="sm" variant="outline" onclick={runWindowCheck}>Retry</Button>
				{:else}
					<Badge variant="secondary">Checking…</Badge>
				{/if}
			</div>

			{#if !windowMgmtSupported}
				<p class="mt-2 text-xs text-muted-foreground">
					Your browser doesn't support window management checks — this step is skipped
					automatically.
				</p>
			{:else if windowStatus === 'passed' && multiScreenDetected}
				<p class="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
					<AlertCircle class="size-3" />
					{screenCount} displays detected — this will be visible to your invigilator.
				</p>
			{/if}

			{#if windowError}
				<p class="mt-2 flex items-center gap-1 text-xs text-destructive">
					<AlertCircle class="size-3" /> {windowError}
				</p>
			{/if}
		</div>
	{/if}
</div>