// src/lib/client/face/passive-liveness.ts

/**
 * PassiveLivenessTracker: Measures liveness and antispoofing by observing natural behavior
 * during a 12–15 second window. No choreography required — just sit naturally.
 *
 * Antispoof/liveness scoring is CONSISTENCY-based, not peak-based: a sample
 * frame with a good score doesn't carry the whole window. This matters
 * specifically against phone/photo replay attacks — a phone held up to the
 * camera will fail antispoof on most frames even if an occasional frame
 * (glare, angle) reads favorably. Requiring the majority of frames to pass
 * closes that gap; taking a max score does not.
 */

export interface PassiveLivenessResult {
	blinkCount: number;
	headYawVariance: number;
	headPitchVariance: number;
	headRollVariance: number;
	gazeVariance: number;
	antispoofScore: number;       // consistency ratio (0-1) of frames clearing PER_FRAME_ANTISPOOF_MIN
	livenessScore: number;        // consistency ratio (0-1) of frames clearing PER_FRAME_LIVENESS_MIN
	antispoofSampleCount: number;
	livenessSampleCount: number;
	passed: boolean;
	failureReason?: string;
}

export class PassiveLivenessTracker {
	private blinkCount = 0;
	private minEyeOpennessSeen = 1; // fallback signal for sparse sampling
	private headHistory: Array<{ yaw: number; pitch: number; roll: number }> = [];
	private gazeHistory: Array<{ x: number; y: number }> = [];

	private antispoofSamples: number[] = [];
	private livenessSamples: number[] = [];

	private frameCount = 0;
	private debugLogged = false;

	private lastEyeOpenness = 1;
	private readonly EYE_CLOSURE_THRESHOLD = 0.2;

	private readonly MIN_BLINKS = 1;
	private readonly MIN_HEAD_YAW_VARIANCE = 5; // degrees
	private readonly MIN_GAZE_VARIANCE = 0.05; // normalized magnitude

	// Per-frame pass threshold — a frame must clear this to count as "real"/"live"
	private readonly PER_FRAME_ANTISPOOF_MIN = 0.5;
	private readonly PER_FRAME_LIVENESS_MIN = 0.5;

	// Fraction of sampled frames that must clear the per-frame threshold.
	private readonly REQUIRED_CONSISTENCY = 0.75;
	private readonly MIN_SAMPLES_REQUIRED = 15; // guard against too-short/sparse window

