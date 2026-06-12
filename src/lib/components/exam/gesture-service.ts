// src/lib/components/exam/gesture-service.ts

export type GestureId = 'turn_left' | 'turn_right' | 'blink' | 'nod_up' | 'nod_down' | 'open_mouth';

export interface GestureDefinition {
  id:    GestureId;
  label: string;
  icon:  'left' | 'right' | 'blink' | 'nod' | 'mouth';
}

export const ALL_GESTURES: GestureDefinition[] = [
  { id: 'turn_left',   label: 'Turn your head left',  icon: 'left'  },
  { id: 'turn_right',  label: 'Turn your head right', icon: 'right' },
  { id: 'blink',       label: 'Blink both eyes',      icon: 'blink' },
  { id: 'nod_up',      label: 'Nod your head up',     icon: 'nod'   },
  { id: 'nod_down',    label: 'Nod your head down',   icon: 'nod'   },
  { id: 'open_mouth',  label: 'Open your mouth wide', icon: 'mouth' },
];

// ── Tuning ──────────────────────────────────────────────────────────────────
const CONFIRM_FRAMES = 5;      // frames needed for hold gestures
const HIT_RATIO      = 0.70;   // 70% of frames must be hits (3.5/5)
const DECAY_RATE     = 0.10;
const RISE_RATE      = 1 / CONFIRM_FRAMES;

// FIX: Thresholds are in degrees. Human's rotation.angle.yaw/pitch are in
// degrees. If your fallback path returns a float (-1..1), getYaw/getPitch
// will convert radians → degrees so these stay correct.
const YAW_LEFT_THRESH   = -0.20;  // was -12 — yaw is a float (-1..1), not degrees
const YAW_RIGHT_THRESH  =  0.20;
const PITCH_UP_THRESH   = -0.12;
const PITCH_DOWN_THRESH =  0.12;

// FIX: Raised from 0.19 → 0.25. Resting open-eye EAR in these logs is
// consistently 0.20–0.33. A real blink dips to ~0.05–0.15. The old threshold
// of 0.19 was unreachable during a normal blink within the 5-frame window.
const EAR_CLOSED_MAX  = 0.25;

const MOUTH_OPEN_RATIO = 0.045;

// ── Mesh indices ───────────────────────────────────────────────────────────
const LEFT_EYE_IDX  = [33,  160, 158, 133, 153, 144];
const RIGHT_EYE_IDX = [263, 387, 385, 362, 380, 373];
const MOUTH_TOP_IDX = 13;
const MOUTH_BOT_IDX = 14;
const CHIN_IDX      = 152;
const FOREHEAD_IDX  = 10;

// ── Helpers ─────────────────────────────────────────────────────────────────

