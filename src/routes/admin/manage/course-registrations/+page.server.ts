// src/routes/admin/manage/course-registrations/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [registrations, students, courses] = await Promise.all([
    prisma.courseRegistration.findMany({
      include: {
        student: { select: { id: true, fullName: true, email: true, matricNumber: true, level: true } },
        course: { include: { department: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { role: 'student', isActive: true },
      select: { id: true, fullName: true, matricNumber: true },
      orderBy: { fullName: 'asc' }
    }),
    prisma.course.findMany({
      include: { department: true },
      orderBy: { code: 'asc' }
    })
  ]);

  return { registrations, students, courses };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const studentId = data.get('studentId') as string;
    const courseId = data.get('courseId') as string;
    const session = data.get('session') as string;
    const semester = parseInt(data.get('semester') as string);

    if (!studentId) return fail(400, { error: 'Student selection is required' });
    if (!courseId) return fail(400, { error: 'Course selection is required' });
    if (!session) return fail(400, { error: 'Session is required' });
    if (isNaN(semester)) return fail(400, { error: 'Semester is required' });

    try {
      await prisma.courseRegistration.create({
        data: {
          id: crypto.randomUUID(),
          studentId,
          courseId,
          session,
          semester
        }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'Student is already registered for this course in this session and semester' });
      }
      return fail(500, { error: 'Failed to create course registration' });
    }
    return { success: true, message: 'Course registration created successfully' };
  },

  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = data.get('id') as string;
    const studentId = data.get('studentId') as string;
    const courseId = data.get('courseId') as string;
    const session = data.get('session') as string;
    const semester = parseInt(data.get('semester') as string);

    if (!studentId) return fail(400, { error: 'Student selection is required' });
    if (!courseId) return fail(400, { error: 'Course selection is required' });
    if (!session) return fail(400, { error: 'Session is required' });
    if (isNaN(semester)) return fail(400, { error: 'Semester is required' });

    try {
      await prisma.courseRegistration.update({
        where: { id },
        data: { studentId, courseId, session, semester }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'Student is already registered for this course in this session and semester' });
      }
      return fail(500, { error: 'Failed to update course registration' });
    }
    return { success: true, message: 'Course registration updated successfully' };
  },

  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = data.get('id') as string;

    try {
      await prisma.courseRegistration.delete({ where: { id } });
    } catch {
      return fail(500, { error: 'Failed to delete course registration' });
    }
    return { success: true, message: 'Course registration deleted successfully' };
  }
};