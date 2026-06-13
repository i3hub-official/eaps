// src/routes/api/exam/[examId]/start/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startSession } from '$lib/server/db/sessions.js';
import { broadcastStudentStatus } from '$lib/server/ws/server.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { isStudentEligible } from '$lib/server/db/exams.js';

export const POST: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) error(401, 'Unauthorized');
          const prisma = await getPrismaClient();

  // ── Scope eligibility guard ───────────────────────────────────────────────
  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    select: { levels: true, department: true },
  });

  if (!exam) error(404, 'Exam not found');

  if (locals.user.role === 'student') {
    const student = await prisma.user.findUnique({
      where: { id: locals.user.id },
      select: {
        level: true,
        department: { select: { name: true } },
      },
    });

    if (!student) error(401, 'Student record not found');

    const { eligible, reason } = isStudentEligible(exam, student);
    if (!eligible) error(403, reason ?? 'You are not eligible for this exam.');
  }

  // ── Resolve session — find existing or create new ─────────────────────────
  // Never trust a client-supplied session_id; derive it server-side.
  let session = await prisma.examSession.findFirst({
    where: {
      examId:    params.examId,
      studentId: locals.user.id,
      status:    { in: ['not_started', 'in_progress'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    // Create a fresh session
    session = await prisma.examSession.create({
      data: {
        examId:    params.examId,
        studentId: locals.user.id,
        status:    'not_started',
      },
    });
  }

  const started = await startSession(session.id);
  broadcastStudentStatus(started.examId, session.id, 'in_progress');

  return json({ ok: true, session_id: session.id });
};