// src/routes/api/exam/[examId]/violation/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getExamById } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent, incrementViolation, flagSession } from '$lib/server/db/sessions.js';
import { logViolation } from '$lib/server/db/violations.js';
import { finalizeSession, UUID_RE } from '$lib/server/exam/session-engine.js';
import type { FlagType, ViolationAction } from '$lib/types/exam.js';

const FLAG_TYPES = [
  'tab_switch', 'window_blur', 'fullscreen_exit',
  'copy_attempt', 'devtools_open', 'screenshot_attempt',
  'multiple_faces', 'no_face_detected', 'face_mismatch',
  'invigilator_manual',
] as const;

const IMMEDIATE_PAUSE_FLAGS: FlagType[] = [
  'multiple_faces', 'face_mismatch', 'invigilator_manual',
];

const ViolationSchema = z.object({
  flagType: z.enum(FLAG_TYPES, {
    errorMap: () => ({ message: `flagType must be one of: ${FLAG_TYPES.join(', ')}` }),
  }),
  note: z.string().max(500).optional(),
});

export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) throw error(401, 'Not authenticated');
  if (user.role !== 'student') throw error(403, 'Only students can report violations');

  const { examId } = event.params;
  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const body   = await event.request.json().catch(() => null);
  const parsed = ViolationSchema.safeParse(body);

  if (!parsed.success) {
    throw error(400, parsed.error.flatten().fieldErrors as unknown as string);
  }

  const { flagType, note } = parsed.data;

  const session = await getSessionByExamAndStudent(examId, user.id);
  if (!session) throw error(404, 'Exam session not found.');

  const exam = await getExamById(examId);
  if (!exam) throw error(404, 'Exam not found');

  // Already finished — acknowledge without mutation
  if (session.status === 'submitted' || session.status === 'force_submitted') {
    return json({
      violationCount: session.violationCount,
      maxViolations:  exam.maxViolations,
      action:         'auto_submitted' satisfies ViolationAction,
      flagType,
      sessionStatus:  session.status,
    });
  }

  const violationCount = await incrementViolation(session.id);

  let action: ViolationAction;
  let sessionStatus: string = session.status;

  if (session.status === 'flagged') {
    action = 'exam_paused';
  } else if (IMMEDIATE_PAUSE_FLAGS.includes(flagType as FlagType)) {
    await flagSession(session.id);
    action        = 'exam_paused';
    sessionStatus = 'flagged';
  } else if (violationCount >= exam.maxViolations) {
    await finalizeSession(session.id, 'force_submitted');
    action        = 'auto_submitted';
    sessionStatus = 'force_submitted';
  } else if (violationCount >= Math.ceil(exam.maxViolations / 2)) {
    action = 'invigilator_alerted';
  } else {
    action = 'warning';
  }

  await logViolation(session.id, flagType as FlagType, action, note);

  return json({
    violationCount,
    maxViolations: exam.maxViolations,
    action,
    flagType,
    sessionStatus,
  });
};