import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      q.id,
      q.body,
      q.type,
      e.code as exam_code,
      COUNT(sa.id)::int as attempts,
      COUNT(CASE WHEN sa."isCorrect" = true THEN 1 END)::int as correct,
      AVG(sa."timeSpentSecs")::numeric(10,0) as avg_time
    FROM "Question" q
    LEFT JOIN "Exam" e ON q."examId" = e.id
    LEFT JOIN "StudentAnswer" sa ON sa."questionId" = q.id
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND (q.body ILIKE ${'%' + searchQuery + '%'} OR e.code ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} GROUP BY q.id, e.code LIMIT 200`;

  const questions = await query;

  const formatted = questions.map(q => {
    const attempts = q.attempts || 0;
    const correct = q.correct || 0;
    const accuracy = attempts > 0 ? ((correct / attempts) * 100).toFixed(1) : '0';
    return {
      id: q.id.slice(0, 4),
      exam: q.exam_code || '—',
      body: q.body,
      type: q.type,
      attempts,
      correct,
      accuracy: parseFloat(accuracy),
      avgTime: Math.round(parseFloat(q.avg_time) || 0),
      difficulty: parseFloat(accuracy) >= 80 ? 'easy' : parseFloat(accuracy) >= 50 ? 'medium' : 'hard',
      discrimination: 0.65,
    };
  });

  return { questions: formatted };
};
