// src/routes/lecturer/results/print/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get all exams created by this lecturer with results
  const exams = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      status: 'completed',
    },
    include: {
      course: {
        select: {
          code: true,
          title: true,
        },
      },
      _count: {
        select: {
          examSessions: true,
        },
      },
    },
    orderBy: {
      scheduledEnd: 'desc',
    },
    take: 50,
  });

  // Get detailed results for each exam
  const examResults = await Promise.all(
    exams.map(async (exam) => {
      const results = await sql<{
        studentName: string;
        studentEmail: string;
        matricNumber: string;
        score: number;
        percentage: number;
        caScore: number;
        finalScore: number;
        finalPercentage: number;
        finalGrade: string;
        finalPassed: boolean;
        submittedAt: Date;
      }>(
        `SELECT
           u.full_name AS "studentName",
           u.email AS "studentEmail",
           u.matric_number AS "matricNumber",
           er.score,
           er.percentage,
           er.ca_score AS "caScore",
           er.final_score AS "finalScore",
           er.final_percentage AS "finalPercentage",
           er.final_grade AS "finalGrade",
           er.final_passed AS "finalPassed",
           er.submitted_at AS "submittedAt"
         FROM exam_results er
         JOIN users u ON u.id = er.student_id
         WHERE er.exam_id = $1::uuid
         ORDER BY u.full_name`,
        [exam.id]
      );
      return {
        examId: exam.id,
        examTitle: exam.title,
        courseCode: exam.course?.code,
        courseTitle: exam.course?.title,
        scheduledEnd: exam.scheduledEnd,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark,
        results,
        studentCount: results.length,
        passedCount: results.filter(r => r.finalPassed).length,
        failedCount: results.filter(r => !r.finalPassed && r.submittedAt).length,
        avgScore: results.length > 0 
          ? results.reduce((acc, r) => acc + (r.finalPercentage || 0), 0) / results.length 
          : 0,
      };
    })
  );

  // Get overall stats
  const totalStudents = examResults.reduce((acc, e) => acc + e.studentCount, 0);
  const totalPassed = examResults.reduce((acc, e) => acc + e.passedCount, 0);
  const totalFailed = examResults.reduce((acc, e) => acc + e.failedCount, 0);
  const overallAvg = totalStudents > 0 
    ? examResults.reduce((acc, e) => acc + (e.avgScore * e.studentCount), 0) / totalStudents 
    : 0;

  return {
    examResults,
    stats: {
      totalExams: exams.length,
      totalStudents,
      totalPassed,
      totalFailed,
      overallAvg,
    },
    user,
    generatedAt: new Date(),
  };
};