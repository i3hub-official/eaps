// src/routes/lecturer/students/performance/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // First, get all students with their exam performance
  const students = await sql<{
    id: string;
    fullName: string;
    email: string;
    matricNumber: string;
    departmentName: string;
    level: number;
    totalExams: number;
    avgScore: number;
    passedExams: number;
    failedExams: number;
    bestScore: number;
    worstScore: number;
    lastActive: Date;
  }>(
    `SELECT
       u.id,
       u.full_name AS "fullName",
       u.email,
       u.matric_number AS "matricNumber",
       d.name AS "departmentName",
       l.level,
       COUNT(DISTINCT es.exam_id)::int AS "totalExams",
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS "avgScore",
       COUNT(*) FILTER (WHERE er.percentage >= e.pass_mark)::int AS "passedExams",
       COUNT(*) FILTER (WHERE er.percentage < e.pass_mark AND er.percentage > 0)::int AS "failedExams",
       COALESCE(MAX(er.percentage)::numeric, 0) AS "bestScore",
       COALESCE(MIN(er.percentage)::numeric, 0) AS "worstScore",
       MAX(es.submitted_at) AS "lastActive"
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     JOIN exam_results er ON er.session_id = es.id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN levels l ON l.id = u.level_id
     WHERE e.created_by = $1::uuid
       AND u.role = 'student'
       AND es.status IN ('submitted', 'force_submitted')
     GROUP BY u.id, u.full_name, u.email, u.matric_number, d.name, l.level
     ORDER BY u.full_name`,
    [user.id]
  );

  // Get violation counts per student separately
  const violationCounts = await sql<{
    studentId: string;
    totalViolations: number;
  }>(
    `SELECT
       u.id AS "studentId",
       COUNT(v.id)::int AS "totalViolations"
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     LEFT JOIN violations v ON v.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND u.role = 'student'
       AND es.status IN ('submitted', 'force_submitted')
     GROUP BY u.id`,
    [user.id]
  );

  // Create a map of student ID to violation count
  const violationMap = Object.fromEntries(
    violationCounts.map(v => [v.studentId, v.totalViolations])
  );

  // Merge violation counts into students
  const studentsWithViolations = students.map(s => ({
    ...s,
    totalViolations: violationMap[s.id] || 0
  }));

  // Get performance distribution
  const distribution = await sql<{
    grade: string;
    count: number;
  }>(
    `SELECT
       grade,
       COUNT(*)::int AS count
     FROM (
       SELECT
         CASE
           WHEN er.final_percentage >= 70 THEN 'A'
           WHEN er.final_percentage >= 60 THEN 'B'
           WHEN er.final_percentage >= 50 THEN 'C'
           WHEN er.final_percentage >= 45 THEN 'D'
           WHEN er.final_percentage >= 40 THEN 'E'
           WHEN er.final_percentage > 0 THEN 'F'
           ELSE 'N/A'
         END AS grade
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id
       WHERE e.created_by = $1::uuid
         AND er.final_percentage > 0
     ) AS graded_results
     WHERE grade != 'N/A'
     GROUP BY grade
     ORDER BY grade`,
    [user.id]
  );

  // Get recent performance trends (last 30 days)
  const trends = await sql<{
    date: string;
    avgScore: number;
    studentCount: number;
  }>(
    `SELECT
       DATE(es.submitted_at) AS date,
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS "avgScore",
       COUNT(DISTINCT u.id)::int AS "studentCount"
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     JOIN exams e ON e.id = es.exam_id
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND es.submitted_at >= NOW() - INTERVAL '30 days'
       AND es.status IN ('submitted', 'force_submitted')
     GROUP BY DATE(es.submitted_at)
     ORDER BY date DESC`,
    [user.id]
  );

  // Get top performers
  const topPerformers = await sql<{
    id: string;
    fullName: string;
    email: string;
    matricNumber: string;
    avgScore: number;
    totalExams: number;
  }>(
    `SELECT
       u.id,
       u.full_name AS "fullName",
       u.email,
       u.matric_number AS "matricNumber",
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS "avgScore",
       COUNT(DISTINCT es.exam_id)::int AS "totalExams"
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     JOIN exam_results er ON er.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND u.role = 'student'
       AND es.status IN ('submitted', 'force_submitted')
     GROUP BY u.id, u.full_name, u.email, u.matric_number
     HAVING COUNT(DISTINCT es.exam_id) >= 2
     ORDER BY AVG(er.percentage) DESC
     LIMIT 10`,
    [user.id]
  );

  // Get struggling students (lowest performers)
  const strugglingStudents = await sql<{
    id: string;
    fullName: string;
    email: string;
    matricNumber: string;
    avgScore: number;
    totalExams: number;
    failedExams: number;
  }>(
    `SELECT
       u.id,
       u.full_name AS "fullName",
       u.email,
       u.matric_number AS "matricNumber",
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS "avgScore",
       COUNT(DISTINCT es.exam_id)::int AS "totalExams",
       COUNT(*) FILTER (WHERE er.percentage < e.pass_mark)::int AS "failedExams"
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     JOIN exam_results er ON er.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND u.role = 'student'
       AND es.status IN ('submitted', 'force_submitted')
     GROUP BY u.id, u.full_name, u.email, u.matric_number
     HAVING AVG(er.percentage) < 50
       AND COUNT(DISTINCT es.exam_id) >= 2
     ORDER BY AVG(er.percentage) ASC
     LIMIT 10`,
    [user.id]
  );

  // Get overall stats - FIXED: removed ROUND with two args, use numeric casting
  const stats = await sql<{
    totalStudents: number;
    avgOverall: number;
    passRate: number;
    studentsWithViolations: number;
    totalViolations: number;
  }>(
    `SELECT
       COUNT(DISTINCT u.id)::int AS "totalStudents",
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS "avgOverall",
       COALESCE(ROUND(
         (COUNT(*) FILTER (WHERE er.percentage >= e.pass_mark)::numeric / 
         NULLIF(COUNT(*)::numeric, 0)) * 100, 1
       ), 0) AS "passRate",
       COUNT(DISTINCT v.session_id)::int AS "studentsWithViolations",
       COUNT(v.id)::int AS "totalViolations"
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     JOIN exam_results er ON er.session_id = es.id
     LEFT JOIN violations v ON v.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND u.role = 'student'
       AND es.status IN ('submitted', 'force_submitted')`,
    [user.id]
  );

  // Calculate grade distribution
  const gradeLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const gradeDistribution = gradeLabels.map(label => ({
    grade: label,
    count: distribution.find(d => d.grade === label)?.count || 0
  }));

  return {
    students: studentsWithViolations,
    stats: stats[0] || { totalStudents: 0, avgOverall: 0, passRate: 0, studentsWithViolations: 0, totalViolations: 0 },
    gradeDistribution,
    trends: trends || [],
    topPerformers: topPerformers || [],
    strugglingStudents: strugglingStudents || [],
    totalStudents: students.length,
  };
};