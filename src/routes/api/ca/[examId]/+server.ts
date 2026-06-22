// src/routes/api/ca/[examId]/+server.ts
//
// CA score upload endpoint.
// Called by the lecturer CA management page.
//
// POST /api/ca/[examId]
//   Body: { entries: Array<{ studentId: string; caScore: number }> }
//   — Bulk upload CA scores for an exam.
//
// DELETE /api/ca/[examId]
//   Body: { sessionId: string }
//   — Remove CA from a single session (e.g. incorrect entry).

import { json, error }      from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z }                from 'zod';
import { getPrismaClient }  from '$lib/server/db/index.js';
import { requireLecturer }  from '$lib/server/auth/guards.js';
import { bulkApplyCA, removeCA } from '$lib/server/exam/grader.js';
import { UUID_RE }          from '$lib/server/exam/session-engine.js';

// ─── Validation ───────────────────────────────────────────────────────────────

const BulkCASchema = z.object({
  entries: z.array(
    z.object({
      studentId: z.string().uuid(),
      caScore:   z.number().min(0),
    })
  ).min(1, 'At least one entry required'),
});

const RemoveCASchema = z.object({
  sessionId: z.string().uuid(),
});

// ─── Auth + ownership guard ───────────────────────────────────────────────────

async function assertOwnership(examId: string, userId: string) {
  if (!UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const prisma = await getPrismaClient();
  const exam   = await prisma.exam.findFirst({
    where:  { id: examId, createdBy: userId },
    select: {
      id:         true,
      totalMarks: true,
      status:     true,
      title:      true,
    },
  });

  if (!exam) throw error(404, 'Exam not found or not owned by you');

  if (exam.totalMarks >= 100) {
    throw error(400,
      `This exam has totalMarks = ${exam.totalMarks}. ` +
      `CA cannot be applied — totalMarks must be less than 100 ` +
      `(the difference is the CA weight, e.g. totalMarks = 70 means CA = 30).`
    );
  }

  return exam;
}

// ─── POST — bulk upload CA scores ─────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const user = requireLecturer(locals.user);

  await assertOwnership(params.examId!, user.id);

  const body   = await request.json().catch(() => null);
  const parsed = BulkCASchema.safeParse(body);

  if (!parsed.success) {
    return json(
      { ok: false, error: 'Invalid request', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { entries } = parsed.data;

  // Validate that no caScore exceeds the CA weight for this exam
  const prisma     = await getPrismaClient();
  const exam       = await prisma.exam.findUnique({ where: { id: params.examId! }, select: { totalMarks: true } });
  const caWeight   = 100 - Number(exam!.totalMarks);

  const overRange = entries.filter(e => e.caScore > caWeight);
  if (overRange.length > 0) {
    return json(
      {
        ok:    false,
        error: `CA weight for this exam is ${caWeight}. ` +
               `${overRange.length} entry(ies) exceed this: ` +
               overRange.map(e => `${e.studentId} (${e.caScore})`).join(', '),
      },
      { status: 400 },
    );
  }

  const result = await bulkApplyCA(params.examId!, entries, user.id);

  return json({
    ok:      true,
    applied: result.applied,
    skipped: result.skipped,
    errors:  result.errors,
    results: result.results,
  });
};

// ─── DELETE — remove CA from a session ────────────────────────────────────────

export const DELETE: RequestHandler = async ({ request, locals, params }) => {
  const user = requireLecturer(locals.user);

  await assertOwnership(params.examId!, user.id);

  const body   = await request.json().catch(() => null);
  const parsed = RemoveCASchema.safeParse(body);

  if (!parsed.success) {
    return json(
      { ok: false, error: 'Invalid request', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify the session belongs to this exam
  const prisma  = await getPrismaClient();
  const session = await prisma.examSession.findFirst({
    where:  { id: parsed.data.sessionId, examId: params.examId! },
    select: { id: true },
  });

  if (!session) throw error(404, 'Session not found in this exam');

  await removeCA(parsed.data.sessionId);

  return json({ ok: true });
};