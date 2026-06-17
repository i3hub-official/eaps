/**
 * src/lib/exam/session-store.ts
 *
 * Client-side exam session persistence.
 * Survives hard refresh / browser crash.
 * Source of truth for UI; server is source of truth for score/time.
 *
 * Storage key: `etest_session_<sessionId>`
 */

const KEY_PREFIX = 'etest_session_';

export interface PersistedSession {
  sessionId: string;
  examId: string;
  /** questionIndex → selectedOptionId or text answer */
  answers: Record<number, string>;
  /** Last question the student was on */
  currentIndex: number;
  /**
   * Client-side ms elapsed since session start (used only for UI interpolation).
   * Server timeRemaining is always re-fetched on resume.
   */
  timeOffsetMs: number;
  /** Wall-clock time this record was last written */
  savedAt: number;
}

function storageKey(sessionId: string): string {
  return KEY_PREFIX + sessionId;
}

/** Persist full session state. Call on every answer save + index change. */
export function persistSession(state: PersistedSession): void {
  try {
    localStorage.setItem(storageKey(state.sessionId), JSON.stringify({
      ...state,
      savedAt: Date.now(),
    }));
  } catch {
    // Quota exceeded or private-browsing restriction — degrade silently.
  }
}

/** Load persisted state for a session, or null if not found / corrupt. */
export function loadSession(sessionId: string): PersistedSession | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // Validate shape minimally
    if (
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.currentIndex !== 'number' ||
      typeof parsed.answers !== 'object'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Wipe persisted state after successful submission. */
export function clearSession(sessionId: string): void {
  try {
    localStorage.removeItem(storageKey(sessionId));
  } catch {
    // ignore
  }
}

/**
 * Merge server-confirmed answers into a persisted state.
 * Server answers win (they're the authoritative record).
 * Local answers for indices not yet confirmed by server are kept.
 */
export function mergeServerAnswers(
  local: PersistedSession,
  serverAnswers: Record<number, string>,
): PersistedSession {
  return {
    ...local,
    answers: { ...local.answers, ...serverAnswers },
  };
}

/**
 * Build the pending sync queue — answers saved locally that haven't been
 * confirmed by the server yet.  `serverAnswerIndices` is the set of question
 * indices the server already has recorded.
 */
export function pendingAnswers(
  local: PersistedSession,
  serverAnswerIndices: Set<number>,
): Array<{ index: number; value: string }> {
  return Object.entries(local.answers)
    .filter(([idx]) => !serverAnswerIndices.has(Number(idx)))
    .map(([idx, value]) => ({ index: Number(idx), value }));
}