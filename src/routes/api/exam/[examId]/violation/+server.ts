// src/routes/api/exam/[examId]/violation/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExamById } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent, incrementViolation, flagSession } from '$lib/server/db/sessions.js';
import { logViolation } from '$lib/server/db/violations.js';
import { finalizeSession, UUID_RE } from '$lib/server/exam/session-engine.js';
import type { FlagType, ViolationAction } from '$lib/types/exam.js';

const VALID_FLAGS: FlagType[] = [
  'tab_switch', 'window_blur', 'fullscreen_exit', 'copy_attempt', 'devtools_open',
  'screenshot_attempt', 'multiple_faces', 'no_face_detected', 'face_mismatch', 'invigilator_manual',
];

// Flags strong enough to pause the session for invigilator review on first occurrence.
const IMMEDIATE_PAUSE_FLAGS: FlagType[] = ['multiple_faces', 'face_mismatch', 'invigilator_manual'];

export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) throw error(401, 'Not authenticated');
  if (user.role !== 'student') throw error(403, 'Only students can report violations');

  const { examId } = event.params;
  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const body = await event.request.json().catch(() => null);
  const flagType = body?.flagType as FlagType | undefined;
  if (!flagType || !VALID_FLAGS.includes(flagType)) {
    throw error(400, 'Invalid or missing flagType');
  }
  const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined;

  const session = await getSessionByExamAndStudent(examId, user.id);
  if (!session) throw error(404, 'Exam session not found.');

  const exam = await getExamById(examId);
  if (!exam) throw error(404, 'Exam not found');

  // Already finished — acknowledge without changing anything.
  if (session.status === 'submitted' || session.status === 'force_submitted') {
    return json({
      violationCount: session.violationCount,
      maxViolations: exam.maxViolations,
      action: 'auto_submitted' satisfies ViolationAction,
      flagType,
      sessionStatus: session.status,
    });
  }

  const violationCount = await incrementViolation(session.id);

  let action: ViolationAction;
  let sessionStatus: string = session.status;

  if (session.status === 'flagged') {
    action = 'exam_paused';
  } else if (IMMEDIATE_PAUSE_FLAGS.includes(flagType)) {
    await flagSession(session.id);
    action = 'exam_paused';
    sessionStatus = 'flagged';
  } else if (violationCount >= exam.maxViolations) {
    await finalizeSession(session.id, 'force_submitted');
    action = 'auto_submitted';
    sessionStatus = 'force_submitted';
  } else if (violationCount >= Math.ceil(exam.maxViolations / 2)) {
    action = 'invigilator_alerted';
  } else {
    action = 'warning';
  }

  await logViolation(session.id, flagType, action, note);

  return json({
    violationCount,
    maxViolations: exam.maxViolations,
    action,
    flagType,
    sessionStatus,
  });
};