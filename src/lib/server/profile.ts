// src/lib/server/profile.ts

import { fail } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';
import type { ProfileData } from '$lib/types/user';

export async function loadProfile(userId: string, role?: string) {
  const prisma = await getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      level: true,
      college: true,
      department: {
        include: { college: true },
      },
      programme: true,
      ...(role === 'lecturer' && {
        createdExams: {
          include: { course: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      }),
      ...(role === 'student' && {
        courseRegistrations: {
          include: { course: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      }),
    },
  });

  if (!user) throw new Error('User not found');

  let stats: ProfileData['stats'] = [];
  let activeSemester: { session: string; semester: number; label: string | null } | null = null;

  switch (role) {
    case 'admin': {
      const [userCount, totalExams, violationCount, activeSessions] = await Promise.all([
        prisma.user.count(),
        prisma.exam.count(),
        prisma.violation.count(),
        prisma.authSession.count({ where: { expiresAt: { gt: new Date() } } }),
      ]);
      stats = [
        { label: 'Total Users',     value: userCount,       icon: 'Users'        },
        { label: 'Total Exams',     value: totalExams,      icon: 'BookOpen'     },
        { label: 'Violations',      value: violationCount,  icon: 'AlertCircle'  },
        { label: 'Active Sessions', value: activeSessions,  icon: 'Clock'        },
      ];
      break;
    }

    case 'lecturer': {
      const examIds = await prisma.exam
        .findMany({ where: { createdBy: userId }, select: { id: true } })
        .then(e => e.map(x => x.id));

      const [examCount, uniqueStudents, resultCount, avgScoreResult] = await Promise.all([
        prisma.exam.count({ where: { createdBy: userId } }),
        prisma.examSession.findMany({
          where: { exam: { createdBy: userId } },
          select: { studentId: true },
          distinct: ['studentId'],
        }),
        prisma.examResult.count({ where: { examId: { in: examIds } } }),
        prisma.examResult.aggregate({
          where: { exam: { createdBy: userId } },
          _avg: { percentage: true },
        }),
      ]);
      stats = [
        { label: 'Exams Created', value: examCount,            icon: 'FileText'  },
        { label: 'Students',      value: uniqueStudents.length, icon: 'Users'    },
        { label: 'Total Results', value: resultCount,           icon: 'Award'    },
        { label: 'Avg Score',     value: `${Math.round(Number(avgScoreResult._avg.percentage) || 0)}%`, icon: 'BarChart3' },
      ];
      break;
    }

    case 'hod': {
      const [deptLecturers, deptCourses, deptExams, deptStudents] = await Promise.all([
        prisma.user.count({
          where: { departmentId: user.departmentId ?? undefined, role: 'lecturer' },
        }),
        prisma.course.count({
          where: { departmentId: user.departmentId ?? undefined },
        }),
        prisma.exam.count({
          where: { course: { departmentId: user.departmentId ?? undefined } },
        }),
        prisma.courseRegistration.findMany({
          where: { course: { departmentId: user.departmentId ?? undefined } },
          select: { studentId: true },
          distinct: ['studentId'],
        }),
      ]);
      stats = [
        { label: 'Lecturers',  value: deptLecturers,          icon: 'Users'    },
        { label: 'Courses',    value: deptCourses,             icon: 'BookOpen' },
        { label: 'Exams',      value: deptExams,               icon: 'FileText' },
        { label: 'Students',   value: deptStudents.length,     icon: 'GraduationCap' },
      ];
      break;
    }

    case 'dean': {
      const [collegeDepts, collegeLecturers, collegeExams, collegeStudents] = await Promise.all([
        prisma.department.count({
          where: { collegeId: user.collegeId ?? undefined },
        }),
        prisma.user.count({
          where: { collegeId: user.collegeId ?? undefined, role: 'lecturer' },
        }),
        prisma.exam.count({
          where: { course: { department: { collegeId: user.collegeId ?? undefined } } },
        }),
        prisma.user.count({
          where: { collegeId: user.collegeId ?? undefined, role: 'student' },
        }),
      ]);
      stats = [
        { label: 'Departments', value: collegeDepts,     icon: 'Building'      },
        { label: 'Lecturers',   value: collegeLecturers, icon: 'Users'         },
        { label: 'Exams',       value: collegeExams,     icon: 'FileText'      },
        { label: 'Students',    value: collegeStudents,  icon: 'GraduationCap' },
      ];
      break;
    }

    case 'exam_officer': {
      const [scheduledExams, activeExams, totalResults, flaggedSessions] = await Promise.all([
        prisma.exam.count({ where: { status: 'scheduled' } }),
        prisma.exam.count({ where: { status: 'active' } }),
        prisma.examResult.count(),
        prisma.examSession.count({ where: { status: 'flagged' } }),
      ]);
      stats = [
        { label: 'Scheduled', value: scheduledExams,  icon: 'CalendarDays' },
        { label: 'Active',    value: activeExams,      icon: 'Clock'        },
        { label: 'Results',   value: totalResults,     icon: 'BarChart3'    },
        { label: 'Flagged',   value: flaggedSessions,  icon: 'AlertCircle'  },
      ];
      break;
    }

    case 'vc_dvc': {
      const [totalUsers, totalExams, totalResults, totalViolations] = await Promise.all([
        prisma.user.count(),
        prisma.exam.count(),
        prisma.examResult.count(),
        prisma.violation.count(),
      ]);
      stats = [
        { label: 'Total Users',      value: totalUsers,      icon: 'Users'       },
        { label: 'Total Exams',      value: totalExams,      icon: 'FileText'    },
        { label: 'Total Results',    value: totalResults,    icon: 'Award'       },
        { label: 'Total Violations', value: totalViolations, icon: 'AlertCircle' },
      ];
      break;
    }

    case 'invigilator': {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const [totalSessions, totalViolations, todaySessions, weekSessions] = await Promise.all([
        prisma.examSession.count({ where: { invigilatorId: userId } }),
        prisma.violation.count({ where: { session: { invigilatorId: userId } } }),
        prisma.examSession.count({
          where: { invigilatorId: userId, createdAt: { gte: startOfDay } },
        }),
        prisma.examSession.count({
          where: { invigilatorId: userId, createdAt: { gte: startOfWeek } },
        }),
      ]);
      stats = [
        { label: 'Sessions',   value: totalSessions,   icon: 'Clock'        },
        { label: 'Violations', value: totalViolations, icon: 'AlertCircle'  },
        { label: 'Today',      value: todaySessions,   icon: 'Calendar'     },
        { label: 'This Week',  value: weekSessions,    icon: 'CalendarDays' },
      ];
      break;
    }

    case 'student': {
      const [enrolledCourses, completedExams, avgScore, latestResult, sem] = await Promise.all([
        prisma.courseRegistration.count({ where: { studentId: userId } }),
        prisma.examResult.count({ where: { studentId: userId } }),
        prisma.examResult.aggregate({
          where: { studentId: userId },
          _avg: { percentage: true },
        }),
        prisma.examResult.findFirst({
          where: { studentId: userId },
          orderBy: { generatedAt: 'desc' },
          select: { grade: true },
        }),
        prisma.academicSemester.findFirst({
          where: { isActive: true },
          select: { session: true, semester: true, label: true },
        }),
      ]);
      activeSemester = sem;
      stats = [
        { label: 'Enrolled Courses', value: enrolledCourses,  icon: 'BookOpen'      },
        { label: 'Exams Taken',      value: completedExams,   icon: 'FileText'      },
        { label: 'Avg Score',        value: `${Math.round(Number(avgScore._avg.percentage) || 0)}%`, icon: 'Award' },
        { label: 'Latest Grade',     value: latestResult?.grade ?? 'N/A', icon: 'GraduationCap' },
      ];
      break;
    }

    default: {
      stats = [
        { label: 'Member Since', value: new Date(user.createdAt).getFullYear().toString(), icon: 'Calendar'  },
        { label: 'Status',       value: user.isActive ? 'Active' : 'Inactive',             icon: 'BadgeCheck' },
      ];
    }
  }

  // ── Courses ────────────────────────────────────────────────────────────────
  let courses: ProfileData['courses'] = [];
  if (role === 'lecturer' && (user as any).createdExams) {
    const seen = new Set<string>();
    for (const exam of (user as any).createdExams) {
      const courseId = exam.course?.id;
      if (courseId && !seen.has(courseId)) {
        seen.add(courseId);
        courses!.push({ id: courseId, title: exam.course.title, code: exam.course.code });
      }
    }
  } else if (role === 'student' && (user as any).courseRegistrations) {
    courses = (user as any).courseRegistrations.map((reg: any) => ({
      id:    reg.course.id,
      title: reg.course.title,
      code:  reg.course.code,
    }));
  }

  // ── Social links ───────────────────────────────────────────────────────────
  const socialLinks = {
    linkedin: user.linkedin || undefined,
    github:   user.github   || undefined,
    twitter:  user.twitter  || undefined,
  };

  // ── Last active ────────────────────────────────────────────────────────────
  const lastSession = await prisma.authSession.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  const lastActive = lastSession?.createdAt.toISOString();

  // ── College / Faculty name ─────────────────────────────────────────────────
  const collegeName = user.department?.college?.name || user.college?.name || undefined;

  // ── Active semester label (student only) ───────────────────────────────────
  const semesterLabel = activeSemester
    ? (activeSemester.label ?? `${activeSemester.session} — Semester ${activeSemester.semester}`)
    : undefined;

  const profile: ProfileData = {
    id:           user.id,
    name:         user.fullName,
    email:        user.email,
    phone:        user.phone        || undefined,
    avatar:       user.photoUrl     || undefined,
    bio:          user.bio          || undefined,
    title:        user.title        || undefined,
    address:      user.address      || undefined,
    state:        user.stateoforigin || undefined,
    lga:          user.lga          || undefined,
    department:   user.department?.name || undefined,
    college:      collegeName,
    level:        user.level?.level ? `${user.level.level} Level` : undefined,
    matricNumber: user.matricNumber || undefined,
    staffId:      user.staffId      || undefined,
    joinDate:     user.createdAt.toISOString(),
    session:      user.session      || undefined,
    programme:    user.programme?.name || undefined,
    semester:     semesterLabel,
    courses,
    stats,
    socialLinks,
    isVerified:   user.emailVerified,
    isActive:     user.isActive,
    lastActive,
  };

  return { profile };
}

// ── Profile update ─────────────────────────────────────────────────────────────

export async function updateProfile(request: Request, userId: string) {
  const prisma = await getPrismaClient();
  const fd = await request.formData();

  const bio     = fd.get('bio')?.toString()     || null;
  const phone   = fd.get('phone')?.toString()   || null;
  const title   = fd.get('title')?.toString()   || null;
  const address = fd.get('address')?.toString() || null;
  const state   = fd.get('state')?.toString()   || null;
  const lga     = fd.get('lga')?.toString()     || null;

  await prisma.user.update({
    where: { id: userId },
    data: { bio, phone, title, address, stateoforigin: state, lga },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'profile_update',
      entity:   'User',
      entityId: userId,
      metadata: {
        fields: ['bio', 'phone', 'title', 'address', 'state', 'lga'].filter(f =>
          fd.get(f)
        ),
      },
    },
  });

  return { success: true };
}

// ── Avatar update ──────────────────────────────────────────────────────────────

export async function updateAvatar(request: Request, userId: string) {
  const prisma = await getPrismaClient();
  const fd = await request.formData();
  const avatarUrl = fd.get('avatar')?.toString();

  if (!avatarUrl) return fail(400, { message: 'Avatar URL is required' });

  await prisma.user.update({
    where: { id: userId },
    data: { photoUrl: avatarUrl },
  });

  return { success: true };
}

// ── Action builder (shared by all portal +page.server.ts files) ───────────────

export function buildProfileActions(
  getUser: (locals: App.Locals) => { id: string } | null
) {
  return {
    update_profile: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
      const user = getUser(locals);
      if (!user) return fail(401);
      return updateProfile(request, user.id);
    },
    update_avatar: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
      const user = getUser(locals);
      if (!user) return fail(401);
      return updateAvatar(request, user.id);
    },
  };
}