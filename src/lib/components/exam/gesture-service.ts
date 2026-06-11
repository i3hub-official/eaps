// src/lib/components/exam/gesture-service.ts
//
// Gesture detection engine for face enrollment.
// Uses @vladmandic/human's result.gesture[] array as the primary source
// of truth, with raw mesh/angle fallbacks for reliability.
//
// Confirmation strategy: CONSECUTIVE FRAMES
//   A gesture is confirmed when it is detected continuously for
//   CONFIRM_FRAMES (8) frames at >= CONFIDENCE_THRESHOLD (0.70).
//   Any single frame miss resets the counter (but not the progress bar —
//   we use a "decay" model so minor occlusions don't feel punishing).

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

// ── Tuning constants ──────────────────────────────────────────────────────────

/** Consecutive frames the gesture must be active before confirming */
const CONFIRM_FRAMES   = 8;
/** Fraction of frames that must be "hit" inside the window (allows 1 miss per 8) */
const HIT_RATIO        = 0.875;
/** Frames we look back for the sliding window */
const WINDOW_SIZE      = CONFIRM_FRAMES;
/** How fast holdProgress decays when gesture is not detected (per frame) */
const DECAY_RATE       = 0.06;
/** How fast holdProgress rises when gesture is detected (per frame) */
const RISE_RATE        = 1 / CONFIRM_FRAMES;

// ── Raw angle thresholds (degrees) ───────────────────────────────────────────
const YAW_LEFT_DEG    = -18;   // negative yaw  → left
const YAW_RIGHT_DEG   =  18;   // positive yaw  → right
const PITCH_UP_DEG    = -12;   // negative pitch → up
const PITCH_DOWN_DEG  =  12;   // positive pitch → down

// ── Eye aspect ratio thresholds ──────────────────────────────────────────────
const EAR_OPEN_MIN    = 0.22;  // eyes considered open above this
const EAR_CLOSED_MAX  = 0.17;  // eyes considered closed below this

// ── Mouth open threshold (ratio of mouth height / face height) ───────────────
const MOUTH_OPEN_RATIO = 0.06;

// ── Mesh indices ─────────────────────────────────────────────────────────────
const LEFT_EYE_IDX  = [33,  160, 158, 133, 153, 144];
const RIGHT_EYE_IDX = [263, 387, 385, 362, 380, 373];
const MOUTH_TOP_IDX = 13;
const MOUTH_BOT_IDX = 14;
const CHIN_IDX      = 152;
const FOREHEAD_IDX  = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Per-gesture raw detectors
// Returns a confidence value 0–1 (1 = definitely detected).
// ─────────────────────────────────────────────────────────────────────────────

function detectTurnLeft(face: any): number {
  const yaw = face?.rotation?.angle?.yaw ?? face?.angle?.yaw ?? 0;
  if (yaw < YAW_LEFT_DEG - 5) return 1.0;
  if (yaw < YAW_LEFT_DEG)     return 0.75;
  return 0;
}

function detectTurnRight(face: any): number {
  const yaw = face?.rotation?.angle?.yaw ?? face?.angle?.yaw ?? 0;
  if (yaw > YAW_RIGHT_DEG + 5) return 1.0;
  if (yaw > YAW_RIGHT_DEG)     return 0.75;
  return 0;
}

function detectBlink(face: any): number {
  if (!face.mesh || face.mesh.length < 400) return 0;
  const avgEar = meanEar(face.mesh as number[][]);
  // Require both eyes to be clearly closed
  if (avgEar < EAR_CLOSED_MAX - 0.02) return 1.0;
  if (avgEar < EAR_CLOSED_MAX)        return 0.8;
  return 0;
}

function detectNodUp(face: any): number {
  const pitch = face?.rotation?.angle?.pitch ?? face?.angle?.pitch ?? 0;
  if (pitch < PITCH_UP_DEG - 5) return 1.0;
  if (pitch < PITCH_UP_DEG)     return 0.75;
  return 0;
}

