<!-- src/lib/components/exam/ExamMonitor.svelte - WITH AI FACIAL ANALYSIS -->
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
	// getYaw/getPitch/getRoll are the SAME helpers gesture-service.ts uses to
	// read Human's rotation data. Previously this file read face.rotation.yaw
	// directly (doesn't exist on Human's result — it's face.rotation.angle.yaw,
	// with a radians fallback), which meant head-pose detection always saw 0.
	import { getYaw, getPitch, getRoll } from './gesture-service.js';

	let { sessionId }: { sessionId: string } = $props();

	// ─── Face Monitoring ──────────────────────────────────────────────────────
	const FACE_CHECK_INTERVAL_MS = 8000;
	const NO_FACE_STRIKES_BEFORE_LOG = 2;
	const FACE_MATCH_THRESHOLD = 0.7;

	// ─── AI Analysis Thresholds ──────────────────────────────────────────────
	// NOTE: several of these were tuned for a face-api.js-style metric that
	// this file was never actually able to produce (face.landmarks doesn't
	// exist on Human's result). Values marked below are rescaled for the
	// mesh-index-based metrics now used in analyzeEyes/analyzeMouth.
	const AI_THRESHOLDS = {
		// Eye tracking
		EYE_GAZE_THRESHOLD: 0.35,          // fraction of normalized yaw/pitch (rotation-based gaze proxy)
		EYE_CLOSURE_THRESHOLD: 0.22,        // eye-aspect-ratio (vertical/horizontal on mesh points); was 0.5, wrong scale
		RAPID_BLINK_THRESHOLD: 25,          // >25 blinks per minute (suspicious)
		SUSTAINED_GAZE_THRESHOLD: 4000,     // 4 seconds looking away
		LOOKING_DOWN_THRESHOLD: 0.35,       // normalized pitch (rotation-based); was tuned for nonexistent face.gaze.y
		
		// Head pose
		HEAD_TILT_THRESHOLD: 20,             // 20 degrees tilt
		HEAD_TURN_THRESHOLD: 15,             // 15 degrees turn
		SUSTAINED_HEAD_TURN: 3000,           // 3 seconds head turned
		HEAD_NOD_THRESHOLD: 10,              // 10 degrees nod
		
		// Mouth
		MOUTH_OPEN_THRESHOLD: 0.075,         // mouth-height / face-height ratio (mesh-based); was 0.5, wrong scale
		MOUTH_MOVEMENT_THRESHOLD: 0.25,      // reserved
		SUSTAINED_MOUTH_OPEN: 2000,          // 2 seconds mouth open
		WHISPER_DETECTION: true,
		
		// Gestures
		SUSPICIOUS_GESTURE_THRESHOLD: 0.5,   // 50% gesture confidence
		HAND_OVER_MOUTH_THRESHOLD: 0.4,      // 40% hand over mouth
		
		// Facial expressions
		EXPRESSION_CHANGE_THRESHOLD: 0.4,    // 40% expression change
		STRESS_SIGNAL_THRESHOLD: 0.6,        // 60% stress indicators
	};

	// ─── Violation Cooldown ──────────────────────────────────────────────────
	const VIOLATION_COOLDOWN: Record<string, number> = {
		// Existing violations
		FACE_NOT_DETECTED: 6000,
		FACE_MISMATCH: 8000,
		MULTIPLE_FACES: 5000,
		TAB_SWITCH: 8000,
		FULLSCREEN_EXIT: 10000,
		DEVTOOLS_OPEN: 20000,
		COPY_ATTEMPT: 5000,
		PASTE_ATTEMPT: 5000,
		KEYBOARD_SHORTCUT: 3000,
		FOCUS_LOSS: 4000,
		NETWORK_DROP: 8000,
		SCREEN_RECORDING: 20000,
		EXTERNAL_MONITOR: 20000,
		VIRTUAL_CAMERA: 20000,
		SUSPICIOUS_MOUSE: 15000,
		AUDIO_DETECTION: 10000,
		RAPID_FACE_CHANGE: 12000,
		BACKGROUND_CHANGE: 8000,
		IDLE_TIMEOUT: 300000,
		
		// AI violations
		SUSPICIOUS_GAZE: 10000,
		RAPID_BLINKING: 10000,
		HEAD_TURNING: 10000,
		SUSPICIOUS_MOUTH: 10000,
		LOOKING_DOWN: 10000,
		SUSPICIOUS_GESTURE: 10000,
		SUSTAINED_HEAD_TURN: 15000,
		SUSTAINED_GAZE: 15000,
		STRESS_SIGNALS: 20000,
		HAND_OVER_MOUTH: 12000,
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
		| 'background'
		| 'gaze'
		| 'blink'
		| 'head'
		| 'mouth'
		| 'gesture'
		| 'stress';

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
	// ─── Violation Batching ─────────────────────────────────────────────────────
// Violations are queued client-side and flushed together every 5s instead
// of one HTTP request per event — at high concurrent user counts, this
// turns bursty per-violation traffic into a steady, much lower request
// rate against the server.
let violationQueue: Array<{ type: string; severity: number; metadata?: Record<string, unknown> }> = [];
let flushIntervalHandle: ReturnType<typeof setInterval> | null = null;
const FLUSH_INTERVAL_MS = 5000;

	let isFullscreen = false;
	let devtoolsOpen = false;
	let idleTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let devtoolsCheckInterval: ReturnType<typeof setInterval> | null = null;
	const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

	// ─── AI Analysis State ──────────────────────────────────────────────────────
	// Eye tracking
	let gazeHistory: Array<{ x: number; y: number; timestamp: number }> = [];
	let blinkCount = 0;
	let lastBlinkTime = Date.now();
	let sustainedGazeStart: number | null = null;
	let lookingDownStart: number | null = null;
	
	// Head pose
	let headPoseHistory: Array<{ yaw: number; pitch: number; roll: number; timestamp: number }> = [];
	let sustainedHeadTurnStart: number | null = null;
	
	// Mouth
	let mouthOpenHistory: Array<{ open: number; timestamp: number }> = [];
	let mouthMovementStart: number | null = null;
	
	// Gestures
	let gestureHistory: Array<{ type: string; confidence: number; timestamp: number }> = [];
	
	// Facial expressions
	let expressionHistory: Array<{ expression: string; confidence: number; timestamp: number }> = [];
	let stressSignalCount = 0;

	// ─── Additional Restriction State ────────────────────────────────────────────
	let recordingCheckInterval: ReturnType<typeof setInterval> | null = null;
	const RECORDING_CHECK_INTERVAL_MS = 10000;

	let externalMonitorCheckInterval: ReturnType<typeof setInterval> | null = null;
	const EXTERNAL_MONITOR_CHECK_INTERVAL_MS = 15000;

	let virtualCameraCheckInterval: ReturnType<typeof setInterval> | null = null;
	const VIRTUAL_CAMERA_CHECK_INTERVAL_MS = 15000;
	let knownDeviceLabels: string[] = [];

	let mousePositions: Array<{ x: number; y: number; timestamp: number }> = [];
	let suspiciousMouseLogInterval: ReturnType<typeof setInterval> | null = null;
	const MOUSE_SAMPLE_LIMIT = 500;
	const MOUSE_ANALYSIS_INTERVAL_MS = 30000;
	const LINEAR_THRESHOLD = 0.7;
	const MAX_SPEED_THRESHOLD = 800;

	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let audioStream: MediaStream | null = null;
	let audioDetectionHandle: ReturnType<typeof setInterval> | null = null;
	const AUDIO_VOLUME_THRESHOLD = -15;
	const AUDIO_CHECK_INTERVAL_MS = 5000;

	let previousEmbedding: number[] | null = null;
	let embeddingHistory: Array<{ embedding: number[]; timestamp: number }> = [];
	const RAPID_CHANGE_THRESHOLD = 0.3;
	const MAX_EMBEDDING_HISTORY = 10;

	let previousFrameData: ImageData | null = null;
	let backgroundCheckCounter = 0;
	const BACKGROUND_CHECK_INTERVAL = 2;
	const BACKGROUND_CHANGE_THRESHOLD = 0.4;

	// ─── Blocked Keys ────────────────────────────────────────────────────────────
	const BLOCKED_KEYS = ['a', 'b', 'c', 'd', 'n', 'y', 'r', 'p', 't', 'f'];
	const BLOCKED_KEY_CODES = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyN', 'KeyY', 'KeyR', 'KeyP', 'KeyT', 'KeyF'];

	// ─── Face-mesh landmark indices (standard 468-point MediaPipe FaceMesh) ────
	// Same numbering scheme gesture-service.ts already uses for mouth/chin/
	// forehead — kept consistent here rather than relying on face-api.js
	// style accessor methods that don't exist on Human's result object.
	const LEFT_EYE_TOP = 159, LEFT_EYE_BOTTOM = 145, LEFT_EYE_OUTER = 33, LEFT_EYE_INNER = 133;
	const RIGHT_EYE_TOP = 386, RIGHT_EYE_BOTTOM = 374, RIGHT_EYE_OUTER = 263, RIGHT_EYE_INNER = 362;
	const MOUTH_TOP_IDX = 13, MOUTH_BOT_IDX = 14, CHIN_IDX = 152, FOREHEAD_IDX = 10;

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

	// Show local alert immediately — UI feedback should never wait on a
	// network round trip.
	showAlert(type as AlertType, getViolationMessage(type), severity);

	// Queue for batched delivery rather than posting immediately.
	violationQueue.push({ type, severity, metadata });

	// Critical violations (severity 3) flush immediately rather than
	// waiting up to 5s — auto-disqualification logic depends on the
	// server seeing these promptly, and a student shouldn't be able to
	// close the tab within the flush window to dodge a critical log.
	if (severity >= 3) {
		await flushViolations();
	}
}

