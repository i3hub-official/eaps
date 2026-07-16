// src/lib/client/face/passive-liveness.ts

/**
 * PassiveLivenessTracker: Measures liveness and antispoofing by observing natural behavior
 * during a 12–15 second window. No choreography required — just sit naturally.
 *
 * Criteria:
 * - ✓ At least 1 natural blink
 * - ✓ Head yaw variance ≥ 5° (natural side-to-side head movement)
 * - ✓ Gaze shift variance ≥ 0.1 (eyes naturally wander)
 * - ✓ Antispoof score (texture/lighting analysis) ≥ 0.4
 * - ✓ Liveness score (movement patterns) ≥ 0.4
 */

export interface PassiveLivenessResult {
	blinkCount: number;
	headYawVariance: number;
	headPitchVariance: number;
	headRollVariance: number;
	gazeVariance: number;
	antispoofScore: number;
	livenessScore: number;
	passed: boolean;
	failureReason?: string;
}

export class PassiveLivenessTracker {
	private blinkCount = 0;
	private headHistory: Array<{ yaw: number; pitch: number; roll: number }> = [];
	private gazeHistory: Array<{ x: number; y: number }> = [];
	private antispoofScores: number[] = [];
	private livenessScores: number[] = [];
	private frameCount = 0;
	private debugLogged = false;

	private lastEyeOpenness = 1;
	private readonly EYE_CLOSURE_THRESHOLD = 0.2;

	private readonly MIN_BLINKS = 1;
	private readonly MIN_HEAD_YAW_VARIANCE = 5; // degrees
	private readonly MIN_GAZE_VARIANCE = 0.05; // normalized magnitude
	private readonly MIN_ANTISPOOF = 0.4; // 0–1
	private readonly MIN_LIVENESS = 0.4; // 0–1

