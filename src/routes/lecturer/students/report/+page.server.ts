// src/routes/lecturer/students/report/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

  const prisma = await getPrismaClient();

  // Get students for dropdown
  const students = await prisma.user.findMany({
    where: {
      role: 'student',
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
    },
    orderBy: { fullName: 'asc' },
  });

  // Get exams for dropdown
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
    students,
    exams: exams.map(e => ({
      id: e.id,
      title: e.title,
      courseCode: e.course.code,
    })),
  };
};

export const actions: Actions = {
  submit: async (event) => {
    const user = event.locals.user;
    if (!user) throw redirect(303, '/login');
    if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

    const fd = await event.request.formData();
    const studentId = fd.get('studentId')?.toString();
    const reportType = fd.get('reportType')?.toString();
    const title = fd.get('title')?.toString();
    const description = fd.get('description')?.toString();
    const evidence = fd.get('evidence')?.toString();
    const examId = fd.get('examId')?.toString();

    if (!studentId) return fail(400, { error: 'Please select a student.' });
    if (!title) return fail(400, { error: 'Title is required.' });
    if (!description) return fail(400, { error: 'Description is required.' });

    const prisma = await getPrismaClient();

    // Create the report as a notification for admin/lecturer
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: `Student Report: ${title}`,
        message: `
          Report Type: ${reportType || 'General'}
          Student: ${studentId}
          ${examId ? `Related Exam: ${examId}` : ''}
          
          Description:
          ${description}
          
          ${evidence ? `Evidence:\n${evidence}` : ''}
        `,
        isRead: false,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'student_report',
        entity: 'student',
        entityId: studentId,
        metadata: {
          reportType,
          title,
          description: description.substring(0, 100),
          examId,
        },
      },
    });

    return { success: true };
  },
};