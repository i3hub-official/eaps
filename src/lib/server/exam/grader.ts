// src/lib/server/exam/grader.ts
//
// Grading model:
//
//   EXAM-ONLY (always computed on submission)
//   ─────────────────────────────────────────
//   score       = sum of marks_earned on presented questions
//   percentage  = (score / sum of presented question marks) × 100
//   grade       = MOUAU A–F derived from percentage
//   passed      = percentage >= 40
//
//   These live on ExamResult.score / .percentage / .grade / .passed.
//   They represent the exam sitting only and are NEVER overwritten by CA.
//
//   COMBINED FINAL (computed once CA is uploaded by the lecturer)
//   ─────────────────────────────────────────────────────────────
//   examWeight     = exam.totalMarks          (e.g. 70 for a 70-mark exam)
//   caWeight       = 100 - exam.totalMarks    (e.g. 30)
//   examContrib    = (examPercentage / 100) × examWeight
//   caContrib      = (caPercentage   / 100) × caWeight
//   finalScore     = examContrib + caContrib  (out of 100)
//   finalGrade     = MOUAU A–F derived from finalScore
//   finalPassed    = finalScore >= 40
//
//   These live on ExamResult.finalScore / .finalPercentage / .finalGrade / .finalPassed.
//   When null → CA has not been uploaded yet → UI shows "CA Pending" badge.
//
//   WHY totalMarks = examWeight:
//   The lecturer sets totalMarks when creating the exam.
//   BIO = 70 means the exam is worth 70/100 of the final mark; CA is 30/100.
//   A 50-mark exam means 50/100 exam, 50/100 CA. No extra field needed.

import { getPrismaClient, sql } from '$lib/server/db/index.js';

// ─── MOUAU grade scale ────────────────────────────────────────────────────────

/**
 * MOUAU 5-point grade scale.
 * Input: percentage (0–100).
 */
export function mouauGrade(percentage: number): {
  grade: string;
  points: number;
  passed: boolean;
} {
  if (percentage >= 70) return { grade: 'A', points: 5, passed: true  };
  if (percentage >= 60) return { grade: 'B', points: 4, passed: true  };
  if (percentage >= 50) return { grade: 'C', points: 3, passed: true  };
  if (percentage >= 45) return { grade: 'D', points: 2, passed: true  };
  if (percentage >= 40) return { grade: 'E', points: 1, passed: true  };
  return                       { grade: 'F', points: 0, passed: false };
}

