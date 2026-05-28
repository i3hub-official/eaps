// src/routes/api/exam/[examId]/start/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startSession } from '$lib/server/db/sessions.js';
import { broadcastStudentStatus } from '$lib/server/ws/server.js';
import { prisma } from '$lib/server/db/index.js';
import { isStudentEligible } from '$lib/server/db/exams.js';

export const POST: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const { session_id } = await request.json();

  // ── Scope eligibility guard ───────────────────────────────────────────────
  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    select: { levels: true, department: true },
  });

  if (!exam) error(404, 'Exam not found');

  // Only enforce scope for students — invigilators/admins can always proceed
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

  // ── Start session ─────────────────────────────────────────────────────────
  const session = await startSession(session_id);
  broadcastStudentStatus(session.examId, session_id, 'in_progress');

  return json({ ok: true });
};