async function flushViolations() {
	if (violationQueue.length === 0) return;
	const batch = violationQueue;
	violationQueue = [];

	try {
		const res = await fetch(`/api/assessment/session/${sessionId}/violation/batch`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ violations: batch }),
		});
		if (!res.ok) throw new Error(`Batch flush failed: ${res.status}`);

		const result = await res.json().catch(() => null);
		if (result?.autoSubmitted) {
			console.log('[Monitor] Session was auto-disqualified by the server.');
			// The kiosk page itself is responsible for reacting to a closed
			// session (e.g. redirecting to a "session ended" screen) — this
			// monitor only needs to stop generating further violations.
			stopped = true;
		}
	} catch (err) {
		console.error('[Monitor] Batch flush failed, re-queueing:', err);
		// Put the failed batch back at the front so it's retried on the
		// next flush rather than silently lost.
		violationQueue = [...batch, ...violationQueue];
	}
}

	function getViolationMessage(type: string): string {
		const messages: Record<string, string> = {
			// Existing
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
			
			// AI violations
			SUSPICIOUS_GAZE: 'Suspicious eye gaze detected - looking away from screen',
			RAPID_BLINKING: 'Rapid blinking detected - possible cheating attempt',
			HEAD_TURNING: 'Head turned away from screen',
			SUSPICIOUS_MOUTH: 'Suspicious mouth movement detected',
			LOOKING_DOWN: 'Looking down at desk/phone detected',
			SUSPICIOUS_GESTURE: 'Suspicious hand gesture detected',
			SUSTAINED_HEAD_TURN: 'Head turned away for extended period',
			SUSTAINED_GAZE: 'Looking away from screen for extended period',
			STRESS_SIGNALS: 'Stress signals detected - possible cheating',
			HAND_OVER_MOUTH: 'Hand over mouth detected - possible communication',
		};
		return messages[type] || 'Violation detected';
	}

	function showAlert(type: AlertType, message: string, severity: number) {
		const id = `${type}-${Date.now()}`;
		alerts.push({ id, type, message, severity, timestamp: Date.now() });
		console.log(`[Monitor] Alert: ${message}`);

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
		const res = await fetch(`/api/face/verify-session`, { method: 'GET' });

		if (res.ok) {
			const data = await res.json();
			isStudentVerified = data.success === true;
			console.log('[Monitor] Student verification status:', isStudentVerified);

			// Keep the local cache in sync for offline resilience.
			if (typeof window !== 'undefined') {
				sessionStorage.setItem(`face_verified_${sessionId}`, String(isStudentVerified));
			}
		} else {
			// Server unreachable or unauthorized — fall back to a locally
			// cached result rather than assuming verified.
			const cached = typeof window !== 'undefined'
				? sessionStorage.getItem(`face_verified_${sessionId}`)
				: null;
			isStudentVerified = cached === 'true';
			console.log('[Monitor] Student verification status (cached fallback):', isStudentVerified);
		}
	} catch (err) {
		console.error('[Monitor] Failed to check verification:', err);
		isStudentVerified = false;
	}
}

	// ─── AI Analysis Functions ──────────────────────────────────────────────────

	function eyeOpenness(mesh: number[][], topIdx: number, bottomIdx: number, outerIdx: number, innerIdx: number): number | null {
		const top = mesh[topIdx], bottom = mesh[bottomIdx], outer = mesh[outerIdx], inner = mesh[innerIdx];
		if (!top || !bottom || !outer || !inner) return null;
		const horizontal = distance(outer, inner);
		return horizontal > 0 ? distance(top, bottom) / horizontal : 0;
	}

	// ─── Eye Tracking Analysis ─────────────────────────────────────────────────
	// FIXED: previously called face.landmarks.getLeftEye()/getRightEye(),
	// which don't exist on Human's result (that's a face-api.js API). This
	// analyzer was a permanent no-op before. Now reads directly from
	// face.mesh at standard FaceMesh indices, and uses the head-rotation
	// angle as a gaze-direction proxy since face.gaze also doesn't exist.
	async function analyzeEyes(face: any) {
		if (!face.mesh || face.mesh.length < 468) return;

		try {
			const mesh = face.mesh as number[][];
			const leftOpenness = eyeOpenness(mesh, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_OUTER, LEFT_EYE_INNER);
			const rightOpenness = eyeOpenness(mesh, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_OUTER, RIGHT_EYE_INNER);
			if (leftOpenness == null || rightOpenness == null) return;

			const avgOpenness = (leftOpenness + rightOpenness) / 2;
			const now = Date.now();

			// Detect blinks (eyes closed)
			if (avgOpenness < AI_THRESHOLDS.EYE_CLOSURE_THRESHOLD) {
				if (now - lastBlinkTime > 100) { // Prevent double counting
					blinkCount++;
					lastBlinkTime = now;
				}
			}

			if (blinkCount > AI_THRESHOLDS.RAPID_BLINK_THRESHOLD && canLog('RAPID_BLINKING')) {
				await logViolation('RAPID_BLINKING', 2, { 
					blinkRate: blinkCount,
					timeWindow: '1min'
				});
				blinkCount = 0;
			}

			// Gaze proxy: normalized head yaw/pitch from rotation data.
			// (face.gaze never existed on Human's result — this uses the
			// same rotation source analyzeHeadPose uses, just normalized.)
			const gazeX = getYaw(face) / 90;
			const gazeY = getPitch(face) / 90;

			gazeHistory.push({ x: gazeX, y: gazeY, timestamp: now });
			if (gazeHistory.length > 100) gazeHistory.shift();

			const lookingAway = Math.abs(gazeX) > AI_THRESHOLDS.EYE_GAZE_THRESHOLD || 
							   Math.abs(gazeY) > AI_THRESHOLDS.EYE_GAZE_THRESHOLD;

			if (lookingAway) {
				if (!sustainedGazeStart) sustainedGazeStart = now;
				
				if (now - sustainedGazeStart > AI_THRESHOLDS.SUSTAINED_GAZE_THRESHOLD && canLog('SUSTAINED_GAZE')) {
					await logViolation('SUSTAINED_GAZE', 2, { 
						duration: now - sustainedGazeStart,
						gazeX, gazeY
					});
					sustainedGazeStart = null;
				}
			} else {
				sustainedGazeStart = null;
			}

			// gazeY > 0 (positive pitch) = looking down, matching getPitch's
			// convention used elsewhere (gesture-service's nod_down).
			if (gazeY > AI_THRESHOLDS.LOOKING_DOWN_THRESHOLD) {
				if (!lookingDownStart) lookingDownStart = now;
				
				if (now - lookingDownStart > 2000 && canLog('LOOKING_DOWN')) {
					await logViolation('LOOKING_DOWN', 2, { duration: now - lookingDownStart });
					lookingDownStart = null;
				}
			} else {
				lookingDownStart = null;
			}
		} catch (err) {
			console.error('[Monitor] Eye analysis error:', err);
		}
	}

	function distance(p1: number[], p2: number[]): number {
		return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
	}

	// ─── Head Pose Analysis ────────────────────────────────────────────────────
	// FIXED: previously read face.rotation.yaw/pitch/roll directly, which
	// isn't where Human puts this data (face.rotation.angle.yaw, with a
	// radians fallback) — so yaw/pitch/roll always evaluated to 0 and this
	// analyzer never actually detected anything. Now uses the same
	// getYaw/getPitch/getRoll helpers gesture-service.ts relies on.
	async function analyzeHeadPose(face: any) {
		try {
			const yaw = getYaw(face);
			const pitch = getPitch(face);
			const roll = getRoll(face);
			const now = Date.now();

			headPoseHistory.push({ yaw, pitch, roll, timestamp: now });
			if (headPoseHistory.length > 50) headPoseHistory.shift();

			const headTurned = Math.abs(yaw) > AI_THRESHOLDS.HEAD_TURN_THRESHOLD;
			
			if (headTurned) {
				if (!sustainedHeadTurnStart) sustainedHeadTurnStart = now;
				
				if (canLog('HEAD_TURNING')) {
					await logViolation('HEAD_TURNING', 2, { yaw, pitch, roll });
				}
				
				if (now - sustainedHeadTurnStart > AI_THRESHOLDS.SUSTAINED_HEAD_TURN && canLog('SUSTAINED_HEAD_TURN')) {
					await logViolation('SUSTAINED_HEAD_TURN', 3, { 
						duration: now - sustainedHeadTurnStart,
						yaw, pitch, roll
					});
					sustainedHeadTurnStart = null;
				}
			} else {
				sustainedHeadTurnStart = null;
			}

			if (Math.abs(roll) > AI_THRESHOLDS.HEAD_TILT_THRESHOLD && canLog('HEAD_TURNING')) {
				await logViolation('HEAD_TURNING', 2, { roll, type: 'tilt' });
			}
		} catch (err) {
			console.error('[Monitor] Head pose analysis error:', err);
		}
	}

	// ─── Mouth Analysis ────────────────────────────────────────────────────────
	// FIXED: previously called face.landmarks.getMouth(), which doesn't
	// exist on Human's result — this analyzer was a permanent no-op. Now
	// reads face.mesh directly using the same mouth/chin/forehead indices
	// gesture-service.ts already uses for its open-mouth gesture check, so
	// the ratio scale (~0.02–0.08, not 0–1) matches AI_THRESHOLDS.MOUTH_OPEN_THRESHOLD.
	async function analyzeMouth(face: any) {
		if (!face.mesh || face.mesh.length < 468) return;

		try {
			const mesh = face.mesh as number[][];
			const top = mesh[MOUTH_TOP_IDX], bottom = mesh[MOUTH_BOT_IDX], chin = mesh[CHIN_IDX], forehead = mesh[FOREHEAD_IDX];
			if (!top || !bottom || !chin || !forehead) return;

			const faceH = distance(forehead, chin);
			const mouthOpen = faceH > 0 ? distance(top, bottom) / faceH : 0;
			const now = Date.now();

			mouthOpenHistory.push({ open: mouthOpen, timestamp: now });
			if (mouthOpenHistory.length > 30) mouthOpenHistory.shift();

			if (mouthOpen > AI_THRESHOLDS.MOUTH_OPEN_THRESHOLD) {
				if (!mouthMovementStart) mouthMovementStart = now;
				
				if (canLog('SUSPICIOUS_MOUTH')) {
					await logViolation('SUSPICIOUS_MOUTH', 2, { 
						mouthOpen, 
						duration: now - mouthMovementStart 
					});
				}
				
				if (now - mouthMovementStart > AI_THRESHOLDS.SUSTAINED_MOUTH_OPEN && canLog('SUSPICIOUS_MOUTH')) {
					await logViolation('SUSPICIOUS_MOUTH', 2, { 
						duration: now - mouthMovementStart,
						type: 'sustained_talking'
					});
					mouthMovementStart = null;
				}
			} else {
				mouthMovementStart = null;
			}
		} catch (err) {
			console.error('[Monitor] Mouth analysis error:', err);
		}
	}

	// ─── Gesture Analysis ──────────────────────────────────────────────────────
	// FIXED: face.box from Human is an array [x, y, width, height], not an
	// object with .x/.y/.width/.height properties. Reading those properties
	// off an array previously produced NaN region coordinates, which made
	// ctx.getImageData throw on every single frame (caught silently, so this
	// analyzer never actually produced a result).
	async function analyzeGestures(face: any, video: HTMLVideoElement) {
		if (!face.mesh || !face.box) return;

		try {
			const box = face.box as [number, number, number, number] | { topLeft: number[]; bottomRight: number[] };
			const faceBounds = Array.isArray(box)
				? { x: box[0], y: box[1], width: box[2], height: box[3] }
				: {
					x: box.topLeft[0],
					y: box.topLeft[1],
					width: box.bottomRight[0] - box.topLeft[0],
					height: box.bottomRight[1] - box.topLeft[1],
				};

			const hasHandOverMouth = await detectHandOverMouth(video, faceBounds);
			
			if (hasHandOverMouth && canLog('HAND_OVER_MOUTH')) {
				await logViolation('HAND_OVER_MOUTH', 2, { 
					confidence: 0.7 
				});
			}
		} catch (err) {
			console.error('[Monitor] Gesture analysis error:', err);
		}
	}

	async function detectHandOverMouth(video: HTMLVideoElement, faceBounds: { x: number; y: number; width: number; height: number }): Promise<boolean> {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(video, 0, 0);
			
			// Get region around mouth
			const regionX = Math.max(0, faceBounds.x - faceBounds.width * 0.2);
			const regionY = Math.max(0, faceBounds.y + faceBounds.height * 0.5);
			const regionW = Math.min(canvas.width - regionX, faceBounds.width * 0.4);
			const regionH = Math.min(canvas.height - regionY, faceBounds.height * 0.3);

			if (regionW <= 0 || regionH <= 0) return false;

			const mouthRegion = ctx.getImageData(regionX, regionY, regionW, regionH);
			
			// Check for skin tone or texture changes (simplified)
			// In production, use proper hand detection model
			const data = mouthRegion.data;
			let skinPixels = 0;
			let totalPixels = data.length / 4;
			
			for (let i = 0; i < data.length; i += 4) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				
				// Simple skin color detection
				if (r > 80 && g > 40 && b > 20 && 
					r > g && r > b && 
					Math.abs(r - g) > 15) {
					skinPixels++;
				}
			}
			
			return (skinPixels / totalPixels) > 0.3;
		} catch (err) {
			return false;
		}
	}

	// ─── Facial Expression Analysis ────────────────────────────────────────────
	async function analyzeExpression(face: any) {
		if (!face.expressions) return;

		try {
			const expressions = face.expressions;
			const now = Date.now();
			
			// Check for stress signals
			let stressScore = 0;
			
			// Common stress indicators in facial expressions
			if (expressions.anger > 0.3) stressScore += 0.3;
			if (expressions.fear > 0.3) stressScore += 0.3;
			if (expressions.sadness > 0.3) stressScore += 0.2;
			if (expressions.surprise > 0.4) stressScore += 0.2;
			
			// Track stress signals
			if (stressScore > AI_THRESHOLDS.STRESS_SIGNAL_THRESHOLD) {
				stressSignalCount++;
				
				if (stressSignalCount > 3 && canLog('STRESS_SIGNALS')) {
					await logViolation('STRESS_SIGNALS', 2, { 
						stressScore,
						expressions: {
							anger: expressions.anger,
							fear: expressions.fear,
							sadness: expressions.sadness,
							surprise: expressions.surprise
						}
					});
					stressSignalCount = 0;
				}
			} else {
				stressSignalCount = Math.max(0, stressSignalCount - 1);
			}
		} catch (err) {
			console.error('[Monitor] Expression analysis error:', err);
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

			// ─── Check for Covered Camera ───────────────────────────────────────
			const isCameraCovered = await detectCoveredCamera(videoEl);
			if (isCameraCovered) {
				noFaceStrikes++;
				blurScreen('Camera appears to be covered or blocked');
				
				if (noFaceStrikes >= NO_FACE_STRIKES_BEFORE_LOG && canLog('FACE_NOT_DETECTED')) {
					status = 'violation';
					await logViolation('FACE_NOT_DETECTED', 3, { reason: 'camera_covered' });
					noFaceStrikes = 0;
				}
				return;
			}

			// ─── No Face Detected ─────────────────────────────────────────────
			if (!result?.face || result.face.length === 0) {
				noFaceStrikes++;
				blurScreen('Face not detected - please ensure you are visible');

				if (noFaceStrikes >= NO_FACE_STRIKES_BEFORE_LOG && canLog('FACE_NOT_DETECTED')) {
					status = 'violation';
					await logViolation('FACE_NOT_DETECTED', 3);
					noFaceStrikes = 0;
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

			const face = result.face[0];

			// ─── Face Matching ────────────────────────────────────────────────
			if (enrolledDescriptor && face.embedding) {
				const similarity = cosineSimilarity(face.embedding, enrolledDescriptor);
				if (similarity < FACE_MATCH_THRESHOLD) {
					status = 'violation';
					await logViolation('FACE_MISMATCH', 3, { similarity: Math.round(similarity * 100) });
					blurScreen('Face does not match enrolled profile');
					return;
				}

				await detectRapidFaceChange(face.embedding);
			}

			// ─── AI Analysis ──────────────────────────────────────────────────
			// Run all AI analyses in parallel for performance
			await Promise.all([
				analyzeEyes(face),
				analyzeHeadPose(face),
				analyzeMouth(face),
				analyzeGestures(face, videoEl!),
				analyzeExpression(face)
			]);

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
		}
	}

	// ─── Covered Camera Detection ──────────────────────────────────────────────
	async function detectCoveredCamera(video: HTMLVideoElement): Promise<boolean> {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 160;
			canvas.height = 120;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(video, 0, 0, 160, 120);
			const imageData = ctx.getImageData(0, 0, 160, 120);
			const data = imageData.data;

			let r = 0, g = 0, b = 0;
			let rVar = 0, gVar = 0, bVar = 0;
			const pixelCount = data.length / 4;

			for (let i = 0; i < data.length; i += 4) {
				r += data[i];
				g += data[i + 1];
				b += data[i + 2];
			}
			r /= pixelCount;
			g /= pixelCount;
			b /= pixelCount;

			for (let i = 0; i < data.length; i += 4) {
				rVar += Math.pow(data[i] - r, 2);
				gVar += Math.pow(data[i + 1] - g, 2);
				bVar += Math.pow(data[i + 2] - b, 2);
			}
			rVar /= pixelCount;
			gVar /= pixelCount;
			bVar /= pixelCount;

			const totalVariance = rVar + gVar + bVar;
			const isCovered = totalVariance < 100;

			if (isCovered) {
				console.log('[Monitor] Covered camera detected. Variance:', totalVariance);
			}

			return isCovered;
		} catch (err) {
			console.error('[Monitor] Covered camera detection error:', err);
			return false;
		}
	}

	// ─── Rapid Face Change Detection ────────────────────────────────────────────
	async function detectRapidFaceChange(embedding: number[]) {
		if (previousEmbedding) {
			const changeRate = cosineSimilarity(embedding, previousEmbedding);
			
			if (changeRate < RAPID_CHANGE_THRESHOLD && canLog('RAPID_FACE_CHANGE')) {
				status = 'violation';
				await logViolation('RAPID_FACE_CHANGE', 3, { changeRate });
				blurScreen('Rapid face change detected');
			}
		}

		previousEmbedding = embedding;
		embeddingHistory.push({ embedding, timestamp: Date.now() });
		
		if (embeddingHistory.length > MAX_EMBEDDING_HISTORY) {
			embeddingHistory = embeddingHistory.slice(-MAX_EMBEDDING_HISTORY);
		}
	}

	// ─── Background Change Detection ────────────────────────────────────────────
	async function detectBackgroundChange(video: HTMLVideoElement) {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 64;
			canvas.height = 48;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(video, 0, 0, 64, 48);
			const imageData = ctx.getImageData(0, 0, 64, 48);

			if (previousFrameData) {
				let diffCount = 0;
				const data1 = previousFrameData.data;
				const data2 = imageData.data;
				
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
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(d => d.kind === 'videoinput');
			
			if (knownDeviceLabels.length === 0) {
				knownDeviceLabels = videoDevices.map(d => d.label.toLowerCase());
				return;
			}

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

			const primaryScreenWidth = window.screen.width;
			const currentWidth = window.outerWidth;
			const currentHeight = window.outerHeight;
			
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

		if (mousePositions.length > MOUSE_SAMPLE_LIMIT) {
			mousePositions = mousePositions.slice(-MOUSE_SAMPLE_LIMIT);
		}
	}

	async function analyzeMouseMovement() {
		if (stopped || mousePositions.length < 50 || isScreenBlurred) return;

		try {
			let linearCount = 0;
			let totalSpeed = 0;
			let maxSpeed = 0;
			let consecutiveLinear = 0;
			let maxConsecutiveLinear = 0;

			for (let i = 1; i < mousePositions.length - 1; i++) {
				const prev = mousePositions[i - 1];
				const curr = mousePositions[i];
				const next = mousePositions[i + 1];

				const dx1 = curr.x - prev.x;
				const dy1 = curr.y - prev.y;
				const dx2 = next.x - curr.x;
				const dy2 = next.y - curr.y;
				
				const slope1 = dx1 !== 0 ? dy1 / dx1 : Infinity;
				const slope2 = dx2 !== 0 ? dy2 / dx2 : Infinity;
				
				const slopeDiff = Math.abs(slope1 - slope2);
				if (slopeDiff < 0.1) {
					linearCount++;
					consecutiveLinear++;
					maxConsecutiveLinear = Math.max(maxConsecutiveLinear, consecutiveLinear);
				} else {
					consecutiveLinear = 0;
				}

				const dx = curr.x - prev.x;
				const dy = curr.y - prev.y;
				const dt = curr.timestamp - prev.timestamp;
				const speed = Math.sqrt(dx*dx + dy*dy) / (dt + 1);
				totalSpeed += speed;
				maxSpeed = Math.max(maxSpeed, speed);
			}

			const avgSpeed = totalSpeed / (mousePositions.length - 1);
			const linearPercentage = linearCount / (mousePositions.length - 2);

			let suspicious = false;
			let reason = '';

			if (linearPercentage > LINEAR_THRESHOLD && canLog('SUSPICIOUS_MOUSE')) {
				suspicious = true;
				reason = `linear_movement_${Math.round(linearPercentage * 100)}%`;
			}

			if (maxSpeed > MAX_SPEED_THRESHOLD && canLog('SUSPICIOUS_MOUSE')) {
				suspicious = true;
				reason = `excessive_speed_${Math.round(maxSpeed)}px/s`;
			}

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

			let sum = 0;
			for (let i = 0; i < dataArray.length; i++) {
				const value = (dataArray[i] - 128) / 128;
				sum += value * value;
			}
			const rms = Math.sqrt(sum / dataArray.length);
			const volume = 20 * Math.log10(rms + 0.0001);
			const dbVolume = Math.max(-100, Math.round(volume));

			if (!audioContext || !('loudnessHistory' in audioContext)) {
				(audioContext as any).loudnessHistory = [];
			}
			const history = (audioContext as any).loudnessHistory as number[];
			history.push(dbVolume);
			if (history.length > 5) history.shift();
			
			const avg = history.reduce((a, b) => a + b, 0) / history.length;
			
			if (avg > AUDIO_VOLUME_THRESHOLD && canLog('AUDIO_DETECTION')) {
				status = 'warning';
				logViolation('AUDIO_DETECTION', 1, { 
					volume: dbVolume,
					averageVolume: Math.round(avg),
					threshold: AUDIO_VOLUME_THRESHOLD
				});
				history.length = 0;
			}

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

		if (isScreenBlurred) {
			const key = e.key.toLowerCase();
			const code = e.code;
			
			if (BLOCKED_KEYS.includes(key) || BLOCKED_KEY_CODES.includes(code)) {
				e.preventDefault();
				e.stopPropagation();
				console.log(`[Monitor] Blocked key: ${key} (screen blurred)`);
				return;
			}
			
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
		console.log('[Monitor] Initializing exam monitor with AI analysis...');
		stopped = false;

		await checkStudentVerification();
		await initFaceMonitoring();
		await initAudioDetection();

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

		flushIntervalHandle = setInterval(flushViolations, FLUSH_INTERVAL_MS);

		devtoolsCheckInterval = setInterval(() => {
			if (stopped) {
				clearInterval(devtoolsCheckInterval!);
				return;
			}
			detectDevTools();
		}, 1000);

		recordingCheckInterval = setInterval(detectScreenRecording, RECORDING_CHECK_INTERVAL_MS);
		externalMonitorCheckInterval = setInterval(detectExternalMonitors, EXTERNAL_MONITOR_CHECK_INTERVAL_MS);
		virtualCameraCheckInterval = setInterval(detectVirtualCamera, VIRTUAL_CAMERA_CHECK_INTERVAL_MS);
		suspiciousMouseLogInterval = setInterval(analyzeMouseMovement, MOUSE_ANALYSIS_INTERVAL_MS);

		resetIdleTimer();
		console.log('[Monitor] Exam monitor initialized with AI analysis');
	}

	function cleanup() {
		if (typeof document === 'undefined') return; // onDestroy can fire during SSR even though onMount (and init/listener setup) never did

		console.log('[Monitor] Cleaning up...');
		stopped = true;
		
		cleanupIntervals();
		cleanupAudio();

		if (stream) {
			stream.getTracks().forEach(t => t.stop());
			stream = null;
		}

		if (idleTimeoutHandle) {
			clearTimeout(idleTimeoutHandle);
			idleTimeoutHandle = null;
		}

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
		if (flushIntervalHandle) {
	clearInterval(flushIntervalHandle);
	flushIntervalHandle = null;
}
flushViolations(); // best-effort final flush — not awaited, cleanup shouldn't block on it

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
		class:border-green-500={isStudentVerified && !isScreenBlurred}
		class:border-red-500={isScreenBlurred}
		class:border-primary={status === 'ok' && !isStudentVerified && !isScreenBlurred}
		class:border-yellow-500={status === 'warning' && !isStudentVerified && !isScreenBlurred}
		class:border-destructive={status === 'violation' && !isStudentVerified && !isScreenBlurred}
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
			<div class="absolute top-0 right-0 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded-bl rounded-tr flex items-center gap-0.5 z-10">
				<CheckCircle class="size-2.5" />
				Verified
			</div>
			<div class="absolute inset-0 ring-2 ring-green-500 ring-offset-2 rounded-lg animate-pulse pointer-events-none" />
		{/if}
		{#if isScreenBlurred}
			<div class="absolute inset-0 flex items-center justify-center bg-red-500/20">
				<div class="text-red-400 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
					<Lock class="size-3" />
					Locked
				</div>
			</div>
		{/if}
		{#if isStudentVerified && !isScreenBlurred}
			<div class="absolute inset-0 pointer-events-none rounded-lg" style="border: 1px solid rgba(34, 197, 94, 0.3); box-shadow: inset 0 0 8px rgba(34, 197, 94, 0.2);"></div>
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
			{:else if alert.type === 'gaze' || alert.type === 'blink' || alert.type === 'head' || alert.type === 'mouth' || alert.type === 'gesture' || alert.type === 'stress'}
				<ShieldAlert class="mt-0.5 size-3.5 shrink-0" />
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
		class:border-green-500={isStudentVerified}
		class:bg-green-500={isStudentVerified && status === 'ok' && !isScreenBlurred}
		class:text-white={isScreenBlurred || (isStudentVerified && status === 'ok' && !isScreenBlurred)}
		class:border-yellow-500={status === 'warning' && !isStudentVerified && !isScreenBlurred}
		class:bg-yellow-500={status === 'warning' && !isStudentVerified && !isScreenBlurred}
		class:text-yellow-700={status === 'warning' && !isStudentVerified && !isScreenBlurred}
		class:border-destructive={status === 'violation' && !isStudentVerified && !isScreenBlurred}
		class:bg-destructive-10={status === 'violation' && !isStudentVerified && !isScreenBlurred}
		class:text-destructive={status === 'violation' && !isStudentVerified && !isScreenBlurred}
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