function detectNodDown(face: any): number {
  const pitch = face?.rotation?.angle?.pitch ?? face?.angle?.pitch ?? 0;
  if (pitch > PITCH_DOWN_DEG + 5) return 1.0;
  if (pitch > PITCH_DOWN_DEG)     return 0.75;
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
  if (ratio > MOUTH_OPEN_RATIO)        return 0.75;
  return 0;
}

// ── Human gesture[] string helpers ───────────────────────────────────────────
// human emits strings like "head left", "head right", "blink left eye", etc.

function humanGestureContains(gestures: Array<{ gesture: string }>, keyword: string): boolean {
  return gestures.some(g => g.gesture.toLowerCase().includes(keyword));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main confidence function — combines human's gesture[] with raw detection
// ─────────────────────────────────────────────────────────────────────────────

export function gestureConfidence(id: GestureId, face: any, humanGestures: Array<{ gesture: string }>): number {
  // Raw detection (always computed)
  let raw = 0;
  switch (id) {
    case 'turn_left':   raw = detectTurnLeft(face);   break;
    case 'turn_right':  raw = detectTurnRight(face);  break;
    case 'blink':       raw = detectBlink(face);       break;
    case 'nod_up':      raw = detectNodUp(face);       break;
    case 'nod_down':    raw = detectNodDown(face);     break;
    case 'open_mouth':  raw = detectOpenMouth(face);   break;
  }

  // Human gesture string boost
  let humanBoost = 0;
  switch (id) {
    case 'turn_left':   humanBoost = humanGestureContains(humanGestures, 'head left')  ? 0.25 : 0; break;
    case 'turn_right':  humanBoost = humanGestureContains(humanGestures, 'head right') ? 0.25 : 0; break;
    case 'blink':
      humanBoost = (
        humanGestureContains(humanGestures, 'blink left')  ||
        humanGestureContains(humanGestures, 'blink right') ||
        humanGestureContains(humanGestures, 'blink')
      ) ? 0.25 : 0;
      break;
    case 'nod_up':      humanBoost = humanGestureContains(humanGestures, 'head up')   ? 0.25 : 0; break;
    case 'nod_down':    humanBoost = humanGestureContains(humanGestures, 'head down') ? 0.25 : 0; break;
    case 'open_mouth':  humanBoost = humanGestureContains(humanGestures, 'mouth open') ? 0.25 : 0; break;
  }

  return Math.min(1, raw + humanBoost);
}

// ─────────────────────────────────────────────────────────────────────────────
// GestureTracker — stateful, one instance per gesture slot
// ─────────────────────────────────────────────────────────────────────────────

export class GestureTracker {
  private window: number[]   = [];   // confidence values for last WINDOW_SIZE frames
  holdProgress               = 0;   // 0–1, drives the progress bar

  reset() {
    this.window      = [];
    this.holdProgress = 0;
  }

  /**
   * Feed one frame's confidence value.
   * Returns true when the gesture is confirmed (enough consecutive hits).
   */
  update(confidence: number): boolean {
    const hit = confidence >= 0.70;

    this.window.push(confidence);
    if (this.window.length > WINDOW_SIZE) this.window.shift();

    if (hit) {
      this.holdProgress = Math.min(1, this.holdProgress + RISE_RATE);
    } else {
      // Soft decay — small pauses don't reset the bar completely
      this.holdProgress = Math.max(0, this.holdProgress - DECAY_RATE);
    }

    if (this.window.length < WINDOW_SIZE) return false;

    const hits = this.window.filter(c => c >= 0.70).length;
    return hits / WINDOW_SIZE >= HIT_RATIO && this.holdProgress >= 0.99;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Random gesture selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Randomly select `count` gestures without repetition.
 * Always includes at least one head-turn for liveness (turn_left or turn_right).
 */
export function selectGestures(count: number): GestureDefinition[] {
  const pool = [...ALL_GESTURES];
  const selected: GestureDefinition[] = [];

  // Guarantee at least one head turn
  const turns = pool.filter(g => g.id === 'turn_left' || g.id === 'turn_right');
  const turn  = turns[Math.floor(Math.random() * turns.length)];
  selected.push(turn);
  pool.splice(pool.indexOf(turn), 1);

  // Fill remaining slots randomly
  while (selected.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Shuffle so the turn isn't always first
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}