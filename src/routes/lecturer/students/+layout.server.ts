// src/routes/lecturer/students/+layout.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async (event) => {
  const user = await requireLecturer(event.locals.user);
  const prisma = await getPrismaClient();

  // Get all students who have taken exams created by this lecturer
  const [results, courses, exams] = await Promise.all([
    // Get all exam results for this lecturer's exams
    prisma.examResult.findMany({
      where: { 
        exam: { createdBy: user.id }
      },
      select: {
        id: true,
        score: true,
        passed: true,
        grade: true,
        percentage: true,
        violationCount: true,
        timeTakenSecs: true,
        submittedAt: true,
        student: { 
          select: { 
            id: true, 
            fullName: true, 
            matricNumber: true,
            email: true,
            phone: true,
            college: {
              select: {
                id: true,
                name: true,
                abbreviation: true
              }
            },
            department: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            level: {
              select: {
                level: true
              }
            }
          } 
        },
        exam: { 
          select: { 
            id: true,
            title: true,
            session: true,
            semester: true,
            scheduledStart: true,
            course: { 
              select: { 
                id: true,
                code: true,
                title: true,
                creditUnits: true
              } 
            } 
          } 
        },
      },
      orderBy: {
        student: {
          fullName: 'asc'
        }
      }
    }),

    // Get courses for filter dropdown
    prisma.course.findMany({
      where: {
        lecturerAssignments: {
          some: { lecturerId: user.id }
        }
      },
      select: {
        id: true,
        code: true,
        title: true,
        creditUnits: true,
        _count: {
          select: { registrations: true }
        }
      },
      orderBy: { code: 'asc' },
    }),

    // Get exams for filter dropdown
    prisma.exam.findMany({
      where: { createdBy: user.id },
      select: {
        id: true,
        title: true,
        session: true,
        semester: true,
        status: true,
        scheduledStart: true,
        course: {
          select: { code: true, title: true }
        }
      },
      orderBy: { scheduledStart: 'desc' },
    }),
  ]);

  // Build student summary data
  const studentMap = new Map();
  
  for (const r of results) {
    const studentId = r.student.id;
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        id: r.student.id,
        fullName: r.student.fullName,
        matricNumber: r.student.matricNumber,
        email: r.student.email,
        phone: r.student.phone,
        college: r.student.college,
        department: r.student.department,
        level: r.student.level,
        results: [],
        totalExams: 0,
        totalScore: 0,
        totalPercentage: 0,
        passedExams: 0,
        failedExams: 0,
        pendingExams: 0,
        totalViolations: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
        latestSubmission: null,
      });
    }
    
    const student = studentMap.get(studentId);
    student.results.push(r);
    student.totalExams++;
    student.totalScore += Number(r.score || 0);
    student.totalPercentage += Number(r.percentage || 0);
    student.totalViolations += r.violationCount || 0;
    
    if (r.passed === true) student.passedExams++;
    else if (r.passed === false) student.failedExams++;
    else student.pendingExams++;
    
    if (r.submittedAt && (!student.latestSubmission || r.submittedAt > student.latestSubmission)) {
      student.latestSubmission = r.submittedAt;
    }
  }

  // Compute averages for each student
  const students = Array.from(studentMap.values()).map(s => ({
    ...s,
    averageScore: s.totalExams > 0 ? Number((s.totalScore / s.totalExams).toFixed(1)) : 0,
    averagePercentage: s.totalExams > 0 ? Number((s.totalPercentage / s.totalExams).toFixed(1)) : 0,
    passRate: s.totalExams > 0 ? Math.round((s.passedExams / s.totalExams) * 100) : 0,
    latestSubmission: s.latestSubmission?.toISOString() || null,
  }));

  // Get unique sessions for filter
  const sessions = Array.from(new Set(exams.map(e => e.session))).sort().reverse();

  // Get unique colleges for filter
  const colleges = Array.from(
    new Map(
      students
        .filter(s => s.college)
        .map(s => [s.college.id, s.college])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Get unique departments for filter
  const departments = Array.from(
    new Map(
      students
        .filter(s => s.department)
        .map(s => [s.department.id, s.department])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Get unique levels for filter
  const levels = Array.from(
    new Set(
      students
        .filter(s => s.level)
        .map(s => s.level.level)
    )
  ).sort((a, b) => a - b);

  return {
    students,
    courses,
    exams: exams.map(e => ({
      id: e.id,
      title: e.title,
      session: e.session,
      semester: e.semester,
      status: e.status,
      scheduledStart: e.scheduledStart?.toISOString() || null,
      courseCode: e.course.code,
      courseTitle: e.course.title,
    })),
    sessions,
    colleges,
    departments,
    levels,
    summary: {
      totalStudents: students.length,
      totalExams: results.length,
      totalPassed: results.filter(r => r.passed === true).length,
      totalFailed: results.filter(r => r.passed === false).length,
      totalPending: results.filter(r => r.passed === null).length,
      averageScore: results.length > 0 
        ? Number((results.reduce((sum, r) => sum + Number(r.score || 0), 0) / results.length).toFixed(1))
        : 0,
      averagePercentage: results.length > 0
        ? Number((results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / results.length).toFixed(1))
        : 0,
      overallPassRate: results.length > 0
        ? Math.round((results.filter(r => r.passed === true).length / results.length) * 100)
        : 0,
      totalViolations: results.reduce((sum, r) => sum + (r.violationCount || 0), 0),
    }
  };
};