function dist(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function ear(mesh: number[][], indices: number[]): number {
  const p = indices.map(i => mesh[i]);
  if (!p[0] || !p[3]) return 1;
  const v = dist(p[1], p[5]) + dist(p[2], p[4]);
  const h = 2 * dist(p[0], p[3]);
  return h > 0 ? v / h : 1;
}

function meanEar(mesh: number[][]): number {
  return (ear(mesh, LEFT_EYE_IDX) + ear(mesh, RIGHT_EYE_IDX)) / 2;
}

// ── Robust angle extraction ──────────────────────────────────────────────────
// FIX: Human v3 stores degrees at face.rotation.angle.{yaw,pitch}.
// Some builds fall through to face.rotation.yaw which can be a quaternion
// component or radian value. We convert radians → degrees in the fallback
// so that YAW_LEFT_THRESH / PITCH_UP_THRESH thresholds always work correctly.

function getYaw(face: any): number {
  const deg = face?.rotation?.angle?.yaw;
  if (deg != null) return deg; // ✅ already degrees

  const rad = face?.angle?.yaw ?? face?.rotation?.yaw;
  if (rad != null) return rad * (180 / Math.PI); // convert radians → degrees

  return 0;
}

function getPitch(face: any): number {
  const deg = face?.rotation?.angle?.pitch;
  if (deg != null) return deg;

  const rad = face?.angle?.pitch ?? face?.rotation?.pitch;
  if (rad != null) return rad * (180 / Math.PI);

  return 0;
}

// ── Detectors ───────────────────────────────────────────────────────────────

function detectTurnLeft(face: any): number {
  const yaw = getYaw(face);
   console.log('[detectTurnLeft] raw rotation dump:', JSON.stringify({
    angle: face?.rotation?.angle,
    rotYaw: face?.rotation?.yaw,
    angleYaw: face?.angle?.yaw,
  }));

  if (yaw < YAW_LEFT_THRESH - 5) return 1.0;
  if (yaw < YAW_LEFT_THRESH)     return 0.85;
  if (yaw < 0)                return 0.30;
  return 0;
}

function detectTurnRight(face: any): number {
  const yaw = getYaw(face);
  if (yaw > YAW_RIGHT_THRESH + 5) return 1.0;
  if (yaw > YAW_RIGHT_THRESH)     return 0.85;
  if (yaw > 0)                 return 0.30;
  return 0;
}

function detectBlink(face: any): number {
  if (!face.mesh || face.mesh.length < 400) return 0;
  const avgEar = meanEar(face.mesh as number[][]);
  // FIX: thresholds raised to match real resting EAR observed in logs
  if (avgEar < EAR_CLOSED_MAX - 0.08) return 1.0;  // very closed  (<0.17)
  if (avgEar < EAR_CLOSED_MAX)        return 0.85; // clearly closed (<0.25)
  return 0;
}

function detectNodUp(face: any): number {
  const pitch = getPitch(face);
  if (pitch < PITCH_UP_THRESH - 5) return 1.0;
  if (pitch < PITCH_UP_THRESH)     return 0.85;
  if (pitch < 0)                return 0.30;
  return 0;
}

function detectNodDown(face: any): number {
  const pitch = getPitch(face);
  if (pitch > PITCH_DOWN_THRESH + 5) return 1.0;
  if (pitch > PITCH_DOWN_THRESH)     return 0.85;
  if (pitch > 0)                  return 0.30;
  return 0;
}

function detectOpenMouth(face: any): number {
  if (!face.mesh || face.mesh.length < 200) return 0;
  const mesh = face.mesh as number[][];
  const mTop = mesh[MOUTH_TOP_IDX];
  const mBot = mesh[MOUTH_BOT_IDX];
  const chin = mesh[CHIN_IDX];
  const fore = mesh[FOREHEAD_IDX];
  if (!mTop || !mBot || !chin || !fore) return 0;
  const mouthH = dist(mTop, mBot);
  const faceH  = dist(fore, chin);
  const ratio  = faceH > 0 ? mouthH / faceH : 0;
  if (ratio > MOUTH_OPEN_RATIO + 0.02) return 1.0;
  if (ratio > MOUTH_OPEN_RATIO)        return 0.85;
  return 0;
}

// ── Human gesture string helpers ───────────────────────────────────────────

function humanGestureContains(gestures: Array<{ gesture: string }>, keyword: string): boolean {
  return gestures.some(g => g.gesture.toLowerCase().includes(keyword));
}

// ── Main confidence ─────────────────────────────────────────────────────────

export function gestureConfidence(
  id: GestureId,
  face: any,
  humanGestures: Array<{ gesture: string }> = []
): number {
  let raw = 0;
  switch (id) {
    case 'turn_left':   raw = detectTurnLeft(face);   break;
    case 'turn_right':  raw = detectTurnRight(face);  break;
    case 'blink':       raw = detectBlink(face);       break;
    case 'nod_up':      raw = detectNodUp(face);       break;
    case 'nod_down':    raw = detectNodDown(face);     break;
    case 'open_mouth':  raw = detectOpenMouth(face);   break;
  }

  let boost = 0;
  switch (id) {
    case 'turn_left':
      boost = humanGestureContains(humanGestures, 'facing left')  ? 0.15 : 0;
      break;
    case 'turn_right':
      boost = humanGestureContains(humanGestures, 'facing right') ? 0.15 : 0;
      break;
    case 'blink': {
      // FIX: Human emits "blink left eye" AND "blink right eye" as separate
      // gesture strings. Require both for a strong boost (prevents one-eye
      // squints from triggering). Boost raised to 0.40 so that when human's
      // own blink detector fires, confidence crosses 0.50 even without EAR.
      const blinkLeft  = humanGestureContains(humanGestures, 'blink left eye');
      const blinkRight = humanGestureContains(humanGestures, 'blink right eye');
      if (blinkLeft && blinkRight) boost = 0.40;
      else if (blinkLeft || blinkRight) boost = 0.15; // partial credit
      break;
    }
    case 'nod_up':
      // FIX: Human emits "head up" not just "up"
      boost = humanGestureContains(humanGestures, 'head up')   ? 0.15 : 0;
      break;
    case 'nod_down':
      // FIX: Human emits "head down" not just "down"
      boost = humanGestureContains(humanGestures, 'head down') ? 0.15 : 0;
      break;
    case 'open_mouth':
      boost = humanGestureContains(humanGestures, 'mouth') ? 0.15 : 0;
      break;
  }

  const final = Math.min(1, raw + boost);

  console.log(
    `[gestureConfidence] id=${id}, raw=${raw.toFixed(2)}, boost=${boost}, final=${final.toFixed(2)}`
  );

  return final;
}

// ── GestureTracker ───────────────────────────────────────────────────────────
// FIX: Now accepts per-instance confirmFrames and hitRatio so that blink
// (a momentary dip) and hold gestures (turn, nod) can use different windows.
//
// Usage:
//   Hold gestures → new GestureTracker()                        (defaults: 5 frames, 70% ratio)
//   Blink         → new GestureTracker({ confirmFrames: 2, hitRatio: 1.0 })

export interface GestureTrackerOptions {
  confirmFrames?: number;
  hitRatio?: number;
}

export class GestureTracker {
  private window: number[] = [];
  holdProgress = 0;

  private readonly confirmFrames: number;
  private readonly hitRatio: number;

  constructor(opts: GestureTrackerOptions = {}) {
    this.confirmFrames = opts.confirmFrames ?? CONFIRM_FRAMES;
    this.hitRatio      = opts.hitRatio      ?? HIT_RATIO;
  }

  reset() {
    this.window      = [];
    this.holdProgress = 0;
  }

  update(confidence: number): boolean {
    const hit = confidence >= 0.50;

    this.window.push(confidence);
    if (this.window.length > this.confirmFrames) this.window.shift();

    if (hit) {
      this.holdProgress = Math.min(1, this.holdProgress + 1 / this.confirmFrames);
    } else {
      this.holdProgress = Math.max(0, this.holdProgress - DECAY_RATE);
    }

    if (this.window.length < this.confirmFrames) {
      console.log(
        `[GestureTracker] window=${this.window.length}/${this.confirmFrames}, ` +
        `progress=${this.holdProgress.toFixed(2)}, hit=${hit}`
      );
      return false;
    }

    const hits     = this.window.filter(c => c >= 0.50).length;
    const ratio    = hits / this.confirmFrames;
    const confirmed = ratio >= this.hitRatio && this.holdProgress >= 0.90;

    console.log(
      `[GestureTracker] hits=${hits}/${this.confirmFrames} ratio=${ratio.toFixed(2)} ` +
      `progress=${this.holdProgress.toFixed(2)} confirmed=${confirmed}`
    );

    return confirmed;
  }
}

// ── Factory: creates the right tracker per gesture ───────────────────────────

export function createTrackerForGesture(id: GestureId): GestureTracker {
  if (id === 'blink') {
    // Blink is momentary (~2 frames). Short window, strict ratio.
    return new GestureTracker({ confirmFrames: 2, hitRatio: 1.0 });
  }
  // All other gestures are sustained holds.
  return new GestureTracker();
}

// ── Selection ───────────────────────────────────────────────────────────────

export function selectGestures(count: number): GestureDefinition[] {
  const pool = [...ALL_GESTURES];
  const selected: GestureDefinition[] = [];

  // Always include at least one head turn
  const turns = pool.filter(g => g.id === 'turn_left' || g.id === 'turn_right');
  const turn  = turns[Math.floor(Math.random() * turns.length)];
  selected.push(turn);
  pool.splice(pool.indexOf(turn), 1);

  while (selected.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}