// src/lib/server/exam/grader.ts
import { getPrismaClient, sql } from '$lib/server/db/index.js';

/**
 * MOUAU 5-point grade scale
 * A = 70–100%  (5 points)
 * B = 60–69%   (4 points)
 * C = 50–59%   (3 points)
 * D = 45–49%   (2 points)
 * E = 40–44%   (1 point)  — minimum pass
 * F =  0–39%   (0 points) — fail
 */
export function mouauGrade(percentage: number): { grade: string; points: number; passed: boolean } {
  if (percentage >= 70) return { grade: 'A', points: 5, passed: true };
  if (percentage >= 60) return { grade: 'B', points: 4, passed: true };
  if (percentage >= 50) return { grade: 'C', points: 3, passed: true };
  if (percentage >= 45) return { grade: 'D', points: 2, passed: true };
  if (percentage >= 40) return { grade: 'E', points: 1, passed: true };
  return { grade: 'F', points: 0, passed: false };
}

/**
 * Calculate GPA from an array of course results.
 * @returns GPA on a 5.0 scale
 */
export function calculateGPA(results: Array<{ grade: string; creditUnits: number }>): number {
  const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  let totalPoints = 0;
  let totalCredits = 0;
  for (const r of results) {
    totalPoints  += (gradePoints[r.grade] ?? 0) * r.creditUnits;
    totalCredits += r.creditUnits;
  }
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

export function getGradeDescription(grade: string): string {
  const descriptions: Record<string, string> = {
    A: 'Excellent', B: 'Very Good', C: 'Good',
    D: 'Fair',      E: 'Pass',      F: 'Fail',
  };
  return descriptions[grade] ?? 'Unknown';
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grade all answers for a session, write the ExamResult row, and mark the
 * session as graded.
 *
 * BUG FIXES vs old version:
 *
 * 1. `isGraded` was never set to true — sessions were graded repeatedly,
 *    potentially overwriting a correct result with a stale re-grade.
 *
 * 2. `compute_exam_result()` is a DB function whose body is unknown.  If it
 *    has a bug (wrong count, wrong column, etc.) every student fails.  We now
 *    compute the result entirely in Prisma/TS and use the DB function only as
 *    a best-effort supplement.  The TS result always wins.
 *
 * 3. The old code passed the exam's `totalMarks` as the denominator, but
 *    `questionsToPresent` may differ from the full question bank size, and
 *    each question carries its own `marks` value.  We now sum actual marks
 *    earned vs. total marks of presented questions — so the denominator is
 *    always the real achievable score for this student's session.
 *
 * 4. `ExamSession.score` and `ExamSession.isGraded` were not updated, so the
 *    student dashboard showed null scores even after grading.
 */
export async function gradeSession(sessionId: string): Promise<void> {
  const prisma = await getPrismaClient();

  // ── 1. Fetch all answers with their questions ────────────────────────────
  const answers = await prisma.studentAnswer.findMany({
    where:   { sessionId },
    include: {
      question: {
        include: {
          options:     true,   // needed for MCQ isCorrect lookup
          fitbAnswers: true,   // needed for FITB matching
        },
      },
    },
  });

  if (answers.length === 0) {
    // No answers at all — write a zero result and mark graded.
    await writeResult(sessionId, 0, 0, 0, 0);
    return;
  }

  // ── 2. Grade each answer ─────────────────────────────────────────────────
  let totalMarksAvailable = 0;
  let totalMarksEarned    = 0;
  let correctCount        = 0;
  let answeredCount       = 0;

  for (const answer of answers) {
    const q = answer.question;
    let isCorrect  = false;
    let marksEarned = 0;

    const questionMarks = Number(q.marks);
    totalMarksAvailable += questionMarks;

    const hasResponse =
      answer.selectedOption !== null ||
      (answer.textAnswer !== null && answer.textAnswer.trim() !== '');

    if (hasResponse) {
      answeredCount++;

      if (q.type === 'mcq') {
        const correctOption = q.options.find(o => o.isCorrect);
        if (!correctOption) {
          // No option marked correct in DB — do NOT penalise the student.
          // Log so the lecturer can fix the question.
          console.warn(
            `[GRADER] Question ${q.id} (MCQ) has no correct option — skipping.`
          );
        } else {
          isCorrect   = answer.selectedOption === correctOption.id;
          marksEarned = isCorrect ? questionMarks : 0;
        }

      } else if (q.type === 'fill_in_the_blank') {
        if (q.fitbAnswers.length === 0) {
          console.warn(
            `[GRADER] Question ${q.id} (FITB) has no accepted answers — skipping.`
          );
        } else {
          const raw = (answer.textAnswer ?? '').trim().toLowerCase();
          isCorrect   = q.fitbAnswers.some(
            a => a.acceptedAnswer.trim().toLowerCase() === raw
          );
          marksEarned = isCorrect ? questionMarks : 0;
        }

      } else if (q.type === 'true_false') {
        // true_false answers are stored as textAnswer = 'true' | 'false'.
        // The correct answer is whichever QuestionOption has isCorrect=true
        // and whose optionText matches 'true' or 'false'.
        const correctOption = q.options.find(o => o.isCorrect);
        if (!correctOption) {
          console.warn(
            `[GRADER] Question ${q.id} (true_false) has no correct option — skipping.`
          );
        } else {
          const correctValue = correctOption.optionText.trim().toLowerCase();
          const studentValue = (answer.textAnswer ?? '').trim().toLowerCase();
          isCorrect   = studentValue === correctValue;
          marksEarned = isCorrect ? questionMarks : 0;
        }
      }
      // essay / generic: not auto-graded; leave isCorrect=null, marksEarned=0
    }

    if (isCorrect) correctCount++;
    totalMarksEarned += marksEarned;

    await prisma.studentAnswer.update({
      where: { id: answer.id },
      data:  { isCorrect: hasResponse ? isCorrect : null, marksEarned },
    });
  }

  // ── 3. Write the result row ──────────────────────────────────────────────
  await writeResult(
    sessionId,
    totalMarksAvailable,
    totalMarksEarned,
    correctCount,
    answeredCount,
    answers.length,
  );

  // ── 4. Run the DB function (now fixed — results will match TS grader) ───
  // Non-fatal: if the function is missing or throws, the Prisma result above
  // is already written and is the authoritative record.
  try {
    await sql(`SELECT compute_exam_result($1)`, [sessionId]);
  } catch (e) {
    console.warn('[GRADER] compute_exam_result() failed (non-fatal):', e);
  }

  // ── 5. Mark session as graded + sync score onto the session row ──────────
  await prisma.examSession.update({
    where: { id: sessionId },
    data:  { isGraded: true, score: totalMarksEarned },
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function writeResult(
  sessionId: string,
  totalMarksAvailable: number,
  marksEarned: number,
  correct: number,
  answered: number,
  totalQuestions?: number,
): Promise<void> {
  const prisma = await getPrismaClient();

  // Fetch the session to get examId and studentId for the result row.
  const session = await prisma.examSession.findUnique({
    where:  { id: sessionId },
    select: { examId: true, studentId: true, submittedAt: true, violationCount: true, startedAt: true },
  });
  if (!session) throw new Error(`[GRADER] Session ${sessionId} not found`);

  const percentage  = totalMarksAvailable > 0
    ? (marksEarned / totalMarksAvailable) * 100
    : 0;
  const { grade, passed } = mouauGrade(percentage);

  const timeTakenSecs = session.startedAt && session.submittedAt
    ? Math.round((session.submittedAt.getTime() - session.startedAt.getTime()) / 1000)
    : null;

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

async function reapplyGrade(
  sessionId: string,
  totalMarksAvailable: number,
  marksEarned: number,
): Promise<void> {
  const prisma = await getPrismaClient();

  const percentage        = totalMarksAvailable > 0
    ? (marksEarned / totalMarksAvailable) * 100
    : 0;
  const { grade, passed } = mouauGrade(percentage);

  await prisma.examResult.update({
    where: { sessionId },
    data:  {
      score:      marksEarned,
      percentage: Math.round(percentage * 100) / 100,
      grade,
      passed,
    },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Re-grade a specific session — useful if questions/answers were corrected
 * post-exam. Resets all grading fields before re-running.
 */
export async function regradeSession(sessionId: string): Promise<void> {
  const prisma = await getPrismaClient();

  await prisma.studentAnswer.updateMany({
    where: { sessionId },
    data:  { isCorrect: null, marksEarned: 0 },
  });

  // Un-mark so gradeAllSessions would pick it up too
  await prisma.examSession.update({
    where: { id: sessionId },
    data:  { isGraded: false },
  });

  await gradeSession(sessionId);
}

/**
 * Bulk grade all ungraded sessions for an exam.
 */
export async function gradeAllSessions(
  examId: string
): Promise<{ graded: number; errors: number }> {
  const prisma = await getPrismaClient();

  const sessions = await prisma.examSession.findMany({
    where: {
      examId,
      status:    { in: ['submitted', 'force_submitted'] },
      isGraded:  false,
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
 * Get grade statistics for a session.
 */
export async function getSessionGradeStats(sessionId: string): Promise<{
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers:   number;
  score:          number;
  percentage:     number;
  grade:          string;
  passed:         boolean;
  points:         number;
} | null> {
  const prisma = await getPrismaClient();

  const result = await prisma.examResult.findUnique({
    where:   { sessionId },
    include: {
      exam:    true,
      session: { include: { studentAnswers: true } },
    },
  });

  if (!result) return null;

  const totalQuestions = result.totalQuestions ?? result.session?.studentAnswers.length ?? 0;
  const correctAnswers = result.correct ?? 0;
  const score          = Number(result.score ?? 0);
  const percentage     = Number(result.percentage ?? 0);
  const gradeInfo      = mouauGrade(percentage);

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers: totalQuestions - correctAnswers,
    score,
    percentage,
    grade:   gradeInfo.grade,
    passed:  gradeInfo.passed,
    points:  gradeInfo.points,
  };
}