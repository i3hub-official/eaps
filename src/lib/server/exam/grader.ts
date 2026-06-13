// src/lib/server/exam/grader.ts
import { prisma, sql } from '$lib/server/db/index.js';

/**
 * Nigerian 5-point grade scale (reference only — raw scores are primary)
 * A = 70-100%  (5 points)
 * B = 60-69%   (4 points)
 * C = 50-59%   (3 points)
 * D = 45-49%   (2 points)
 * E = 40-44%   (1 point)  — pass threshold
 * F = 0-39%    (0 points) — fail
 */
export function nigerianGrade(percentage: number): { grade: string; points: number; passed: boolean } {
  if (percentage >= 70) return { grade: 'A', points: 5, passed: true };
  if (percentage >= 60) return { grade: 'B', points: 4, passed: true };
  if (percentage >= 50) return { grade: 'C', points: 3, passed: true };
  if (percentage >= 45) return { grade: 'D', points: 2, passed: true };
  if (percentage >= 40) return { grade: 'E', points: 1, passed: true };
  return { grade: 'F', points: 0, passed: false };
}

/**
 * Grade all answers for a session.
 * - MCQ:  compare selected_option against is_correct
 * - FITB: case-insensitive match against all accepted answers
 * Then calls compute_exam_result() DB function to write exam_results row.
 * 
 * NOTE: Grading happens regardless of showResultAfter. Visibility is controlled separately.
 */
export async function gradeSession(sessionId: string): Promise<void> {
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    include: {
      question: { include: { options: true, fitbAnswers: true } },
    },
  });

  for (const answer of answers) {
    const q = answer.question;
    let isCorrect = false;
    let marksEarned = 0;

    if (q.type === 'mcq') {
      const correct = q.options.find(o => o.isCorrect);
      isCorrect = !!correct && answer.selectedOption === correct.id;
      marksEarned = isCorrect ? Number(q.marks) : 0;

    } else if (q.type === 'fill_in_the_blank') {
      const raw = (answer.textAnswer ?? '').trim().toLowerCase();
      isCorrect = q.fitbAnswers.some(a => a.acceptedAnswer.trim().toLowerCase() === raw);
      marksEarned = isCorrect ? Number(q.marks) : 0;
    }

    await prisma.studentAnswer.update({
      where: { id: answer.id },
      data: { isCorrect, marksEarned },
    });
  }

  // Delegate score aggregation + result row to the DB function
  await sql(`SELECT compute_exam_result($1)`, [sessionId]);
  
  // After DB function runs, fetch the result and update with Nigerian grade
  const result = await prisma.examResult.findUnique({
    where: { sessionId },
    include: { exam: true },
  });
  
  if (result && result.exam) {
    const totalMarks = Number(result.exam.totalMarks);
    const score = Number(result.score ?? 0);
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const { grade, passed } = nigerianGrade(percentage);
    
    await prisma.examResult.update({
      where: { sessionId },
      data: { 
        grade,
        passed,
        percentage: Math.round(percentage * 100) / 100,
      },
    });
  }
}

/**
 * Re-grade a specific session — useful if questions/answers were corrected post-exam
 */
export async function regradeSession(sessionId: string): Promise<void> {
  // Reset all answers first
  await prisma.studentAnswer.updateMany({
    where: { sessionId },
    data: { isCorrect: null, marksEarned: 0 },
  });
  
  // Re-grade from scratch
  await gradeSession(sessionId);
}

/**
 * Bulk grade all ungraded sessions for an exam
 */
export async function gradeAllSessions(examId: string): Promise<{ graded: number; errors: number }> {
  const sessions = await prisma.examSession.findMany({
    where: { 
      examId,
      status: { in: ['submitted', 'force_submitted'] },
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