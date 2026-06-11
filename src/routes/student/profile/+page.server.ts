// src/routes/student/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

 const fullUser = await prisma.user.findUnique({
  where: { id: user.id },
  select: {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    title: true,
    matricNumber: true,
    jambRegNo: true,
    gender: true,
    dateOfBirth: true,
    nationality: true,
    stateoforigin: true,
    lga: true,
    address: true,
    session: true,
    bio: true,
    twitter: true,
    linkedin: true,
    github: true,
    photoUrl: true,
    isActive: true,
    isSuspended: true,
    suspendedAt: true,
    emailVerified: true,        // ← ADD THIS
    createdAt: true,
    updatedAt: true,
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

  // Calculate average score from exam results
  const examResults = await prisma.examResult.findMany({
    where: { studentId: user.id },
    select: { percentage: true },
  });

  const averageScore = examResults.length > 0
    ? Math.round(examResults.reduce((sum, r) => sum + (r.percentage ?? 0), 0) / examResults.length)
    : 0;

  // Recent activity
  const recentSessions = await prisma.examSession.findMany({
    where: { studentId: user.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      exam: { 
        select: { 
          title: true, 
          course: { select: { code: true } } 
        } 
      },
    },
  });

  // Get total credit units from registrations
  const registrations = await prisma.courseRegistration.findMany({
    where: { studentId: user.id },
    include: {
      course: { select: { creditUnits: true } },
    },
  });

  const totalCreditUnits = registrations.reduce((sum, reg) => sum + (reg.course?.creditUnits ?? 0), 0);

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
      stateoforigin: fullUser.stateoforigin,
      lga: fullUser.lga,
      address: fullUser.address,
      session: fullUser.session,
      bio: fullUser.bio ?? '',
          emailVerified: fullUser.emailVerified,
      twitter: fullUser.twitter ?? '',
      linkedin: fullUser.linkedin ?? '',
      github: fullUser.github ?? '',
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
      totalCreditUnits,
      averageScore,
    },
    recentSessions: recentSessions.map(s => ({
      id: s.id,
      examTitle: s.exam.title,
      courseCode: s.exam.course?.code ?? '—',
      status: s.status,
      score: s.score ? Math.round(s.score) : null,
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
    const bio = form.get('bio')?.toString() || null;
    const twitter = form.get('twitter')?.toString() || null;
    const linkedin = form.get('linkedin')?.toString() || null;
    const github = form.get('github')?.toString() || null;

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        phone, 
        address, 
        gender, 
        bio, 
        twitter, 
        linkedin, 
        github 
      },
    });

    return { success: true };
  },

  uploadPhoto: async ({ request, locals }) => {
    const user = await requireStudent(locals.user);
    const form = await request.formData();
    const photo = form.get('photo') as File;

    if (!photo || photo.size === 0) {
      return fail(400, { error: 'No photo provided' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(photo.type)) {
      return fail(400, { error: 'Invalid file type. Please upload JPEG, PNG, or WEBP' });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (photo.size > maxSize) {
      return fail(400, { error: 'File too large. Maximum size is 5MB' });
    }

    // Convert to base64 or upload to storage
    // For now, we'll convert to base64 (you should use a proper storage service in production)
    const buffer = Buffer.from(await photo.arrayBuffer());
    const base64 = buffer.toString('base64');
    const photoUrl = `data:${photo.type};base64,${base64}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl },
    });

    return { success: true, photoUrl };
  },

  removePhoto: async ({ locals }) => {
    const user = await requireStudent(locals.user);

    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: null },
    });

    return { success: true };
  },
};