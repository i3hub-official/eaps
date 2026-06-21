// src/routes/lecturer/students/+layout.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

  const prisma = await getPrismaClient();

  // Get courses the lecturer teaches
  const courses = await prisma.course.findMany({
    where: {
      lecturerAssignments: {
        some: { lecturerId: user.id }
      }
    },
    select: {
      id: true,
      code: true,
      title: true,
    },
    orderBy: { code: 'asc' },
  });

  // Get levels
  const levels = await prisma.level.findMany({
    orderBy: { order: 'asc' },
    select: { level: true },
  });

  // Get students enrolled in the lecturer's courses
  const students = await prisma.user.findMany({
    where: {
      role: 'student',
      isActive: true,
      courseRegistrations: {
        some: {
          course: {
            lecturerAssignments: {
              some: { lecturerId: user.id }
            }
          }
        }
      }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      matricNumber: true,
      levelId: true,
      isActive: true,
      isSuspended: true,
      departmentId: true,
      department: {
        select: { name: true }
      },
      courseRegistrations: {
        select: {
          courseId: true,
          course: {
            select: {
              code: true,
              title: true,
            }
          }
        }
      },
      examSessions: {
        select: {
          examId: true,
          status: true,
          score: true,
          exam: {
            select: {
              title: true,
            }
          }
        }
      },
      violations: {
        select: {
          id: true,
          flagType: true,
          actionTaken: true,
          note: true,
          flaggedAt: true,
          session: {
            select: {
              exam: {
                select: {
                  title: true,
                }
              }
            }
          }
        }
      }
    },
  });

  // Transform data
  const transformedStudents = students.map(s => ({
    id: s.id,
    fullName: s.fullName,
    email: s.email,
    matricNumber: s.matricNumber,
    level: s.levelId,
    departmentId: s.departmentId,
    departmentName: s.department?.name,
    isActive: s.isActive,
    isSuspended: s.isSuspended,
    courseIds: s.courseRegistrations.map(c => c.courseId),
    courseCodes: s.courseRegistrations.map(c => c.course.code),
    examCount: s.examSessions.length,
    avgScore: s.examSessions.filter(e => e.score !== null).reduce((sum, e) => sum + (e.score || 0), 0) / (s.examSessions.filter(e => e.score !== null).length || 1),
    violationCount: s.violations.length,
    violations: s.violations.map(v => ({
      id: v.id,
      flagType: v.flagType,
      actionTaken: v.actionTaken,
      note: v.note,
      flaggedAt: v.flaggedAt,
      examTitle: v.session?.exam?.title,
    })),
  }));

  // Get exams for dropdowns
  const exams = await prisma.exam.findMany({
    where: { createdBy: user.id },
    select: {
      id: true,
      title: true,
      course: {
        select: { code: true }
      }
    },
    orderBy: { scheduledStart: 'desc' },
  });

  return {
    courses,
    levels: levels.map(l => l.level),
    students: transformedStudents,
    exams: exams.map(e => ({
      id: e.id,
      title: e.title,
      courseCode: e.course.code,
    })),
    courseMap: Object.fromEntries(courses.map(c => [c.id, c])),
  };
};