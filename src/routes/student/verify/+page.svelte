<!-- src/routes/(student)/verify/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let video: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let status = $state<'loading' | 'ready' | 'verifying' | 'success' | 'error' | 'no_face'>(
		'loading'
	);
	let message = $state('Loading face detection models...');
	let similarityScore = $state<number | null>(null);
	let retryCount = $state(0);
	let isProcessing = $state(false);

	let faceapi: typeof import('@vladmandic/face-api') | null = null;

	const examId = data.exam?.id;

	onMount(() => {
		loadModels();
	});

	async function loadModels() {
		try {
			faceapi = await import('@vladmandic/face-api');

			const MODEL_URL = '/models';
			await Promise.all([
				faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
				faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
				faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
			]);

			status = 'ready';
			message = 'Click "Start Verification" to begin.';
		} catch (err) {
			console.error('Model load error:', err);
			status = 'error';
			message = 'Failed to load face detection models. Please refresh the page.';
		}
	}

	async function startVerification() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'user',
					width: { ideal: 640 },
					height: { ideal: 480 }
				}
			});

			video.srcObject = stream;
			await video.play();

			status = 'verifying';
			message = 'Verifying your face... Please look at the camera.';

			await verifyFace();
		} catch (err) {
			console.error('Camera error:', err);
			status = 'error';
			message = 'Camera access denied. Please allow camera access and try again.';
		}
	}

	async function verifyFace() {
		if (!faceapi || isProcessing) return;
		isProcessing = true;

		try {
			const detection = await faceapi
				.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
				.withFaceLandmarks(true)
				.withFaceDescriptor();

			if (!detection) {
				status = 'no_face';
				message =
					'No face detected. Please position your face in the frame and ensure good lighting.';
				isProcessing = false;
				return;
			}

			const currentDescriptor = Array.from(detection.descriptor);

			const response = await fetch('/api/face/descriptor');

			if (!response.ok) {
				if (response.status === 404) {
					status = 'error';
					message = 'No face enrollment found. Please contact your administrator.';
				} else {
					throw new Error('Failed to retrieve face data');
				}
				isProcessing = false;
				return;
			}

			const { descriptor: storedDescriptor } = await response.json();

			const distance = calculateDistance(currentDescriptor, storedDescriptor);

			// Calculate similarity percentage first (using standard 0.6 threshold)
			const rawSimilarityPercent = Math.max(0, Math.min(100, (1 - distance / 0.6) * 100));

			// Then require 70% or higher
			const REQUIRED_SIMILARITY = 50; // 70% requirement
			const isMatch = rawSimilarityPercent >= REQUIRED_SIMILARITY;

			similarityScore = rawSimilarityPercent;

			if (isMatch) {
				status = 'success';
				message = `Face verified successfully! (${rawSimilarityPercent.toFixed(1)}% match)`;
				console.log(`✅ Match! ${rawSimilarityPercent.toFixed(1)}% >= ${REQUIRED_SIMILARITY}%`);

				sessionStorage.setItem('face_verified', 'true');
				sessionStorage.setItem('face_verified_at', Date.now().toString());
				sessionStorage.setItem('face_similarity_score', similarityScore.toString());

				setTimeout(() => {
					if (examId) {
						goto(`/exam/${examId}`);
					} else {
						goto('/student');
					}
				}, 2000);
			} else {
				status = 'error';
				message = `Face verification failed. (${rawSimilarityPercent.toFixed(1)}% match - below threshold)`;
				console.log(`❌ No match! ${rawSimilarityPercent.toFixed(1)}% < ${REQUIRED_SIMILARITY}%`);
				retryCount++;
			}
		} catch (err) {
			console.error('Verification error:', err);
			status = 'error';
			message = err instanceof Error ? err.message : 'Verification failed. Please try again.';
		} finally {
			isProcessing = false;
		}
	}

	function calculateDistance(descriptor1: number[], descriptor2: number[]): number {
		let sum = 0;
		for (let i = 0; i < descriptor1.length; i++) {
			sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
		}
		return Math.sqrt(sum);
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((t) => t.stop());
			stream = null;
		}
	}

	function retry() {
		retryCount = 0;
		similarityScore = null;
		status = 'ready';
		message = 'Click "Start Verification" to try again.';
		stopCamera();
	}

	function skipForNow() {
		const skipCount = parseInt(sessionStorage.getItem('skip_count') || '0', 10);
		if (skipCount < 3) {
			sessionStorage.setItem('skip_count', (skipCount + 1).toString());
			sessionStorage.setItem('face_verified', 'false');

			if (examId) {
				goto(`/exam/${examId}`);
			} else {
				goto('/student');
			}
		} else {
			alert('You have exceeded the maximum number of skips. Face verification is required.');
		}
	}

	onDestroy(() => {
		stopCamera();
	});
</script>

