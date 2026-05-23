// src/routes/api/exam/[examId]/violation/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExamById } from '$lib/server/db/exams.js';
import { getSessionById, incrementViolation, forceSubmitSession } from '$lib/server/db/sessions.js';
import { logViolation } from '$lib/server/db/violations.js';
import { gradeSession } from '$lib/server/db/results.js';
import { broadcastViolation, broadcastStudentStatus } from '$lib/server/ws/server.js';
import type { FlagType, ViolationAction } from '@prisma/client';

export const POST: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const { session_id, flag_type }: { session_id: string; flag_type: FlagType } = await request.json();

  const session = await getSessionById(session_id);
  if (!session) error(404, 'Session not found');

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    return json({ ok: true, violation_count: session.violationCount, action: null });
  }

  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');

  const violationCount = await incrementViolation(session_id);

  let action: ViolationAction;
  if (violationCount >= exam.maxViolations) {
    action = 'auto_submitted';
  } else if (violationCount >= Math.floor(exam.maxViolations * 0.6)) {
    action = 'exam_paused';
  } else if (violationCount >= Math.floor(exam.maxViolations * 0.4)) {
    action = 'invigilator_alerted';
  } else {
    action = 'warning';
  }

  await logViolation(session_id, flag_type, action);

  broadcastViolation(exam.id, {
    session_id,
    student_name: locals.user.fullName,
    matric_number: locals.user.matricNumber,
    flag_type,
    action,
    violation_count: violationCount,
  });

  if (action === 'auto_submitted') {
    await forceSubmitSession(session_id);
    await gradeSession(session_id);
    broadcastStudentStatus(exam.id, session_id, 'force_submitted');
  }

  return json({ ok: true, violation_count: violationCount, action });
};