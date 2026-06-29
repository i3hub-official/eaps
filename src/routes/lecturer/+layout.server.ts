// src/routes/lecturer/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = await requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get user with department and college info
  const userWithDetails = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: {
        include: {
          college: true
        }
      }
    }
  });

  // Get notifications
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  // Get exam stats
  const [activeExams, totalExams, pendingGrades, draftExams, scheduledExams, completedExams] = await Promise.all([
    prisma.exam.count({
      where: { createdBy: user.id, status: 'active' },
    }),
    prisma.exam.count({
      where: { createdBy: user.id, status: { not: 'cancelled' } },
    }),
    prisma.examSession.count({
      where: {
        exam: { createdBy: user.id },
        status: 'submitted',
        isGraded: false,
      },
    }),
    prisma.exam.count({
      where: { createdBy: user.id, status: 'draft' },
    }),
    prisma.exam.count({
      where: { createdBy: user.id, status: 'scheduled' },
    }),
    prisma.exam.count({
      where: { createdBy: user.id, status: 'completed' },
    }),
  ]);

  // Get student stats for this lecturer's courses
  const studentStats = await sql<{ total: number; eligible: number; withViolations: number }>(
    `SELECT
       COUNT(DISTINCT u.id)::int AS total,
       COUNT(DISTINCT u.id) FILTER (WHERE cr.id IS NOT NULL)::int AS eligible,
       COUNT(DISTINCT u.id) FILTER (WHERE v.id IS NOT NULL)::int AS with_violations
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     LEFT JOIN course_registrations cr ON cr.student_id = u.id AND cr.course_id = e.course_id
     LEFT JOIN violations v ON v.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND u.role = 'student'`,
    [user.id]
  );

  // Get question bank stats
  const questionStats = await sql<{ total: number; mcq: number; truefalse: number; fitb: number; essay: number }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE type = 'mcq')::int AS mcq,
       COUNT(*) FILTER (WHERE type = 'true_false')::int AS truefalse,
       COUNT(*) FILTER (WHERE type = 'fill_in_the_blank')::int AS fitb,
       COUNT(*) FILTER (WHERE type = 'essay')::int AS essay
     FROM questions
     WHERE exam_id IN (
       SELECT id FROM exams WHERE created_by = $1::uuid
     )`,
    [user.id]
  );

  // Get recent activities (submissions)
  const recentActivities = await sql<{
    id: string;
    type: string;
    message: string;
    createdAt: Date;
  }>(
    `SELECT
       es.id,
       'submission' AS type,
       u.full_name || ' submitted ' || e.title AS message,
       es.submitted_at AS "createdAt"
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     JOIN exams e ON e.id = es.exam_id
     WHERE e.created_by = $1::uuid
       AND es.status = 'submitted'
     ORDER BY es.submitted_at DESC
     LIMIT 5`,
    [user.id]
  );

  // Check if user has any courses assigned
  const courseCount = await prisma.lecturerCourse.count({
    where: { lecturerId: user.id }
  });

  // Get upcoming exams (scheduled in next 7 days)
  const upcomingExams = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      status: 'scheduled',
      scheduledStart: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    },
    select: {
      id: true,
      title: true,
      scheduledStart: true,
      course: {
        select: { code: true }
      }
    },
    orderBy: { scheduledStart: 'asc' },
    take: 5,
  });

  // Get pending CA scores - using exam_results table since there's no separate continuous_assessment table
  const pendingCA = await sql<{ count: number }>(
    `SELECT COUNT(DISTINCT u.id)::int AS count
     FROM users u
     JOIN exam_sessions es ON es.student_id = u.id
     JOIN exams e ON e.id = es.exam_id
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE e.created_by = $1::uuid
       AND es.status = 'submitted'
       AND (er.ca_score IS NULL OR er.ca_score = 0)`,
    [user.id]
  );

  return {
    user: {
      ...user,
      department: userWithDetails?.department,
      college: userWithDetails?.department?.college,
    },
    notifications,
    stats: {
      activeExams,
      totalExams,
      pendingGrades,
      draftExams,
      scheduledExams,
      completedExams,
      totalStudents: studentStats[0]?.total || 0,
      eligibleStudents: studentStats[0]?.eligible || 0,
      studentsWithViolations: studentStats[0]?.withViolations || 0,
      totalQuestions: questionStats[0]?.total || 0,
      mcqQuestions: questionStats[0]?.mcq || 0,
      truefalseQuestions: questionStats[0]?.truefalse || 0,
      fitbQuestions: questionStats[0]?.fitb || 0,
      essayQuestions: questionStats[0]?.essay || 0,
      pendingCA: pendingCA[0]?.count || 0,
      hasCourses: courseCount > 0,
    },
    recentActivities,
    upcomingExams,
    courseCount,
  };
};