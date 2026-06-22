// src/routes/lecturer/exams/[examId]/ca/+page.server.ts
//
// Lecturer CA upload page.
// Loads the exam result roster and exposes form actions for:
//   • uploadCA  — submit CA scores from the inline form
//   • removeCA  — clear CA from a single student
//   • regradeAll — re-run exam grading then re-apply CA (admin use case)

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getPrismaClient }  from '$lib/server/db/index.js';
import { requireLecturer }  from '$lib/server/auth/guards.js';
import { bulkApplyCA, removeCA } from '$lib/server/exam/grader.js';
import { UUID_RE }          from '$lib/server/exam/session-engine.js';

// ─── Ownership guard ──────────────────────────────────────────────────────────

async function loadOwnedExam(locals: App.Locals, examId: string | undefined) {
  requireLecturer(locals.user);
  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const prisma = await getPrismaClient();
  const exam   = await prisma.exam.findFirst({
    where:  { id: examId, createdBy: locals.user!.id },
    select: {
      id:         true,
      title:      true,
      status:     true,
      totalMarks: true,
      course:     { select: { code: true, title: true } },
      session:    true,
      semester:   true,
    },
  });

  if (!exam) throw error(404, 'Exam not found');
  return { exam, prisma };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals, params }) => {
  const { exam, prisma } = await loadOwnedExam(locals, params.examId);

  const caWeight   = 100 - exam.totalMarks;
  const examWeight = exam.totalMarks;

  if (caWeight <= 0) {
    // Exam was set up as 100 marks — CA cannot be applied.
    return {
      exam,
      examWeight,
      caWeight,
      caNotApplicable: true,
      roster: [],
    };
  }

  // Load all submitted sessions with their results
  const sessions = await prisma.examSession.findMany({
    where:   { examId: exam.id, status: { in: ['submitted', 'force_submitted'] } },
    orderBy: { student: { fullName: 'asc' } },
    select: {
      id:     true,
      status: true,
      student: {
        select: {
          id:           true,
          fullName:     true,
          matricNumber: true,
        },
      },
      examResult: {
        select: {
          score:           true,
          percentage:      true,
          grade:           true,
          passed:          true,
          caScore:         true,
          caMaxScore:      true,
          finalScore:      true,
          finalPercentage: true,
          finalGrade:      true,
          finalPassed:     true,
          caUploadedAt:    true,
        },
      },
    },
  });

  const roster = sessions.map(s => ({
    sessionId:       s.id,
    studentId:       s.student.id,
    fullName:        s.student.fullName,
    matricNumber:    s.student.matricNumber,
    examScore:       Number(s.examResult?.score      ?? 0),
    examPercentage:  Number(s.examResult?.percentage ?? 0),
    examGrade:       s.examResult?.grade    ?? null,
    examPassed:      s.examResult?.passed   ?? null,
    caScore:         s.examResult?.caScore  != null ? Number(s.examResult.caScore)  : null,
    caMaxScore:      s.examResult?.caMaxScore != null ? Number(s.examResult.caMaxScore) : null,
    finalScore:      s.examResult?.finalScore != null ? Number(s.examResult.finalScore) : null,
    finalPercentage: s.examResult?.finalPercentage != null ? Number(s.examResult.finalPercentage) : null,
    finalGrade:      s.examResult?.finalGrade  ?? null,
    finalPassed:     s.examResult?.finalPassed ?? null,
    caUploadedAt:    s.examResult?.caUploadedAt ?? null,
    caPending:       s.examResult?.caScore == null,
  }));

  const totalStudents  = roster.length;
  const caUploaded     = roster.filter(r => !r.caPending).length;
  const caPending      = roster.filter(r => r.caPending).length;

  return {
    exam,
    examWeight,
    caWeight,
    caNotApplicable: false,
    roster,
    totalStudents,
    caUploaded,
    caPending,
  };
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export const actions: Actions = {

  // ── Upload CA scores from the inline form ───────────────────────────────────
  uploadCA: async ({ request, locals, params }) => {
    const { exam } = await loadOwnedExam(locals, params.examId);
    const caWeight  = 100 - exam.totalMarks;

    if (caWeight <= 0) return fail(400, { error: 'CA is not applicable for this exam.' });

    const fd      = await request.formData();
    const entries: Array<{ studentId: string; caScore: number }> = [];
    const errors:  string[] = [];

    // Form fields are named: ca_[studentId] = score
    for (const [key, value] of fd.entries()) {
      if (!key.startsWith('ca_')) continue;

      const studentId = key.slice(3);
      if (!UUID_RE.test(studentId)) continue;

      const raw   = String(value).trim();
      if (raw === '' || raw === '-') continue;   // blank = skip this student

      const score = parseFloat(raw);
      if (isNaN(score) || score < 0 || score > caWeight) {
        errors.push(`${studentId}: score ${raw} out of range 0–${caWeight}`);
        continue;
      }

      entries.push({ studentId, caScore: score });
    }

    if (errors.length > 0) {
      return fail(400, { error: `Validation errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? ' …' : ''}` });
    }

    if (entries.length === 0) {
      return fail(400, { error: 'No CA scores entered. Fill in at least one score.' });
    }

    const result = await bulkApplyCA(exam.id, entries, locals.user!.id);

    return {
      success:  true,
      applied:  result.applied,
      skipped:  result.skipped,
      errorCount: result.errors.length,
      uploadErrors: result.errors,
    };
  },

  // ── Remove CA from a single student ────────────────────────────────────────
  removeCA: async ({ request, locals, params }) => {
    const { exam, prisma } = await loadOwnedExam(locals, params.examId);

    const fd        = await request.formData();
    const sessionId = String(fd.get('sessionId') ?? '').trim();
    if (!UUID_RE.test(sessionId)) return fail(400, { error: 'Invalid session id.' });

    // Confirm session belongs to this exam
    const session = await prisma.examSession.findFirst({
      where:  { id: sessionId, examId: exam.id },
      select: { id: true },
    });
    if (!session) return fail(404, { error: 'Session not found.' });

    await removeCA(sessionId);
    return { success: true, action: 'removeCA' };
  },
};