	update(face: any): void {
		if (!face) return;
		this.frameCount++;

		// ─── Blink detection (mesh-based) ──────────────────────────────────
		if (face.mesh && Array.isArray(face.mesh)) {
			const openness = calculateEyeOpennessMesh(face.mesh);
			this.minEyeOpennessSeen = Math.min(this.minEyeOpennessSeen, openness);
			if (openness < this.EYE_CLOSURE_THRESHOLD && this.lastEyeOpenness >= this.EYE_CLOSURE_THRESHOLD) {
				this.blinkCount++;
				console.log(`[Liveness] Blink detected (#${this.blinkCount})`);
			}
			this.lastEyeOpenness = openness;
		}

		// ─── Head pose variance ────────────────────────────────────────────
		// human.js nests yaw/pitch/roll under face.rotation.angle, not face.rotation directly.
		const headAngle = face.rotation?.angle ?? null;

		if (headAngle && (typeof headAngle.yaw === 'number' || typeof headAngle.pitch === 'number' || typeof headAngle.roll === 'number')) {
			const yaw = headAngle.yaw ?? 0;
			const pitch = headAngle.pitch ?? 0;
			const roll = headAngle.roll ?? 0;

			this.headHistory.push({
				yaw: convertToRadians(yaw),
				pitch: convertToRadians(pitch),
				roll: convertToRadians(roll),
			});

			if (this.headHistory.length === 1 || this.headHistory.length % 30 === 0) {
				console.log('[Liveness Debug] Head rotation detected:', {
					raw: headAngle,
					historySize: this.headHistory.length,
				});
			}
		} else if (!this.debugLogged && this.frameCount < 10) {
			console.warn('[Liveness Debug] No face.rotation.angle found. face.rotation keys:', face.rotation ? Object.keys(face.rotation) : 'face.rotation is missing');
			console.warn('[Liveness Debug] Full face object keys:', Object.keys(face));
			this.debugLogged = true;
		}

		// ─── Gaze direction variance ────────────────────────────────────────
		// human.js gaze lives at face.rotation.gaze = { bearing, strength }.
		const gaze = face.rotation?.gaze ?? null;

		if (gaze && typeof gaze.bearing === 'number' && typeof gaze.strength === 'number') {
			this.gazeHistory.push({
				x: Math.cos(gaze.bearing) * gaze.strength,
				y: Math.sin(gaze.bearing) * gaze.strength,
			});
		}

		// ─── Antispoof / liveness — collect every sampled frame ────────────
		// Pushed unconditionally (not just on "good" frames) so consistency
		// scoring reflects the whole window, not a cherry-picked subset.
		const antiSpoofRaw = face.real ?? face.antispoof ?? 0;
		if (antiSpoofRaw > 0) {
			this.antispoofSamples.push(antiSpoofRaw);
		}

		const livenessRaw = face.live ?? face.liveness ?? 0;
		if (livenessRaw > 0) {
			this.livenessSamples.push(livenessRaw);
		}

		if (this.frameCount === 10) {
			console.log('[Liveness Debug] Antispoof/liveness sample at frame 10:', {
				real: face.real,
				live: face.live,
				antispoofSamplesCollected: this.antispoofSamples.length,
				livenessSamplesCollected: this.livenessSamples.length,
			});
		}
	}

