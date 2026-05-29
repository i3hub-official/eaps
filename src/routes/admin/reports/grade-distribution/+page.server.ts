import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const results = await sql`
    SELECT score FROM "ExamResult"
  `;

  const grades: Record<string, { count: number; percentage: number; range: string }> = {
    A: { count: 0, percentage: 0, range: '70-100%' },
    B: { count: 0, percentage: 0, range: '60-69%' },
    C: { count: 0, percentage: 0, range: '50-59%' },
    D: { count: 0, percentage: 0, range: '45-49%' },
    E: { count: 0, percentage: 0, range: '40-44%' },
    F: { count: 0, percentage: 0, range: '0-39%' },
  };

  results.forEach((r: any) => {
    const score = parseFloat(r.score) || 0;
    let grade = 'F';
    if (score >= 70) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 50) grade = 'C';
    else if (score >= 45) grade = 'D';
    else if (score >= 40) grade = 'E';
    grades[grade].count++;
  });

  const total = results.length;
  Object.keys(grades).forEach(g => {
    grades[g].percentage = total > 0 ? parseFloat(((grades[g].count / total) * 100).toFixed(1)) : 0;
  });

  return { gradeData: grades, totalStudents: total };
};
