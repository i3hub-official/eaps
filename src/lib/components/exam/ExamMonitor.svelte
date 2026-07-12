<!-- src/lib/components/exam/ExamMonitor.svelte - COMPLETE WITH ALL RESTRICTIONS + BLUR ON FACE LOSS -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Eye from '@lucide/svelte/icons/eye';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Wifi from '@lucide/svelte/icons/wifi';
	import Clock from '@lucide/svelte/icons/clock';
	import Lock from '@lucide/svelte/icons/lock';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
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
		KEYBOARD_SHORTCUT: 5000,
		SCREEN_RECORDING: 30000,
		EXTERNAL_MONITOR: 30000,
		VIRTUAL_CAMERA: 30000,
		SUSPICIOUS_MOUSE: 30000,
		AUDIO_DETECTION: 15000,
		RAPID_FACE_CHANGE: 15000,
		BACKGROUND_CHANGE: 15000,
		IDLE_TIMEOUT: 300000, // 5 minutes
	};

	type Status = 'ok' | 'warning' | 'violation';
	type AlertType = 
		| 'face' 
		| 'tab' 
		| 'fullscreen' 
		| 'devtools' 
		| 'clipboard' 
		| 'network' 
		| 'idle'
		| 'recording'
		| 'monitor'
		| 'camera'
		| 'mouse'
		| 'audio'
		| 'background';

	let status = $state<Status>('ok');
	let alerts = $state<Array<{ id: string; type: AlertType; message: string; severity: number; timestamp: number }>>([]);
	let violationCount = $state(0);
	let cameraReady = $state(false);
	let isStudentVerified = $state(false);
	
	// ─── Screen Blur State ──────────────────────────────────────────────────────
	let isScreenBlurred = $state(false);
	let blurMessage = $state('');

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
	let devtoolsCheckInterval: ReturnType<typeof setInterval> | null = null;
	const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

	// ─── Additional Restriction State ────────────────────────────────────────────
	// Screen Recording
	let recordingCheckInterval: ReturnType<typeof setInterval> | null = null;
	const RECORDING_CHECK_INTERVAL_MS = 10000;

	// External Monitor
	let externalMonitorCheckInterval: ReturnType<typeof setInterval> | null = null;
	const EXTERNAL_MONITOR_CHECK_INTERVAL_MS = 15000;

	// Virtual Camera
	let virtualCameraCheckInterval: ReturnType<typeof setInterval> | null = null;
	const VIRTUAL_CAMERA_CHECK_INTERVAL_MS = 15000;
	let knownDeviceLabels: string[] = [];

	// Suspicious Mouse Movement
	let mousePositions: Array<{ x: number; y: number; timestamp: number }> = [];
	let suspiciousMouseLogInterval: ReturnType<typeof setInterval> | null = null;
	const MOUSE_SAMPLE_LIMIT = 500;
	const MOUSE_ANALYSIS_INTERVAL_MS = 30000;
	const LINEAR_THRESHOLD = 0.7;
	const MAX_SPEED_THRESHOLD = 800;

	// Audio Detection
	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let audioStream: MediaStream | null = null;
	let audioDetectionHandle: ReturnType<typeof setInterval> | null = null;
	const AUDIO_VOLUME_THRESHOLD = -15;
	const AUDIO_CHECK_INTERVAL_MS = 5000;

	// Rapid Face Change
	let previousEmbedding: number[] | null = null;
	let embeddingHistory: Array<{ embedding: number[]; timestamp: number }> = [];
	const RAPID_CHANGE_THRESHOLD = 0.3;
	const MAX_EMBEDDING_HISTORY = 10;

	// Background Change
	let previousFrameData: ImageData | null = null;
	let backgroundCheckCounter = 0;
	const BACKGROUND_CHECK_INTERVAL = 2; // Check every N face checks
	const BACKGROUND_CHANGE_THRESHOLD = 0.4;

	// ─── Blocked Keys ────────────────────────────────────────────────────────────
	const BLOCKED_KEYS = ['a', 'b', 'c', 'd', 'n', 'y', 'r', 'p', 't', 'f'];
	const BLOCKED_KEY_CODES = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyN', 'KeyY', 'KeyR', 'KeyP', 'KeyT', 'KeyF'];

	// ─── Utility Functions ──────────────────────────────────────────────────────

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
			SCREEN_RECORDING: 'Screen recording detected',
			EXTERNAL_MONITOR: 'External monitor detected',
			VIRTUAL_CAMERA: 'Virtual camera detected',
			SUSPICIOUS_MOUSE: 'Suspicious mouse activity detected',
			AUDIO_DETECTION: 'Suspicious audio detected',
			RAPID_FACE_CHANGE: 'Rapid face change detected',
			BACKGROUND_CHANGE: 'Background change detected',
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

	// ─── Screen Blur Functions ──────────────────────────────────────────────────
	function blurScreen(message: string = 'Camera access required') {
		if (!isScreenBlurred) {
			isScreenBlurred = true;
			blurMessage = message;
			console.log('[Monitor] Screen blurred:', message);
			
			// Also log as violation if severe
			if (message.includes('not detected') || message.includes('covered')) {
				logViolation('FACE_NOT_DETECTED', 3);
			}
		}
	}

	function unblurScreen() {
		if (isScreenBlurred) {
			isScreenBlurred = false;
			blurMessage = '';
			console.log('[Monitor] Screen unblurred');
		}
	}

	// ─── Student Verification Check ────────────────────────────────────────────
	async function checkStudentVerification() {
		try {
			const res = await fetch(`/api/student/${sessionId}/verification-status`);
			if (res.ok) {
				const data = await res.json();
				isStudentVerified = data.isVerified;
				console.log('[Monitor] Student verification status:', isStudentVerified);
			}
		} catch (err) {
			console.error('[Monitor] Failed to check verification:', err);
		}
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
			blurScreen('Camera unavailable - please allow camera access');
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
				
				// Blur screen immediately on first detection failure
				if (noFaceStrikes >= 1) {
					blurScreen('Face not detected - please ensure you are visible');
				}

				if (noFaceStrikes >= NO_FACE_STRIKES_BEFORE_LOG) {
					status = 'violation';
					await logViolation('FACE_NOT_DETECTED', 3);
					noFaceStrikes = 0; // Reset after logging
				}
				return;
			}

			// ─── Face Detected - Unblur Screen ──────────────────────────────
			if (isScreenBlurred) {
				unblurScreen();
			}
			noFaceStrikes = 0;

			// ─── Multiple Faces ───────────────────────────────────────────────
			if (result.face.length > 1) {
				status = 'violation';
				await logViolation('MULTIPLE_FACES', 3, { count: result.face.length });
				blurScreen('Multiple faces detected - only one person allowed');
				return;
			}

			// ─── Face Matching ────────────────────────────────────────────────
			const face = result.face[0];
			if (enrolledDescriptor && face.embedding) {
				const similarity = cosineSimilarity(face.embedding, enrolledDescriptor);
				if (similarity < FACE_MATCH_THRESHOLD) {
					status = 'violation';
					await logViolation('FACE_MISMATCH', 3, { similarity: Math.round(similarity * 100) });
					blurScreen('Face does not match enrolled profile');
					return;
				}

				// ─── Rapid Face Change Detection ───────────────────────────────
				await detectRapidFaceChange(face.embedding);
			}

			// ─── Background Change Detection ─────────────────────────────────
			backgroundCheckCounter++;
			if (backgroundCheckCounter >= BACKGROUND_CHECK_INTERVAL) {
				await detectBackgroundChange(videoEl);
				backgroundCheckCounter = 0;
			}

			// ─── All Checks Passed ────────────────────────────────────────────
			status = 'ok';
		} catch (err) {
			console.error('[Monitor] Face check error:', err);
			// Don't blur on transient errors
		}
	}

	// ─── Rapid Face Change Detection ────────────────────────────────────────────
	async function detectRapidFaceChange(embedding: number[]) {
		if (previousEmbedding) {
			const changeRate = cosineSimilarity(embedding, previousEmbedding);
			
			// If face changed dramatically and quickly
			if (changeRate < RAPID_CHANGE_THRESHOLD && canLog('RAPID_FACE_CHANGE')) {
				status = 'violation';
				await logViolation('RAPID_FACE_CHANGE', 3, { changeRate });
				blurScreen('Rapid face change detected');
			}
		}

		previousEmbedding = embedding;
		embeddingHistory.push({ embedding, timestamp: Date.now() });
		
		// Keep only last N embeddings
		if (embeddingHistory.length > MAX_EMBEDDING_HISTORY) {
			embeddingHistory = embeddingHistory.slice(-MAX_EMBEDDING_HISTORY);
		}
	}

	// ─── Background Change Detection ────────────────────────────────────────────
	async function detectBackgroundChange(video: HTMLVideoElement) {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 64;  // Small for performance
			canvas.height = 48;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(video, 0, 0, 64, 48);
			const imageData = ctx.getImageData(0, 0, 64, 48);

			if (previousFrameData) {
				let diffCount = 0;
				const data1 = previousFrameData.data;
				const data2 = imageData.data;
				
				// Compare only background areas (not face region)
				// This is simplified - real impl would use segmentation
				for (let i = 0; i < data1.length; i += 4) {
					const diff = Math.abs(data1[i] - data2[i]) + 
								   Math.abs(data1[i+1] - data2[i+1]) + 
								   Math.abs(data1[i+2] - data2[i+2]);
					if (diff > 30) diffCount++;
				}

				const changePercent = diffCount / (data1.length / 4);
				if (changePercent > BACKGROUND_CHANGE_THRESHOLD && canLog('BACKGROUND_CHANGE')) {
					status = 'warning';
					await logViolation('BACKGROUND_CHANGE', 1, { changePercent });
				}
			}

			previousFrameData = imageData;
		} catch (err) {
			// Silently fail
		}
	}

	// ─── Screen Recording Detection ─────────────────────────────────────────────
	async function detectScreenRecording() {
		if (stopped) return;
		
		try {
			// Check for OBS/other virtual cameras
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(d => d.kind === 'videoinput');
			
			// Store known device labels for comparison
			if (knownDeviceLabels.length === 0) {
				knownDeviceLabels = videoDevices.map(d => d.label.toLowerCase());
				return;
			}

			// Check for new devices that might be screen recording
			const virtualKeywords = ['obs', 'virtual', 'snap', 'manycam', 'webcamoid', 'screen', 'capture'];
			for (const device of videoDevices) {
				const label = device.label.toLowerCase();
				const isVirtual = virtualKeywords.some(keyword => label.includes(keyword));
				
				if (isVirtual && canLog('SCREEN_RECORDING')) {
					status = 'violation';
					await logViolation('SCREEN_RECORDING', 3, { deviceLabel: device.label });
					return;
				}
			}
		} catch (err) {
			console.error('[Monitor] Screen recording detection failed:', err);
		}
	}

	// ─── External Monitor Detection ─────────────────────────────────────────────
	async function detectExternalMonitors() {
		if (stopped) return;

		try {
			// Check screen count using getScreenDetails if available
			if ('getScreenDetails' in window && typeof (window as any).getScreenDetails === 'function') {
				const screens = await (window as any).getScreenDetails();
				if (screens && screens.screens && screens.screens.length > 1) {
					if (canLog('EXTERNAL_MONITOR')) {
						status = 'violation';
						await logViolation('EXTERNAL_MONITOR', 3, { 
							screenCount: screens.screens.length 
						});
						return;
					}
				}
			}

			// Alternative: Check if window dimensions exceed primary display
			const primaryScreenWidth = window.screen.width;
			const currentWidth = window.outerWidth;
			const currentHeight = window.outerHeight;
			
			// Check for unusually large window (could be external monitor)
			if (currentWidth > primaryScreenWidth * 1.1) {
				if (canLog('EXTERNAL_MONITOR')) {
					status = 'warning';
					await logViolation('EXTERNAL_MONITOR', 2, { 
						primaryWidth: primaryScreenWidth,
						currentWidth,
						currentHeight
					});
				}
			}
		} catch (err) {
			console.error('[Monitor] External monitor detection failed:', err);
		}
	}

	// ─── Virtual Camera Detection ────────────────────────────────────────────────
	async function detectVirtualCamera() {
		if (stopped) return;

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(d => d.kind === 'videoinput');
			
			const virtualKeywords = ['virtual', 'obs', 'snap', 'manycam', 'webcamoid', 'vcam'];
			const hasVirtualCamera = videoDevices.some(device => 
				virtualKeywords.some(keyword => 
					device.label.toLowerCase().includes(keyword)
				)
			);

			if (hasVirtualCamera && canLog('VIRTUAL_CAMERA')) {
				status = 'violation';
				await logViolation('VIRTUAL_CAMERA', 3, { 
					devices: videoDevices.map(d => d.label) 
				});
			}
		} catch (err) {
			console.error('[Monitor] Virtual camera detection failed:', err);
		}
	}

	// ─── Suspicious Mouse Detection ─────────────────────────────────────────────
	function handleMouseMove(e: MouseEvent) {
		if (stopped || isScreenBlurred) return;

		mousePositions.push({
			x: e.clientX,
			y: e.clientY,
			timestamp: Date.now()
		});

		// Keep only last N positions
		if (mousePositions.length > MOUSE_SAMPLE_LIMIT) {
			mousePositions = mousePositions.slice(-MOUSE_SAMPLE_LIMIT);
		}
	}

	async function analyzeMouseMovement() {
		if (stopped || mousePositions.length < 50 || isScreenBlurred) return;

		try {
			// Check for linear movement (bots/scripts)
			let linearCount = 0;
			let totalSpeed = 0;
			let maxSpeed = 0;
			let consecutiveLinear = 0;
			let maxConsecutiveLinear = 0;

			for (let i = 1; i < mousePositions.length - 1; i++) {
				const prev = mousePositions[i - 1];
				const curr = mousePositions[i];
				const next = mousePositions[i + 1];

				// Calculate slopes
				const dx1 = curr.x - prev.x;
				const dy1 = curr.y - prev.y;
				const dx2 = next.x - curr.x;
				const dy2 = next.y - curr.y;
				
				const slope1 = dx1 !== 0 ? dy1 / dx1 : Infinity;
				const slope2 = dx2 !== 0 ? dy2 / dx2 : Infinity;
				
				// Check if slopes are similar (linear movement)
				const slopeDiff = Math.abs(slope1 - slope2);
				if (slopeDiff < 0.1) {
					linearCount++;
					consecutiveLinear++;
					maxConsecutiveLinear = Math.max(maxConsecutiveLinear, consecutiveLinear);
				} else {
					consecutiveLinear = 0;
				}

				// Calculate speed
				const dx = curr.x - prev.x;
				const dy = curr.y - prev.y;
				const dt = curr.timestamp - prev.timestamp;
				const speed = Math.sqrt(dx*dx + dy*dy) / (dt + 1);
				totalSpeed += speed;
				maxSpeed = Math.max(maxSpeed, speed);
			}

			const avgSpeed = totalSpeed / (mousePositions.length - 1);
			const linearPercentage = linearCount / (mousePositions.length - 2);

			// Detect suspicious patterns
			let suspicious = false;
			let reason = '';

			// Too linear (bot-like movement)
			if (linearPercentage > LINEAR_THRESHOLD && canLog('SUSPICIOUS_MOUSE')) {
				suspicious = true;
				reason = `linear_movement_${Math.round(linearPercentage * 100)}%`;
			}

			// Too fast (automated)
			if (maxSpeed > MAX_SPEED_THRESHOLD && canLog('SUSPICIOUS_MOUSE')) {
				suspicious = true;
				reason = `excessive_speed_${Math.round(maxSpeed)}px/s`;
			}

			// Extremely long straight line (drawing/scripting)
			if (maxConsecutiveLinear > 30 && canLog('SUSPICIOUS_MOUSE')) {
				suspicious = true;
				reason = `long_straight_line_${maxConsecutiveLinear}_points`;
			}

			if (suspicious) {
				status = 'warning';
				await logViolation('SUSPICIOUS_MOUSE', 2, { 
					linearPercentage: Math.round(linearPercentage * 100),
					maxSpeed: Math.round(maxSpeed),
					avgSpeed: Math.round(avgSpeed),
					reason
				});
				
				// Reset after logging to prevent duplicate alerts
				mousePositions = [];
			}
		} catch (err) {
			console.error('[Monitor] Mouse analysis error:', err);
		}
	}

	// ─── Audio Detection ─────────────────────────────────────────────────────────
	async function initAudioDetection() {
		try {
			audioContext = new AudioContext();
			
			// Resume if suspended (needed for some browsers)
			if (audioContext.state === 'suspended') {
				await audioContext.resume();
			}
			
			analyser = audioContext.createAnalyser();
			analyser.fftSize = 2048;
			analyser.smoothingTimeConstant = 0.8;

			audioStream = await navigator.mediaDevices.getUserMedia({ 
				audio: { 
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				} 
			});
			
			const source = audioContext.createMediaStreamSource(audioStream);
			source.connect(analyser);

			audioDetectionHandle = setInterval(detectAudio, AUDIO_CHECK_INTERVAL_MS);
			console.log('[Monitor] Audio detection initialized');
		} catch (err) {
			console.warn('[Monitor] Audio detection unavailable:', err);
		}
	}

	function detectAudio() {
		if (stopped || !analyser || isScreenBlurred) return;

		try {
			const dataArray = new Uint8Array(analyser.fftSize);
			analyser.getByteTimeDomainData(dataArray);

			// Calculate RMS volume
			let sum = 0;
			for (let i = 0; i < dataArray.length; i++) {
				const value = (dataArray[i] - 128) / 128;
				sum += value * value;
			}
			const rms = Math.sqrt(sum / dataArray.length);
			const volume = 20 * Math.log10(rms + 0.0001);
			const dbVolume = Math.max(-100, Math.round(volume));

			// Track loudness over time to avoid false positives
			if (!audioContext || !('loudnessHistory' in audioContext)) {
				(audioContext as any).loudnessHistory = [];
			}
			const history = (audioContext as any).loudnessHistory as number[];
			history.push(dbVolume);
			if (history.length > 5) history.shift();
			
			// Check if average of last 5 readings is above threshold
			const avg = history.reduce((a, b) => a + b, 0) / history.length;
			
			if (avg > AUDIO_VOLUME_THRESHOLD && canLog('AUDIO_DETECTION')) {
				status = 'warning';
				logViolation('AUDIO_DETECTION', 1, { 
					volume: dbVolume,
					averageVolume: Math.round(avg),
					threshold: AUDIO_VOLUME_THRESHOLD
				});
				history.length = 0; // Reset after logging
			}

			// Detect background noise level
			if (dbVolume < -50) {
				console.log('[Monitor] Very low audio detected:', dbVolume);
			}
		} catch (err) {
			console.error('[Monitor] Audio analysis error:', err);
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
		if (isScreenBlurred) {
			e.preventDefault();
			return;
		}
		e.preventDefault();
		logViolation('COPY_ATTEMPT', 1);
	}

	function handlePaste(e: ClipboardEvent) {
		if (isScreenBlurred) {
			e.preventDefault();
			return;
		}
		e.preventDefault();
		logViolation('PASTE_ATTEMPT', 1);
	}

	// ─── Keyboard Shortcut Prevention ────────────────────────────────────────
	function handleKeyDown(e: KeyboardEvent) {
		const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
		const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

		// ─── Block specific keys when screen is blurred ──────────────────────
		if (isScreenBlurred) {
			const key = e.key.toLowerCase();
			const code = e.code;
			
			// Block A, B, C, D, N, Y, R, P, T, F
			if (BLOCKED_KEYS.includes(key) || BLOCKED_KEY_CODES.includes(code)) {
				e.preventDefault();
				e.stopPropagation();
				console.log(`[Monitor] Blocked key: ${key} (screen blurred)`);
				return;
			}
			
			// Also block all typing input
			if (key.length === 1 && key.match(/[a-zA-Z0-9]/)) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
		}

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

	// ─── Mouse Event Blocking ──────────────────────────────────────────────────
	function handleMouseDown(e: MouseEvent) {
		if (isScreenBlurred) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	}

	function handleMouseUp(e: MouseEvent) {
		if (isScreenBlurred) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	}

	function handleClick(e: MouseEvent) {
		if (isScreenBlurred) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	}

	function handleContextMenu(e: MouseEvent) {
		if (isScreenBlurred) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	}

	// ─── Idle Detection ───────────────────────────────────────────────────────
	function resetIdleTimer() {
		if (isScreenBlurred) return;
		
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

	// ─── Global Error Handler ──────────────────────────────────────────────────
	function handleGlobalError(err: ErrorEvent) {
		console.error('[Monitor] Global error caught:', err);
		// Don't stop monitoring on errors
	}

	// ─── Cleanup Functions ────────────────────────────────────────────────────
	function cleanupIntervals() {
		if (faceIntervalHandle) {
			clearInterval(faceIntervalHandle);
			faceIntervalHandle = null;
		}
		if (recordingCheckInterval) {
			clearInterval(recordingCheckInterval);
			recordingCheckInterval = null;
		}
		if (externalMonitorCheckInterval) {
			clearInterval(externalMonitorCheckInterval);
			externalMonitorCheckInterval = null;
		}
		if (virtualCameraCheckInterval) {
			clearInterval(virtualCameraCheckInterval);
			virtualCameraCheckInterval = null;
		}
		if (suspiciousMouseLogInterval) {
			clearInterval(suspiciousMouseLogInterval);
			suspiciousMouseLogInterval = null;
		}
		if (audioDetectionHandle) {
			clearInterval(audioDetectionHandle);
			audioDetectionHandle = null;
		}
		if (devtoolsCheckInterval) {
			clearInterval(devtoolsCheckInterval);
			devtoolsCheckInterval = null;
		}
	}

	function cleanupAudio() {
		if (audioStream) {
			audioStream.getTracks().forEach(t => t.stop());
			audioStream = null;
		}
		if (audioContext) {
			audioContext.close().catch(() => {});
			audioContext = null;
		}
		if (analyser) {
			analyser = null;
		}
	}

	// ─── Initialization ───────────────────────────────────────────────────────
	async function init() {
		console.log('[Monitor] Initializing exam monitor...');
		stopped = false;

		// Check student verification
		await checkStudentVerification();

		// Initialize face monitoring
		await initFaceMonitoring();

		// Initialize audio detection
		await initAudioDetection();

		// Set up event listeners
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
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('mouseup', handleMouseUp);
		document.addEventListener('click', handleClick);
		document.addEventListener('contextmenu', handleContextMenu);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		window.addEventListener('error', handleGlobalError);

		// DevTools check every 1 second
		devtoolsCheckInterval = setInterval(() => {
			if (stopped) {
				clearInterval(devtoolsCheckInterval!);
				return;
			}
			detectDevTools();
		}, 1000);

		// Start additional monitoring intervals
		recordingCheckInterval = setInterval(detectScreenRecording, RECORDING_CHECK_INTERVAL_MS);
		externalMonitorCheckInterval = setInterval(detectExternalMonitors, EXTERNAL_MONITOR_CHECK_INTERVAL_MS);
		virtualCameraCheckInterval = setInterval(detectVirtualCamera, VIRTUAL_CAMERA_CHECK_INTERVAL_MS);
		suspiciousMouseLogInterval = setInterval(analyzeMouseMovement, MOUSE_ANALYSIS_INTERVAL_MS);

		resetIdleTimer();
		console.log('[Monitor] Exam monitor initialized with all restrictions');
	}

	function cleanup() {
		console.log('[Monitor] Cleaning up...');
		stopped = true;
		
		// Clear all intervals
		cleanupIntervals();
		
		// Cleanup audio
		cleanupAudio();

		// Stop camera
		if (stream) {
			stream.getTracks().forEach(t => t.stop());
			stream = null;
		}

		// Clear timeout
		if (idleTimeoutHandle) {
			clearTimeout(idleTimeoutHandle);
			idleTimeoutHandle = null;
		}

		// Remove event listeners
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
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mousedown', handleMouseDown);
		document.removeEventListener('mouseup', handleMouseUp);
		document.removeEventListener('click', handleClick);
		document.removeEventListener('contextmenu', handleContextMenu);
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
		window.removeEventListener('error', handleGlobalError);

		console.log('[Monitor] Cleanup complete');
	}

	onMount(init);
	onDestroy(cleanup);
</script>

<!-- ─── SCREEN BLUR OVERLAY ──────────────────────────────────────────────────── -->
{#if isScreenBlurred}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(20px);"
	>
		<div class="text-center max-w-md mx-4 p-8 rounded-2xl bg-red-500/10 border-2 border-red-500/30">
			<div class="flex justify-center mb-4">
				<div class="p-4 rounded-full bg-red-500/20">
					<Lock class="size-12 text-red-400" />
				</div>
			</div>
			<h2 class="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
				<AlertTriangle class="size-6 text-red-400" />
				Screen Locked
			</h2>
			<p class="text-red-300 text-lg mb-4">{blurMessage || 'Please show your face to continue'}</p>
			<p class="text-slate-400 text-sm">
				Keyboard and mouse are restricted until your face is detected.
				<br />
				<span class="text-xs text-slate-500">Press ESC to exit fullscreen if needed</span>
			</p>
		</div>
	</div>
{/if}

<!-- Monitor Panel (bottom-right): live camera preview + alerts + status pill -->
<div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
	<!-- Camera Feed -->
	<div
		class="relative overflow-hidden rounded-lg border-2 shadow-lg transition-all duration-300"
		class:border-primary={status === 'ok' && !isStudentVerified}
		class:border-yellow-500={status === 'warning'}
		class:border-destructive={status === 'violation'}
		class:border-green-500={isStudentVerified && status === 'ok'}
		class:border-red-500={isScreenBlurred}
		class:opacity-50={isScreenBlurred}
		style="width:112px;height:84px;"
	>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={videoEl} class="h-full w-full object-cover" muted playsinline></video>
		{#if !cameraReady}
			<div class="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
				<Eye class="size-3 mr-1" />
				Camera off
			</div>
		{/if}
		{#if isStudentVerified && status === 'ok' && !isScreenBlurred}
			<div class="absolute top-0 right-0 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded-bl rounded-tr flex items-center gap-0.5">
				<CheckCircle class="size-2.5" />
				Verified
			</div>
			<div class="absolute inset-0 ring-2 ring-green-500 ring-offset-2 rounded-lg animate-pulse" />
		{/if}
		{#if isScreenBlurred}
			<div class="absolute inset-0 flex items-center justify-center bg-red-500/20">
				<div class="text-red-400 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
					<Lock class="size-3" />
					Locked
				</div>
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
			{:else if alert.type === 'recording' || alert.type === 'camera'}
				<Monitor class="mt-0.5 size-3.5 shrink-0" />
			{:else}
				<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
			{/if}
			<span>{alert.message}</span>
		</div>
	{/each}

	<!-- Status Indicator Pill -->
	<div
		class="flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-medium shadow-lg transition-all duration-300"
		class:border-primary={status === 'ok' && !isStudentVerified && !isScreenBlurred}
		class:bg-primary-10={status === 'ok' && !isStudentVerified && !isScreenBlurred}
		class:text-primary={status === 'ok' && !isStudentVerified && !isScreenBlurred}
		class:border-green-500={isStudentVerified && status === 'ok' && !isScreenBlurred}
		class:bg-green-500={isStudentVerified && status === 'ok' && !isScreenBlurred}
		class:text-white={isScreenBlurred || (isStudentVerified && status === 'ok' && !isScreenBlurred)}
		class:border-yellow-500={status === 'warning' && !isScreenBlurred}
		class:bg-yellow-500={status === 'warning' && !isScreenBlurred}
		class:text-yellow-700={status === 'warning' && !isScreenBlurred}
		class:border-destructive={status === 'violation' && !isScreenBlurred}
		class:bg-destructive-10={status === 'violation' && !isScreenBlurred}
		class:text-destructive={status === 'violation' && !isScreenBlurred}
		class:border-red-500={isScreenBlurred}
		class:bg-red-500={isScreenBlurred}
	>
		<div
			class="size-2 rounded-full animate-pulse"
			class:bg-primary={status === 'ok' && !isStudentVerified && !isScreenBlurred}
			class:bg-green-500={isStudentVerified && status === 'ok' && !isScreenBlurred}
			class:bg-yellow-500={status === 'warning' && !isScreenBlurred}
			class:bg-destructive={status === 'violation' && !isScreenBlurred}
			class:bg-red-500={isScreenBlurred}
		></div>
		<span class="flex items-center gap-1">
			{#if isScreenBlurred}
				<Lock class="size-3" />
				Locked
			{:else if status === 'ok'}
				{#if isStudentVerified}
					<CheckCircle class="size-3" />
					Verified
				{:else}
					<Monitor class="size-3" />
					Monitoring
				{/if}
			{:else if status === 'warning'}
				<AlertCircle class="size-3" />
				Warning ({violationCount})
			{:else}
				<XCircle class="size-3" />
				Violation ({violationCount})
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