	getResult(): PassiveLivenessResult {
		const headYawVariance = this.calculateVariance(this.headHistory.map(h => h.yaw));
		const headPitchVariance = this.calculateVariance(this.headHistory.map(h => h.pitch));
		const headRollVariance = this.calculateVariance(this.headHistory.map(h => h.roll));
		const gazeVariance = this.calculateGazeVariance();

		const antispoofConsistency = this.consistencyRatio(this.antispoofSamples, this.PER_FRAME_ANTISPOOF_MIN);
		const livenessConsistency = this.consistencyRatio(this.livenessSamples, this.PER_FRAME_LIVENESS_MIN);

		const blinkOk = this.blinkCount >= this.MIN_BLINKS || this.minEyeOpennessSeen < this.EYE_CLOSURE_THRESHOLD;
		const headOk = radiansToDegrees(headYawVariance) >= this.MIN_HEAD_YAW_VARIANCE;
		const gazeOk = gazeVariance >= this.MIN_GAZE_VARIANCE;

		const antiSpoofOk =
			this.antispoofSamples.length >= this.MIN_SAMPLES_REQUIRED &&
			antispoofConsistency >= this.REQUIRED_CONSISTENCY;
		const livenessOk =
			this.livenessSamples.length >= this.MIN_SAMPLES_REQUIRED &&
			livenessConsistency >= this.REQUIRED_CONSISTENCY;

		const passed = blinkOk && headOk && gazeOk && antiSpoofOk && livenessOk;

		console.log('[Liveness] Assessment:', {
			blinkCount: this.blinkCount,
			blinkOk,
			minEyeOpennessSeen: Math.round(this.minEyeOpennessSeen * 1000) / 1000,
			headYawVarianceDegrees: Math.round(radiansToDegrees(headYawVariance) * 100) / 100,
			headHistorySize: this.headHistory.length,
			headOk,
			gazeVariance: Math.round(gazeVariance * 1000) / 1000,
			gazeHistorySize: this.gazeHistory.length,
			gazeOk,
			antispoofConsistency: Math.round(antispoofConsistency * 100) / 100,
			antispoofSampleCount: this.antispoofSamples.length,
			antiSpoofOk,
			livenessConsistency: Math.round(livenessConsistency * 100) / 100,
			livenessSampleCount: this.livenessSamples.length,
			livenessOk,
			passed,
			config: {
				perFrameAntispoofMin: this.PER_FRAME_ANTISPOOF_MIN,
				perFrameLivenessMin: this.PER_FRAME_LIVENESS_MIN,
				requiredConsistency: this.REQUIRED_CONSISTENCY,
				minSamplesRequired: this.MIN_SAMPLES_REQUIRED,
				blinkMin: this.MIN_BLINKS,
				headMin: this.MIN_HEAD_YAW_VARIANCE,
				gazeMin: this.MIN_GAZE_VARIANCE,
			},
		});

		let failureReason = '';
		if (!blinkOk) {
			failureReason = `Blink detection (${this.blinkCount}/${this.MIN_BLINKS} blinks)`;
		} else if (!headOk) {
			const degrees = Math.round(radiansToDegrees(headYawVariance) * 100) / 100;
			failureReason = `Head movement variance (${degrees}°/${this.MIN_HEAD_YAW_VARIANCE}° - try moving your head side to side)`;
		} else if (!gazeOk) {
			failureReason = `Eye movement variance (${Math.round(gazeVariance * 100)}/${Math.round(this.MIN_GAZE_VARIANCE * 100)})`;
		} else if (!antiSpoofOk) {
			failureReason = `Spoof detection (${Math.round(antispoofConsistency * 100)}% consistent, ${this.antispoofSamples.length} samples - need ${Math.round(this.REQUIRED_CONSISTENCY * 100)}%+; check lighting and remove any screen/photo from view)`;
		} else if (!livenessOk) {
			failureReason = `Liveness detection (${Math.round(livenessConsistency * 100)}% consistent, ${this.livenessSamples.length} samples - need ${Math.round(this.REQUIRED_CONSISTENCY * 100)}%+)`;
		}

		return {
			blinkCount: this.blinkCount,
			headYawVariance: radiansToDegrees(headYawVariance),
			headPitchVariance: radiansToDegrees(headPitchVariance),
			headRollVariance: radiansToDegrees(headRollVariance),
			gazeVariance,
			antispoofScore: antispoofConsistency,
			livenessScore: livenessConsistency,
			antispoofSampleCount: this.antispoofSamples.length,
			livenessSampleCount: this.livenessSamples.length,
			passed,
			failureReason,
		};
	}

	getProgress(): number {
		let criteria = 0;

		if (this.blinkCount >= this.MIN_BLINKS || this.minEyeOpennessSeen < this.EYE_CLOSURE_THRESHOLD) {
			criteria++;
		} else {
			criteria += Math.min(1, this.blinkCount / this.MIN_BLINKS) * 0.2;
		}

		const headVarDegrees = radiansToDegrees(this.calculateVariance(this.headHistory.map(h => h.yaw)));
		if (headVarDegrees >= this.MIN_HEAD_YAW_VARIANCE) {
			criteria++;
		} else {
			criteria += Math.min(1, headVarDegrees / this.MIN_HEAD_YAW_VARIANCE) * 0.2;
		}

		const gazeVar = this.calculateGazeVariance();
		if (gazeVar >= this.MIN_GAZE_VARIANCE) {
			criteria++;
		} else {
			criteria += Math.min(1, gazeVar / this.MIN_GAZE_VARIANCE) * 0.2;
		}

		const antispoofConsistency = this.consistencyRatio(this.antispoofSamples, this.PER_FRAME_ANTISPOOF_MIN);
		if (antispoofConsistency >= this.REQUIRED_CONSISTENCY) {
			criteria++;
		} else {
			criteria += Math.min(1, antispoofConsistency / this.REQUIRED_CONSISTENCY) * 0.2;
		}

		const livenessConsistency = this.consistencyRatio(this.livenessSamples, this.PER_FRAME_LIVENESS_MIN);
		if (livenessConsistency >= this.REQUIRED_CONSISTENCY) {
			criteria++;
		} else {
			criteria += Math.min(1, livenessConsistency / this.REQUIRED_CONSISTENCY) * 0.2;
		}

		return Math.min(1, criteria / 5);
	}