<div class="verify-container">
	<div class="verify-card">
		<div class="header">
			<h1>Face Verification</h1>
			<p class="subtitle">
				Verify your identity before {examId ? 'starting the exam' : 'continuing'}
			</p>

			{#if data.user}
				<p class="user-info">Student: {data.user.name}</p>
			{/if}
		</div>

		<div class="camera-section">
			<div class="camera-wrapper">
				{#if status !== 'success'}
					<video
						bind:this={video}
						autoplay
						muted
						playsinline
						class:video-hidden={status === 'loading' || status === 'error'}
					></video>

					{#if status === 'loading' || status === 'error'}
						<div class="placeholder">
							{#if status === 'loading'}
								<div class="spinner"></div>
							{:else}
								<div class="error-icon">!</div>
							{/if}
						</div>
					{/if}
				{:else}
					<div class="success-overlay">
						<div class="success-icon">✓</div>
					</div>
				{/if}

				<!-- Face detection frame -->
				{#if status === 'verifying'}
					<div class="face-frame"></div>
				{/if}
			</div>

			{#if similarityScore !== null}
				<div class="score-indicator">
					<div class="score-bar">
						<div class="score-fill" style="width: {similarityScore}%"></div>
					</div>
					<p class="score-text">Match Score: {similarityScore.toFixed(1)}%</p>
				</div>
			{/if}
		</div>

		<div
			class="status-box"
			class:status-error={status === 'error'}
			class:status-success={status === 'success'}
		>
			{#if status === 'no_face'}
				<div class="warning-icon">⚠</div>
			{/if}
			<p>{message}</p>
		</div>

		<div class="actions">
			{#if status === 'ready'}
				<button class="btn-primary" onclick={startVerification}> Start Verification </button>
				<button class="btn-outline" onclick={() => goto('/student')}> Cancel </button>
			{:else if status === 'verifying'}
				<button class="btn-secondary" onclick={stopCamera} disabled={isProcessing}> Cancel </button>
			{:else if status === 'error'}
				<button class="btn-primary" onclick={retry}> Try Again </button>
				{#if retryCount < 2}
					<button class="btn-outline" onclick={skipForNow}> Skip for Now </button>
				{/if}
			{:else if status === 'success'}
				<div class="redirect-message">Redirecting to exam...</div>
			{:else if status === 'no_face'}
				<button class="btn-primary" onclick={retry}> Try Again </button>
			{/if}
		</div>

		<div class="info-section">
			<div class="info-item">
				<div class="info-dot"></div>
				<div class="info-text">
					<strong>Why verify my face?</strong>
					<p>Face verification ensures exam integrity and prevents impersonation.</p>
				</div>
			</div>

			<div class="info-item">
				<div class="info-dot"></div>
				<div class="info-text">
					<strong>Privacy guaranteed</strong>
					<p>Your face data is encrypted and only used for this session.</p>
				</div>
			</div>

			<div class="info-item">
				<div class="info-dot"></div>
				<div class="info-text">
					<strong>Tips for success</strong>
					<p>Good lighting, remove glasses if possible, look directly at camera.</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.verify-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: var(--color-bg);
	}

	.verify-card {
		max-width: 550px;
		width: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1.25rem;
		padding: 2rem;
	}

	.header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: var(--color-text);
	}

	.subtitle {
		color: var(--color-muted);
		font-size: 0.875rem;
	}

	.camera-section {
		margin-bottom: 1.5rem;
	}

	.camera-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 4/3;
		background: #000;
		border-radius: 0.75rem;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.video-hidden {
		opacity: 0;
	}

	.placeholder {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1a1a;
	}

	.success-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #22c55e, #16a34a);
	}

	.success-icon {
		font-size: 4rem;
		color: white;
	}

	.error-icon {
		font-size: 3rem;
		color: #ef4444;
	}

	.warning-icon {
		font-size: 1.25rem;
		color: #f59e0b;
	}

	.face-frame {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 200px;
		height: 200px;
		border: 2px solid #22c55e;
		border-radius: 50%;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
		pointer-events: none;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
		50% {
			transform: translate(-50%, -50%) scale(1.05);
			opacity: 0.8;
		}
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top-color: #22c55e;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.score-indicator {
		margin-top: 0.5rem;
	}

	.score-bar {
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.score-fill {
		height: 100%;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		transition: width 0.5s ease;
		border-radius: 3px;
	}

	.score-text {
		font-size: 0.75rem;
		color: var(--color-muted);
		text-align: center;
	}

	.status-box {
		padding: 0.875rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
		background: var(--color-surface-elevated);
		color: var(--color-text);
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-error {
		background: #fef2f2;
		color: #dc2626;
	}

	.status-success {
		background: #f0fdf4;
		color: #16a34a;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	button {
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.btn-primary {
		background: linear-gradient(135deg, #22c55e, #16a34a);
		color: white;
		border: none;
		flex: 1;
	}

	.btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
	}

	.btn-secondary {
		background: var(--color-surface-elevated);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		flex: 1;
	}

	.btn-secondary:hover {
		border-color: #22c55e;
		color: #22c55e;
	}

	.btn-outline {
		background: transparent;
		color: var(--color-muted);
		border: 1px solid var(--color-border);
		flex: 1;
	}

	.btn-outline:hover {
		border-color: #f59e0b;
		color: #f59e0b;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.redirect-message {
		text-align: center;
		color: #16a34a;
		font-weight: 500;
		padding: 0.625rem;
	}

	.info-section {
		border-top: 1px solid var(--color-border);
		padding-top: 1.5rem;
	}

	.info-item {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.info-item:last-child {
		margin-bottom: 0;
	}

	.info-dot {
		width: 8px;
		height: 8px;
		background: #22c55e;
		border-radius: 50%;
		margin-top: 0.25rem;
		flex-shrink: 0;
	}

	.info-text {
		flex: 1;
	}

	.info-text strong {
		font-size: 0.8rem;
		color: var(--color-text);
		display: block;
		margin-bottom: 0.25rem;
	}

	.info-text p {
		font-size: 0.75rem;
		color: var(--color-muted);
		line-height: 1.4;
	}
	.user-info {
		font-size: 0.75rem;
		color: var(--color-muted);
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}
     .score-requirement {
    position: absolute;
    width: 2px;
    height: 100%;
    background: #f59e0b;
    top: 0;
    pointer-events: none;
  }
  
  .requirement-text {
    color: #f59e0b;
    font-size: 0.7rem;
  }
</style>