	update(face: any): void {
		if (!face) return;

		this.frameCount++;

		// ─── Blink detection (mesh-based) ──────────────────────────────────
		if (face.mesh && Array.isArray(face.mesh)) {
			const openness = calculateEyeOpennessMesh(face.mesh);
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
		// human.js gaze lives at face.rotation.gaze = { bearing, strength } — a polar
		// angle + magnitude pair, not top-level face.gaze and not {x, y}.
		const gaze = face.rotation?.gaze ?? null;

		if (gaze && typeof gaze.bearing === 'number' && typeof gaze.strength === 'number') {
			this.gazeHistory.push({
				x: Math.cos(gaze.bearing) * gaze.strength,
				y: Math.sin(gaze.bearing) * gaze.strength,
			});
		}

		// ─── Antispoof score ─────────────────────────────────────────────────
		const antiSpoofRaw = face.real ?? face.antispoof ?? 0;
		if (antiSpoofRaw > 0) {
			this.antispoofScores.push(antiSpoofRaw);
		}

		// ─── Liveness score ────────────────────────────────────────────────
		const livenessRaw = face.live ?? face.liveness ?? 0;
		if (livenessRaw > 0) {
			this.livenessScores.push(livenessRaw);
		}

		if (this.frameCount === 10) {
			console.log('[Liveness Debug] Antispoof/liveness sample at frame 10:', {
				real: face.real,
				live: face.live,
				antispoofScoresCollected: this.antispoofScores.length,
				livenessScoresCollected: this.livenessScores.length,
			});
		}
	}

	getResult(): PassiveLivenessResult {
		const headYawVariance = this.calculateVariance(this.headHistory.map(h => h.yaw));
		const headPitchVariance = this.calculateVariance(this.headHistory.map(h => h.pitch));
		const headRollVariance = this.calculateVariance(this.headHistory.map(h => h.roll));
		const gazeVariance = this.calculateGazeVariance();

		const antispoofScore = this.antispoofScores.length > 0
			? Math.max(...this.antispoofScores)
			: 0;
		const livenessScore = this.livenessScores.length > 0
			? Math.max(...this.livenessScores)
			: 0;

		const blinkOk = this.blinkCount >= this.MIN_BLINKS;
		const headOk = radiansToDegrees(headYawVariance) >= this.MIN_HEAD_YAW_VARIANCE;
		const gazeOk = gazeVariance >= this.MIN_GAZE_VARIANCE;
		const antiSpoofOk = antispoofScore >= this.MIN_ANTISPOOF;
		const livenessOk = livenessScore >= this.MIN_LIVENESS;

		const passed = blinkOk && headOk && gazeOk && antiSpoofOk && livenessOk;

		console.log('[Liveness] Assessment:', {
			blinkCount: this.blinkCount,
			blinkOk,
			headYawVarianceDegrees: Math.round(radiansToDegrees(headYawVariance) * 100) / 100,
			headHistorySize: this.headHistory.length,
			headOk,
			gazeVariance: Math.round(gazeVariance * 1000) / 1000,
			gazeHistorySize: this.gazeHistory.length,
			gazeOk,
			antispoofScore: Math.round(antispoofScore * 100) / 100,
			antiSpoofOk,
			livenessScore: Math.round(livenessScore * 100) / 100,
			livenessOk,
			passed,
			minThresholds: {
				blinkMin: this.MIN_BLINKS,
				headMin: this.MIN_HEAD_YAW_VARIANCE,
				gazeMin: this.MIN_GAZE_VARIANCE,
				antispoofMin: this.MIN_ANTISPOOF,
				livenessMin: this.MIN_LIVENESS,
			}
            
		});


        console.log('[Liveness] Raw gaze samples:', this.gazeHistory);
console.log('[Liveness] Gaze variance (unrounded):', gazeVariance);

		let failureReason = '';
		if (!blinkOk) {
			failureReason = `Blink detection (${this.blinkCount}/${this.MIN_BLINKS} blinks)`;
		} else if (!headOk) {
			const degrees = Math.round(radiansToDegrees(headYawVariance) * 100) / 100;
			failureReason = `Head movement variance (${degrees}°/${this.MIN_HEAD_YAW_VARIANCE}° - try moving your head side to side)`;
		} else if (!gazeOk) {
			failureReason = `Eye movement variance (${Math.round(gazeVariance * 100)}/${Math.round(this.MIN_GAZE_VARIANCE * 100)})`;
		} else if (!antiSpoofOk) {
			failureReason = `Spoof detection (${Math.round(antispoofScore * 100)}%/${Math.round(this.MIN_ANTISPOOF * 100)}% - check lighting)`;
		} else if (!livenessOk) {
			failureReason = `Liveness detection (${Math.round(livenessScore * 100)}%/${Math.round(this.MIN_LIVENESS * 100)}%)`;
		}

		return {
			blinkCount: this.blinkCount,
			headYawVariance: radiansToDegrees(headYawVariance),
			headPitchVariance: radiansToDegrees(headPitchVariance),
			headRollVariance: radiansToDegrees(headRollVariance),
			gazeVariance,
			antispoofScore,
			livenessScore,
			passed,
			failureReason,
		};
	}

	getProgress(): number {
		let criteria = 0;

		if (this.blinkCount >= this.MIN_BLINKS) {
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

		const maxAntispoof = this.antispoofScores.length > 0 ? Math.max(...this.antispoofScores) : 0;
		if (maxAntispoof >= this.MIN_ANTISPOOF) {
			criteria++;
		} else {
			criteria += Math.min(1, maxAntispoof / this.MIN_ANTISPOOF) * 0.2;
		}

		const maxLiveness = this.livenessScores.length > 0 ? Math.max(...this.livenessScores) : 0;
		if (maxLiveness >= this.MIN_LIVENESS) {
			criteria++;
		} else {
			criteria += Math.min(1, maxLiveness / this.MIN_LIVENESS) * 0.2;
		}

		return Math.min(1, criteria / 5);
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
	const RIGHT_EYE_INDICES = [362, 385, 387, 263, 380, 373]; // fixed duplicate 362 → 263

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