	private consistencyRatio(samples: number[], perFrameMin: number): number {
		if (samples.length === 0) return 0;
		const passing = samples.filter(s => s >= perFrameMin).length;
		return passing / samples.length;
	}

	private calculateVariance(values: number[]): number {
		if (values.length < 2) return 0;
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const squaredDiffs = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
		const variance = squaredDiffs / values.length;
		return Math.sqrt(variance);
	}

	private calculateGazeVariance(): number {
		if (this.gazeHistory.length < 2) return 0;
		const xVar = this.calculateVariance(this.gazeHistory.map(g => g.x));
		const yVar = this.calculateVariance(this.gazeHistory.map(g => g.y));
		return Math.sqrt(xVar * xVar + yVar * yVar);
	}
}

/**
 * Calculate eye aspect ratio from the facial mesh (468+ points).
 * Returns 0–1 where 1 = fully open, 0 = fully closed.
 */
export function calculateEyeOpennessMesh(mesh: number[][]): number {
	const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
	const RIGHT_EYE_INDICES = [362, 385, 387, 263, 380, 373];

	try {
		const leftPoints = LEFT_EYE_INDICES.map(i => mesh[i]).filter(p => p);
		if (leftPoints.length >= 6) {
			const leftEAR = calculateEAR(leftPoints);
			if (leftEAR > 0) return leftEAR;
		}

		const rightPoints = RIGHT_EYE_INDICES.map(i => mesh[i]).filter(p => p);
		if (rightPoints.length >= 6) {
			const rightEAR = calculateEAR(rightPoints);
			if (rightEAR > 0) return rightEAR;
		}

		return 1;
	} catch {
		return 1;
	}
}

function calculateEAR(eyePoints: number[][]): number {
	if (eyePoints.length < 6) return 1;

	const p1 = eyePoints[0];
	const p2 = eyePoints[1];
	const p3 = eyePoints[2];
	const p4 = eyePoints[3];
	const p5 = eyePoints[4];
	const p6 = eyePoints[5];

	const vert1 = euclideanDist(p2, p6);
	const vert2 = euclideanDist(p3, p5);
	const horiz = euclideanDist(p1, p4);

	if (horiz < 0.001) return 1;

	return (vert1 + vert2) / (2 * horiz);
}

function euclideanDist(p1: number[], p2: number[]): number {
	const dx = (p2[0] || 0) - (p1[0] || 0);
	const dy = (p2[1] || 0) - (p1[1] || 0);
	return Math.sqrt(dx * dx + dy * dy);
}

export function calculateEyeOpenness(eyePoints: any[]): number {
	if (!eyePoints || eyePoints.length < 6) return 1;

	const p1 = eyePoints[0];
	const p2 = eyePoints[1];
	const p3 = eyePoints[2];
	const p4 = eyePoints[3];
	const p5 = eyePoints[4];
	const p6 = eyePoints[5];

	if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 1;

	const vertDist1 = distance(p2, p6);
	const vertDist2 = distance(p3, p5);
	const horizDist = distance(p1, p4);

	if (horizDist === 0) return 1;

	return (vertDist1 + vertDist2) / (2 * horizDist);
}

function distance(p1: any, p2: any): number {
	const dx = (p2.x || 0) - (p1.x || 0);
	const dy = (p2.y || 0) - (p1.y || 0);
	return Math.sqrt(dx * dx + dy * dy);
}

function degreesToRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians: number): number {
	return radians * (180 / Math.PI);
}

/**
 * human.js already returns rotation.angle values in radians — this is a
 * safety net against an unexpected upstream change, not normal-path logic.
 */
function convertToRadians(angle: number): number {
	if (Math.abs(angle) <= Math.PI) {
		return angle;
	}
	return degreesToRadians(angle);
}