// src/routes/(lecturer)/exams/[examId]/results/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getExamWithCourse } from '$lib/server/db/exams.js';
import { getResultsForExam, getExamStats, getGradeDistribution } from '$lib/server/db/results.js';
import { requireOwnership } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const exam = await getExamWithCourse(params.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  const [results, stats, grades] = await Promise.all([
    getResultsForExam(exam.id),
    getExamStats(exam.id),
    getGradeDistribution(exam.id),
  ]);

  return { exam, results, stats, grades };
};