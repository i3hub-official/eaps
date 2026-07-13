// src/lib/components/exam/gesture-service.ts

// 1. Remove 'blink' from types
export type GestureId = 'turn_left' | 'turn_right' | 'nod_up' | 'nod_down' | 'open_mouth';

export interface GestureDefinition {
  id: GestureId;
  label: string;
  icon: 'left' | 'right' | 'nod' | 'mouth'; // Cleaned up 'blink'
}

// 2. Updated clean gesture pool
export const ALL_GESTURES: GestureDefinition[] = [
  { id: 'open_mouth', label: 'Open your mouth wide', icon: 'mouth' },
  { id: 'turn_left', label: 'Turn your head left', icon: 'left' },
  { id: 'turn_right', label: 'Turn your head right', icon: 'right' },
  { id: 'nod_up', label: 'Nod your head up', icon: 'nod' },
  { id: 'nod_down', label: 'Nod your head down', icon: 'nod' },
];

const CONFIRM_FRAMES = 25;
const HIT_RATIO = 0.85;
const DECAY_RATE = 0.15;

const YAW_LEFT_THRESH = -0.20;
const YAW_RIGHT_THRESH = 0.20;
const PITCH_UP_THRESH = -0.12;
const PITCH_DOWN_THRESH = 0.12;
const MOUTH_OPEN_RATIO = 0.045;

const MOUTH_TOP_IDX = 13;
const MOUTH_BOT_IDX = 14;
const CHIN_IDX = 152;
const FOREHEAD_IDX = 10;

function dist(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function getYaw(face: any): number {
  const deg = face?.rotation?.angle?.yaw;
  if (deg != null) return deg;
  const rad = face?.angle?.yaw ?? face?.rotation?.yaw;
  if (rad != null) return rad * (180 / Math.PI);
  return 0;
}

function getPitch(face: any): number {
  const deg = face?.rotation?.angle?.pitch;
  if (deg != null) return deg;
  const rad = face?.angle?.pitch ?? face?.rotation?.pitch;
  if (rad != null) return rad * (180 / Math.PI);
  return 0;
}

function detectTurnLeft(face: any): number {
  const yaw = getYaw(face);
  if (yaw < YAW_LEFT_THRESH - 5) return 1.0;
  if (yaw < YAW_LEFT_THRESH) return 0.85;
  if (yaw < 0) return 0.30;
  return 0;
}

function detectTurnRight(face: any): number {
  const yaw = getYaw(face);
  if (yaw > YAW_RIGHT_THRESH + 5) return 1.0;
  if (yaw > YAW_RIGHT_THRESH) return 0.85;
  if (yaw > 0) return 0.30;
  return 0;
}

function detectNodUp(face: any): number {
  const pitch = getPitch(face);
  if (pitch < PITCH_UP_THRESH - 5) return 1.0;
  if (pitch < PITCH_UP_THRESH) return 0.85;
  if (pitch < 0) return 0.30;
  return 0;
}

function detectNodDown(face: any): number {
  const pitch = getPitch(face);
  if (pitch > PITCH_DOWN_THRESH + 5) return 1.0;
  if (pitch > PITCH_DOWN_THRESH) return 0.85;
  if (pitch > 0) return 0.30;
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
  const faceH = dist(fore, chin);
  const ratio = faceH > 0 ? mouthH / faceH : 0;
  if (ratio > MOUTH_OPEN_RATIO + 0.02) return 1.0;
  if (ratio > MOUTH_OPEN_RATIO) return 0.85;
  return 0;
}

function humanGestureContains(gestures: Array<{ gesture: string }>, keyword: string): boolean {
  return gestures.some(g => g.gesture.toLowerCase().includes(keyword));
}

export function gestureConfidence(
  id: GestureId,
  face: any,
  humanGestures: Array<{ gesture: string }> = []
): number {
  let raw = 0;
  switch (id) {
    case 'open_mouth': raw = detectOpenMouth(face); break;
    case 'turn_left': raw = detectTurnLeft(face); break;
    case 'turn_right': raw = detectTurnRight(face); break;
    case 'nod_up': raw = detectNodUp(face); break;
    case 'nod_down': raw = detectNodDown(face); break;
  }

  let boost = 0;
  switch (id) {
    case 'turn_left':
      boost = humanGestureContains(humanGestures, 'facing left') ? 0.15 : 0;
      break;
    case 'turn_right':
      boost = humanGestureContains(humanGestures, 'facing right') ? 0.15 : 0;
      break;
    case 'nod_up':
      boost = humanGestureContains(humanGestures, 'head up') ? 0.15 : 0;
      break;
    case 'nod_down':
      boost = humanGestureContains(humanGestures, 'head down') ? 0.15 : 0;
      break;
    case 'open_mouth':
      boost = humanGestureContains(humanGestures, 'mouth') ? 0.15 : 0;
      break;
  }

  return Math.min(1, raw + boost);
}

export class GestureTracker {
  private window: number[] = [];
  holdProgress = 0;

  private readonly confirmFrames: number;
  private readonly hitRatio: number;

  constructor(opts: GestureTrackerOptions = {}) {
    this.confirmFrames = opts.confirmFrames ?? CONFIRM_FRAMES;
    this.hitRatio = opts.hitRatio ?? HIT_RATIO;
  }

  reset() {
    this.window = [];
    this.holdProgress = 0;
  }

  update(confidence: number, otherGesturesConfident: boolean = false): boolean {
    // FIX: Only treat it as an explicit attack if the conflicting action is completely undeniable (>= 0.85)
    // This allows natural facial structural changes during head rotations.
    const hit = confidence >= 0.55 && !otherGesturesConfident;

    this.window.push(confidence);
    if (this.window.length > this.confirmFrames) this.window.shift();

    if (hit) {
      this.holdProgress = Math.min(1, this.holdProgress + (1 / this.confirmFrames));
    } else {
      // If a real attack is happening, penalize heavily. Otherwise, decay normally.
      const penalty = otherGesturesConfident ? DECAY_RATE * 1.5 : DECAY_RATE;
      this.holdProgress = Math.max(0, this.holdProgress - penalty);
    }

    if (this.window.length < this.confirmFrames) return false;

    const hits = this.window.filter(c => c >= 0.55).length;
    const ratio = hits / this.confirmFrames;

    return ratio >= this.hitRatio && this.holdProgress >= 0.95;
  }
}

export interface GestureTrackerOptions {
  confirmFrames?: number;
  hitRatio?: number;
}

export function createTrackerForGesture(id: GestureId): GestureTracker {
  return new GestureTracker();
}

/**
 * Grabs one randomized horizontal head turn, then fills remaining slots up to `count`
 */
export function selectGestures(count: number): GestureDefinition[] {
  const pool = [...ALL_GESTURES];
  const selected: GestureDefinition[] = [];

  // Enforce exactly one lateral check to avoid back-to-back turn updates
  const turns = pool.filter(g => g.id === 'turn_left' || g.id === 'turn_right');
  const turn = turns[Math.floor(Math.random() * turns.length)];
  if (turn) {
    selected.push(turn);
    const turnIdx = pool.indexOf(turn);
    if (turnIdx > -1) pool.splice(turnIdx, 1);
  }

  while (selected.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Final array shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}