export function getGradeDescription(grade: string): string {
  return (
    { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Fair', E: 'Pass', F: 'Fail' }[grade]
    ?? 'Unknown'
  );
}

/**
 * Calculate GPA from an array of course results.
 * Uses finalGrade when available, falls back to exam-only grade.
 */
export function calculateGPA(
  results: Array<{ grade: string; finalGrade?: string | null; creditUnits: number }>
): number {
  const pts: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  let totalPoints  = 0;
  let totalCredits = 0;
  for (const r of results) {
    const g       = r.finalGrade ?? r.grade;
    totalPoints  += (pts[g] ?? 0) * r.creditUnits;
    totalCredits += r.creditUnits;
  }
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// ─── Exam-only grading ────────────────────────────────────────────────────────

/**
 * Grade all answers for a session, write the exam-only ExamResult row,
 * and mark the session as graded.
 *
 * Does NOT touch CA or final* fields — those are populated later via applyCA().
 */
export async function gradeSession(sessionId: string): Promise<void> {
  const prisma = await getPrismaClient();

  const answers = await prisma.studentAnswer.findMany({
    where:   { sessionId },
    include: {
      question: {
        include: {
          options:     true,
          fitbAnswers: true,
        },
      },
    },
  });

  if (answers.length === 0) {
    await writeExamResult(sessionId, 0, 0, 0, 0);
    return;
  }

  let totalMarksAvailable = 0;
  let totalMarksEarned    = 0;
  let correctCount        = 0;
  let answeredCount       = 0;

  for (const answer of answers) {
    const q            = answer.question;
    const questionMarks = Number(q.marks);
    totalMarksAvailable += questionMarks;

    let isCorrect   = false;
    let marksEarned = 0;

    const hasResponse =
      answer.selectedOption !== null ||
      (answer.textAnswer !== null && answer.textAnswer.trim() !== '');

    if (hasResponse) {
      answeredCount++;

      if (q.type === 'mcq') {
        const correctOption = q.options.find(o => o.isCorrect);
        if (!correctOption) {
          console.warn(`[GRADER] Question ${q.id} (MCQ) has no correct option — skipping.`);
        } else {
          isCorrect   = answer.selectedOption === correctOption.id;
          marksEarned = isCorrect ? questionMarks : 0;
        }

      } else if (q.type === 'fill_in_the_blank') {
        if (q.fitbAnswers.length === 0) {
          console.warn(`[GRADER] Question ${q.id} (FITB) has no accepted answers — skipping.`);
        } else {
          const raw = (answer.textAnswer ?? '').trim().toLowerCase();
          isCorrect   = q.fitbAnswers.some(a => a.acceptedAnswer.trim().toLowerCase() === raw);
          marksEarned = isCorrect ? questionMarks : 0;
        }

      } else if (q.type === 'true_false') {
        const correctOption = q.options.find(o => o.isCorrect);
        if (!correctOption) {
          console.warn(`[GRADER] Question ${q.id} (true_false) has no correct option — skipping.`);
        } else {
          isCorrect   = (answer.textAnswer ?? '').trim().toLowerCase() === correctOption.optionText.trim().toLowerCase();
          marksEarned = isCorrect ? questionMarks : 0;
        }
      }
    }

    if (isCorrect) correctCount++;
    totalMarksEarned += marksEarned;

    await prisma.studentAnswer.update({
      where: { id: answer.id },
      data:  { isCorrect: hasResponse ? isCorrect : null, marksEarned },
    });
  }

  await writeExamResult(
    sessionId,
    totalMarksAvailable,
    totalMarksEarned,
    correctCount,
    answeredCount,
    answers.length,
  );

  // Run DB function non-fatally as a secondary record
  try {
    await sql(`SELECT compute_exam_result($1)`, [sessionId]);
  } catch (e) {
    console.warn('[GRADER] compute_exam_result() failed (non-fatal):', e);
  }

  await prisma.examSession.update({
    where: { id: sessionId },
    data:  { isGraded: true, score: totalMarksEarned },
  });
}

// ─── CA application ───────────────────────────────────────────────────────────

export interface CAEntry {
  sessionId:  string;
  caScore:    number;   // raw marks the student earned in CA
}

export interface CAResult {
  sessionId:       string;
  studentId:       string;
  examPercentage:  number;
  caPercentage:    number;
  finalScore:      number;   // out of 100
  finalGrade:      string;
  finalPassed:     boolean;
}

/**
 * Apply a CA score to a single session and compute the combined final result.
 *
 * @param sessionId    — the exam session to update
 * @param caScore      — raw CA marks earned by the student  (e.g. 25)
 * @param uploadedById — userId of the lecturer doing the upload (for audit)
 *
 * Weights:
 *   examWeight = exam.totalMarks          (set by the lecturer, e.g. 70)
 *   caWeight   = 100 - exam.totalMarks    (e.g. 30)
 *
 *   examContrib = (examPercentage / 100) × examWeight
 *   caContrib   = (caScore / caWeight)   × caWeight   =  caScore  (already in points)
 *   finalScore  = examContrib + caContrib
 */
export async function applyCA(
  sessionId:    string,
  caScore:      number,
  uploadedById: string,
): Promise<CAResult> {
  const prisma = await getPrismaClient();

  // Load the existing exam-only result + the exam's totalMarks
  const result = await prisma.examResult.findUnique({
    where:   { sessionId },
    include: { exam: { select: { totalMarks: true } } },
  });

  if (!result) {
    throw new Error(`[GRADER] No exam result found for session ${sessionId} — grade the exam first.`);
  }

  const examWeight   = Number(result.exam.totalMarks);  // e.g. 70
  const caWeight     = 100 - examWeight;                // e.g. 30

  if (caWeight <= 0) {
    throw new Error(
      `[GRADER] Exam totalMarks = ${examWeight} leaves no room for CA (caWeight = ${caWeight}). ` +
      `Set totalMarks < 100 when creating the exam.`
    );
  }

  if (caScore < 0 || caScore > caWeight) {
    throw new Error(
      `[GRADER] caScore ${caScore} is out of range 0–${caWeight} for this exam.`
    );
  }

  const examPercentage = Number(result.percentage ?? 0);
  const caPercentage   = (caScore / caWeight) * 100;

  // Weighted combination — result is already out of 100
  const examContrib  = (examPercentage / 100) * examWeight;
  const caContrib    = (caPercentage   / 100) * caWeight;   // = caScore
  const finalScore   = Math.round((examContrib + caContrib) * 100) / 100;

  const { grade: finalGrade, passed: finalPassed } = mouauGrade(finalScore);

  await prisma.examResult.update({
    where: { sessionId },
    data: {
      caScore:         caScore,
      caMaxScore:      caWeight,
      caUploadedAt:    new Date(),
      caUploadedById:  uploadedById,
      finalScore:      finalScore,
      finalPercentage: finalScore,   // same value — already /100
      finalGrade,
      finalPassed,
    },
  });

  return {
    sessionId,
    studentId:       result.studentId,
    examPercentage,
    caPercentage:    Math.round(caPercentage * 100) / 100,
    finalScore,
    finalGrade,
    finalPassed,
  };
}

/**
 * Bulk-apply CA scores for an entire exam.
 * Matches entries to sessions via studentId.
 *
 * @param examId       — the exam to update
 * @param entries      — array of { studentId, caScore }
 * @param uploadedById — lecturer performing the upload
 *
 * Returns per-student results plus counts of successes and failures.
 */
export async function bulkApplyCA(
  examId:       string,
  entries:      Array<{ studentId: string; caScore: number }>,
  uploadedById: string,
): Promise<{
  results:  CAResult[];
  applied:  number;
  skipped:  number;
  errors:   Array<{ studentId: string; error: string }>;
}> {
  const prisma = await getPrismaClient();

  // Load all sessions for this exam so we can map studentId → sessionId
  const sessions = await prisma.examSession.findMany({
    where:  { examId, status: { in: ['submitted', 'force_submitted'] } },
    select: { id: true, studentId: true },
  });

  const sessionByStudent = new Map(sessions.map(s => [s.studentId, s.id]));

  const results:  CAResult[]                                  = [];
  const errors:   Array<{ studentId: string; error: string }> = [];
  let applied = 0;
  let skipped = 0;

  for (const entry of entries) {
    const sessionId = sessionByStudent.get(entry.studentId);

    if (!sessionId) {
      skipped++;
      errors.push({
        studentId: entry.studentId,
        error:     'No submitted session found for this student in this exam.',
      });
      continue;
    }

    try {
      const result = await applyCA(sessionId, entry.caScore, uploadedById);
      results.push(result);
      applied++;
    } catch (e) {
      skipped++;
      errors.push({
        studentId: entry.studentId,
        error:     e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { results, applied, skipped, errors };
}

/**
 * Remove CA from a session — clears all CA and final* fields.
 * Useful if a CA score was entered incorrectly.
 * The exam-only result (score, percentage, grade, passed) is preserved.
 */
export async function removeCA(sessionId: string): Promise<void> {
  const prisma = await getPrismaClient();

  await prisma.examResult.update({
    where: { sessionId },
    data: {
      caScore:         null,
      caMaxScore:      null,
      caUploadedAt:    null,
      caUploadedById:  null,
      finalScore:      null,
      finalPercentage: null,
      finalGrade:      null,
      finalPassed:     null,
    },
  });
}

/**
 * Re-apply CA after a session has been re-graded.
 * Reads the existing caScore from the DB and recomputes the final result.
 * Throws if no CA has been uploaded yet.
 */
export async function reapplyCAAfterRegrade(
  sessionId:    string,
  uploadedById: string,
): Promise<CAResult | null> {
  const prisma = await getPrismaClient();

  const result = await prisma.examResult.findUnique({
    where:  { sessionId },
    select: { caScore: true },
  });

  if (!result?.caScore) return null;   // no CA uploaded yet — nothing to re-apply

  return applyCA(sessionId, Number(result.caScore), uploadedById);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Re-grade a specific session. Preserves CA if it was already uploaded.
 */
export async function regradeSession(sessionId: string): Promise<void> {
  const prisma = await getPrismaClient();

  // Snapshot existing CA before clearing
  const existing = await prisma.examResult.findUnique({
    where:  { sessionId },
    select: { caScore: true, caUploadedById: true },
  });

  // Reset answer grading
  await prisma.studentAnswer.updateMany({
    where: { sessionId },
    data:  { isCorrect: null, marksEarned: 0 },
  });

  await prisma.examSession.update({
    where: { id: sessionId },
    data:  { isGraded: false },
  });

  // Re-run exam-only grading
  await gradeSession(sessionId);

  // Re-apply CA if it was already uploaded
  if (existing?.caScore != null && existing?.caUploadedById) {
    await applyCA(sessionId, Number(existing.caScore), existing.caUploadedById);
  }
}

/**
 * Bulk grade all ungraded sessions for an exam.
 */
export async function gradeAllSessions(
  examId: string,
): Promise<{ graded: number; errors: number }> {
  const prisma = await getPrismaClient();

  const sessions = await prisma.examSession.findMany({
    where: {
      examId,
      status:   { in: ['submitted', 'force_submitted'] },
      isGraded: false,
    },
    select: { id: true },
  });

  let graded = 0;
  let errors = 0;

  for (const session of sessions) {
    try {
      await gradeSession(session.id);
      graded++;
    } catch (e) {
      errors++;
      console.error(`[GRADER] Failed to grade session ${session.id}:`, e);
    }
  }

  return { graded, errors };
}

/**
 * Get the display-ready grade stats for a session.
 * Returns exam-only stats always, plus final stats if CA has been applied.
 */
export async function getSessionGradeStats(sessionId: string): Promise<{
  // Exam-only
  totalQuestions:  number;
  correctAnswers:  number;
  wrongAnswers:    number;
  score:           number;
  percentage:      number;
  grade:           string;
  passed:          boolean;
  points:          number;
  // CA status
  caApplied:       boolean;
  caScore:         number | null;
  caMaxScore:      number | null;
  caPercentage:    number | null;
  // Combined final (null if CA not yet uploaded)
  finalScore:      number | null;
  finalPercentage: number | null;
  finalGrade:      string | null;
  finalPassed:     boolean | null;
  finalPoints:     number | null;
} | null> {
  const prisma = await getPrismaClient();

  const result = await prisma.examResult.findUnique({
    where:   { sessionId },
    include: {
      exam:    { select: { totalMarks: true } },
      session: { include: { studentAnswers: true } },
    },
  });

  if (!result) return null;

  const totalQuestions = result.totalQuestions ?? result.session?.studentAnswers.length ?? 0;
  const correctAnswers = result.correct  ?? 0;
  const score          = Number(result.score      ?? 0);
  const percentage     = Number(result.percentage ?? 0);
  const examGradeInfo  = mouauGrade(percentage);

  const caApplied    = result.caScore != null;
  const caScore      = caApplied ? Number(result.caScore)    : null;
  const caMaxScore   = caApplied ? Number(result.caMaxScore) : null;
  const caPercentage = caApplied && caMaxScore ? Math.round((caScore! / caMaxScore) * 10000) / 100 : null;

  const finalScore      = result.finalScore      != null ? Number(result.finalScore)      : null;
  const finalPercentage = result.finalPercentage != null ? Number(result.finalPercentage) : null;
  const finalGrade      = result.finalGrade      ?? null;
  const finalPassed     = result.finalPassed     ?? null;
  const finalPoints     = finalGrade ? (mouauGrade(finalPercentage ?? 0).points) : null;

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers:    totalQuestions - correctAnswers,
    score,
    percentage,
    grade:           examGradeInfo.grade,
    passed:          examGradeInfo.passed,
    points:          examGradeInfo.points,
    caApplied,
    caScore,
    caMaxScore,
    caPercentage,
    finalScore,
    finalPercentage,
    finalGrade,
    finalPassed,
    finalPoints,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function writeExamResult(
  sessionId:          string,
  totalMarksAvailable: number,
  marksEarned:        number,
  correct:            number,
  answered:           number,
  totalQuestions?:    number,
): Promise<void> {
  const prisma = await getPrismaClient();

  const session = await prisma.examSession.findUnique({
    where:  { id: sessionId },
    select: {
      examId:         true,
      studentId:      true,
      submittedAt:    true,
      violationCount: true,
      startedAt:      true,
    },
  });
  if (!session) throw new Error(`[GRADER] Session ${sessionId} not found`);

  const percentage = totalMarksAvailable > 0
    ? (marksEarned / totalMarksAvailable) * 100
    : 0;

  const { grade, passed } = mouauGrade(percentage);

  const timeTakenSecs = session.startedAt && session.submittedAt
    ? Math.round((session.submittedAt.getTime() - session.startedAt.getTime()) / 1000)
    : null;

  // Only write exam-only fields. CA and final* fields are intentionally
  // omitted so they are never accidentally overwritten by a re-grade.
  await prisma.examResult.upsert({
    where:  { sessionId },
    create: {
      sessionId,
      studentId:      session.studentId,
      examId:         session.examId,
      totalQuestions: totalQuestions ?? null,
      answered,
      correct,
      score:          marksEarned,
      percentage:     Math.round(percentage * 100) / 100,
      grade,
      passed,
      violationCount: session.violationCount,
      timeTakenSecs,
      submittedAt:    session.submittedAt,
    },
    update: {
      // Never touch CA / final* fields on an update
      totalQuestions: totalQuestions ?? undefined,
      answered,
      correct,
      score:          marksEarned,
      percentage:     Math.round(percentage * 100) / 100,
      grade,
      passed,
      violationCount: session.violationCount,
      timeTakenSecs,
      submittedAt:    session.submittedAt,
    },
  });
}

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export function percentageToGrade(pct: number): GradeLetter {
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 45) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

export function gradeToPoints(grade: GradeLetter): number {
  return { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }[grade];
}

export function computeGPA(
  courses: { creditUnits: number; gradePoints: number }[]
): number {
  const totalUnits  = courses.reduce((s, c) => s + c.creditUnits, 0);
  const totalPoints = courses.reduce((s, c) => s + c.creditUnits * c.gradePoints, 0);
  return totalUnits === 0 ? 0 : totalPoints / totalUnits;
}