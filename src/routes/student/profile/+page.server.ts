// src/routes/student/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: true,
      college: true,
      level: true,
      programme: true,
      faceDescriptor: { select: { enrolledAt: true, updatedAt: true } },
      _count: {
        select: {
          courseRegistrations: true,
          examSessions: true,
          examResults: true,
        },
      },
    },
  });

  if (!fullUser) throw fail(404, { error: 'User not found' });

  // Recent activity
  const recentSessions = await prisma.examSession.findMany({
    where: { studentId: user.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      exam: { select: { title: true, course: { select: { code: true } } } },
    },
  });

  return {
    user: {
      id: fullUser.id,
      fullName: fullUser.fullName,
      email: fullUser.email,
      phone: fullUser.phone,
      title: fullUser.title,
      matricNumber: fullUser.matricNumber,
      jambRegNo: fullUser.jambRegNo,
      gender: fullUser.gender,
      dateOfBirth: fullUser.dateOfBirth,
      nationality: fullUser.nationality,
      stateOfOrigin: fullUser.stateOfOrigin,
      lga: fullUser.lga,
      address: fullUser.address,
      session: fullUser.session,
      level: fullUser.level,
      department: fullUser.department,
      college: fullUser.college,
      programme: fullUser.programme,
      photoUrl: fullUser.photoUrl,
      isActive: fullUser.isActive,
      isSuspended: fullUser.isSuspended,
      suspendedAt: fullUser.suspendedAt,
      enrolled: !!fullUser.faceDescriptor,
      enrolledAt: fullUser.faceDescriptor?.enrolledAt ?? null,
      createdAt: fullUser.createdAt,
      updatedAt: fullUser.updatedAt,
    },
    stats: {
      totalRegistrations: fullUser._count.courseRegistrations,
      totalExamSessions: fullUser._count.examSessions,
      totalResults: fullUser._count.examResults,
    },
    recentSessions: recentSessions.map(s => ({
      id: s.id,
      examTitle: s.exam.title,
      courseCode: s.exam.course?.code ?? '—',
      status: s.status,
      score: s.score,
      startedAt: s.startedAt,
      submittedAt: s.submittedAt,
    })),
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const user = await requireStudent(locals.user);
    const form = await request.formData();

    const phone = form.get('phone')?.toString() || null;
    const address = form.get('address')?.toString() || null;
    const gender = form.get('gender')?.toString() || null;

    await prisma.user.update({
      where: { id: user.id },
      data: { phone, address, gender },
    });

    return { success: true };
  },
};