// src/lib/server/exam/grader.ts
import { prisma, sql } from '$lib/server/db/index.js';

/**
 * Grade all answers for a session.
 * - MCQ:  compare selected_option against is_correct
 * - FITB: case-insensitive match against all accepted answers
 * Then calls compute_exam_result() DB function to write exam_results row.
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
}