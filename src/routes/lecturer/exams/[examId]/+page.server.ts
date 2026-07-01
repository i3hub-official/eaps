// src/routes/lecturer/exams/[examId]/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';
import { deleteExam, canModifyExam } from '$lib/server/db/exams.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  if (!uuidRegex.test(examId)) {
    throw error(404, 'Exam not found');
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true,
      levels: true,
      examDepartments: {
        include: { department: true }
      },
      _count: {
        select: { questions: true, examSessions: true }
      }
    }
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  const stats = await sql<{
    total: number;
    submitted: number;
    in_progress: number;
    not_started: number;
    avg_score: number;
    pass_count: number;
    fail_count: number;
  }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submitted,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'not_started')::int AS not_started,
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS avg_score,
       COUNT(*) FILTER (WHERE er.percentage >= $2::int)::int AS pass_count,
       COUNT(*) FILTER (WHERE er.percentage < $2::int AND er.percentage > 0)::int AS fail_count
     FROM exam_sessions es
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE es.exam_id = $1::uuid`,
    [examId, exam.passMark]
  );

  const recentSubmissions = await sql<{
    id: string;
    studentName: string;
    studentEmail: string;
    submittedAt: Date;
    score: number;
    status: string;
  }>(
    `SELECT
       es.id,
       u.full_name AS "studentName",
       u.email AS "studentEmail",
       es.submitted_at AS "submittedAt",
       er.percentage AS score,
       es.status
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE es.exam_id = $1::uuid
       AND es.status IN ('submitted', 'force_submitted')
     ORDER BY es.submitted_at DESC
     LIMIT 10`,
    [examId]
  );

  const violationStats = await sql<{
    total_violations: number;
    students_with_violations: number;
  }>(
    `SELECT
       COUNT(*)::int AS total_violations,
       COUNT(DISTINCT session_id)::int AS students_with_violations
     FROM violations
     WHERE session_id IN (
       SELECT id FROM exam_sessions WHERE exam_id = $1::uuid
     )`,
    [examId]
  );

  const departments = await prisma.examDepartment.findMany({
    where: { examId: exam.id },
    include: { department: true }
  });

  // Whether this exam can still be edited/deleted: true only if no student
  // has ever started a session (in_progress, submitted, force_submitted, etc).
  // This is independent of exam.status — a "scheduled" or even "active"
  // exam with zero started sessions is still safe to modify; a "draft"
  // exam that somehow has a started session (shouldn't normally happen,
  // but defends against manual status tampering) is NOT safe.
  const modifiable = await canModifyExam(examId);

  // Convert Decimal/Date fields to JSON-safe primitives for the client
  const serializedExam = {
    ...exam,
    marksPerQuestion:   exam.marksPerQuestion ? Number(exam.marksPerQuestion) : null,
    totalMarks:         Number(exam.totalMarks),
    passMark:           Number(exam.passMark),
    durationMinutes:    Number(exam.durationMinutes),
    lateEntryMinutes:   Number(exam.lateEntryMinutes),
    maxViolations:      Number(exam.maxViolations),
    questionsToPresent: Number(exam.questionsToPresent),
    semester:           Number(exam.semester),
    scheduledStart:     exam.scheduledStart ? exam.scheduledStart.toISOString() : null,
    scheduledEnd:       exam.scheduledEnd   ? exam.scheduledEnd.toISOString()   : null,
    createdAt:          exam.createdAt?.toISOString() ?? null,
    updatedAt:          exam.updatedAt?.toISOString() ?? null,
  };

  return {
    exam: {
      ...serializedExam,
      departments: departments.map(ed => ed.department)
    },
    modifiable,
    stats: stats[0] || {
      total: 0,
      submitted: 0,
      in_progress: 0,
      not_started: 0,
      avg_score: 0,
      pass_count: 0,
      fail_count: 0
    },
    recentSubmissions: (recentSubmissions || []).map(r => ({
      ...r,
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
      score: r.score == null ? 0 : Number(r.score),
    })),
    violationStats: violationStats[0] || {
      total_violations: 0,
      students_with_violations: 0
    },
    questionCount: exam._count.questions,
    sessionCount: exam._count.examSessions,
  };
};

export const actions: Actions = {
  // ── Publish exam (draft → scheduled) ──────────────────────────────────────
  publish: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { questions: true } } }
    });

    if (!exam) throw error(404, 'Exam not found');
    if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

    if (exam._count.questions === 0) {
      return fail(400, {
        error: 'Cannot publish exam without questions. Please add at least one question first.'
      });
    }

    if (exam.status !== 'draft') {
      return fail(400, {
        error: `Cannot publish exam with status "${exam.status}". Only draft exams can be published.`
      });
    }

    await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'scheduled',
        scheduledStart: exam.scheduledStart || new Date(),
        scheduledEnd: exam.scheduledEnd || new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });

    return { success: true, message: 'Exam published successfully!' };
  },

  // ── Activate exam (scheduled → active) ─────────────────────────────────────
  activate: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { questions: true } } }
    });

    if (!exam) throw error(404, 'Exam not found');
    if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

    if (exam._count.questions === 0) {
      return fail(400, { error: 'Cannot activate exam without questions.' });
    }

    if (exam.status !== 'scheduled') {
      return fail(400, {
        error: `Cannot activate exam with status "${exam.status}". Only scheduled exams can be activated.`
      });
    }

    await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'active',
        scheduledStart: exam.scheduledStart || new Date()
      }
    });

    return { success: true, message: 'Exam activated successfully!' };
  },

  // ── Complete exam (active → completed) ────────────────────────────────────
  complete: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { examSessions: true } } }
    });

    if (!exam) throw error(404, 'Exam not found');
    if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

    if (exam.status !== 'active') {
      return fail(400, {
        error: `Cannot complete exam with status "${exam.status}". Only active exams can be completed.`
      });
    }

    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'completed', scheduledEnd: new Date() }
    });

    return { success: true, message: 'Exam completed successfully!' };
  },

  // ── Cancel exam ────────────────────────────────────────────────────────────
  cancel: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true, status: true }
    });

    if (!exam) throw error(404, 'Exam not found');
    if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

    if (exam.status !== 'draft' && exam.status !== 'scheduled') {
      return fail(400, {
        error: `Cannot cancel exam with status "${exam.status}". Only draft or scheduled exams can be cancelled.`
      });
    }

    // Extra safety: even though status gates above should prevent this,
    // also refuse to cancel an exam that already has student activity —
    // cancelling should never be a backdoor around the "no deletion of
    // in-progress/taken exams" rule. If a session has started, the exam
    // must run its course (or be force-completed) rather than cancelled.
    const modifiable = await canModifyExam(examId);
    if (!modifiable) {
      return fail(400, {
        error: 'This exam has student activity (sessions already started) and cannot be cancelled. It must be completed instead.'
      });
    }

    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'cancelled' }
    });

    return { success: true, message: 'Exam cancelled successfully!' };
  },

  // ── Delete exam — irreversible, blocked if any student has started ────────
  delete: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const { examId } = params;

    // deleteExam itself re-verifies ownership and re-checks canModifyExam
    // server-side as the final authority — this is intentional defense in
    // depth. Even if this action were somehow reached for an exam with
    // active/in-progress/completed sessions, the underlying call refuses.
    const result = await deleteExam(examId, user.id);

    if (!result.ok) {
      return fail(400, { error: result.reason });
    }

    throw redirect(303, '/lecturer/exams');
  },
};