import type { PageServerLoad } from './$types'
import { requireAdmin } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async (event) => {
  try {
    const { staff } = await requireAdmin(event)
    const prisma = await getPrismaClient()

    // ─── System Stats ──────────────────────────────────────────────────────────
    
    // User counts
    const [totalUsers, activeStudents, activeStaff] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.staff.count({ where: { status: 'ACTIVE' } }),
    ])

    // Academic stats
    const [courses, assessments, pendingReviews] = await Promise.all([
      prisma.course.count({ where: { status: 'ACTIVE' } }),
      prisma.assessment.count({
        where: {
          status: { in: ['PUBLISHED', 'SCHEDULED', 'ACTIVE'] },
        },
      }),
      prisma.assessmentResult.count({
        where: {
          isReleased: false,
          session: {
            status: 'SUBMITTED',
          },
        },
      }),
    ])

    // ─── Current Academic Session ─────────────────────────────────────────────
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true },
      include: {
        semesters: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    })

    // ─── Recent Activity (Audit Log) ──────────────────────────────────────────
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        actorType: { in: ['staff', 'student'] },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffNumber: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // ─── Registration Stats ────────────────────────────────────────────────────
    const [pendingRegistrations, approvedRegistrations, rejectedRegistrations, weeklyRegistrations] = await prisma.$transaction([
      prisma.courseRegistration.count({
        where: { status: 'PENDING' },
      }),
      prisma.courseRegistration.count({
        where: { status: 'APPROVED' },
      }),
      prisma.courseRegistration.count({
        where: { status: 'REJECTED' },
      }),
      prisma.courseRegistration.count({
        where: {
          status: 'APPROVED',
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
    ])

    // ─── Assessment Stats ──────────────────────────────────────────────────────
    const [draftAssessments, activeAssessments, scheduledAssessments, endedAssessments, activeSessions] = await prisma.$transaction([
      prisma.assessment.count({
        where: { status: 'DRAFT' },
      }),
      prisma.assessment.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.assessment.count({
        where: { status: 'SCHEDULED' },
      }),
      prisma.assessment.count({
        where: { status: 'ENDED' },
      }),
      prisma.assessmentSession.count({
        where: {
          status: 'IN_PROGRESS',
          expiresAt: { gt: new Date() },
        },
      }),
    ])

    // ─── Recent Registrations ──────────────────────────────────────────────────
    const recentRegistrations = await prisma.courseRegistration.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricNumber: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
        semester: {
          select: {
            type: true,
            session: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // ─── Recent Users ──────────────────────────────────────────────────────────
    const [recentStudents, recentStaff] = await Promise.all([
      prisma.student.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricNumber: true,
          email: true,
          status: true,
          createdAt: true,
          department: {
            select: {
              name: true,
            },
          },
          programme: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.staff.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffNumber: true,
          email: true,
          status: true,
          primaryRole: true,
          department: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // ─── Top Performing Students ──────────────────────────────────────────────
    const topStudents = await prisma.assessmentResult.findMany({
      where: {
        isReleased: true,
        passed: true,
      },
      select: {
        studentId: true,
        percentage: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            matricNumber: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { percentage: 'desc' },
      take: 5,
      distinct: ['studentId'],
    })

    // ─── Course Enrollment Stats ──────────────────────────────────────────────
    const topCourses = await prisma.courseRegistration.groupBy({
      by: ['courseId'],
      _count: {
        id: true,
      },
      where: {
        status: 'APPROVED',
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    })

    const topCourseIds = topCourses.map(c => c.courseId)
    const topCourseDetails = await prisma.course.findMany({
      where: {
        id: { in: topCourseIds },
      },
      select: {
        id: true,
        code: true,
        title: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    })

    const topCoursesWithCount = topCourses.map(c => ({
      ...c,
      course: topCourseDetails.find(d => d.id === c.courseId),
    }))

    // ─── Recent Violations ─────────────────────────────────────────────────────
    const recentViolations = await prisma.violation.findMany({
      where: {
        severity: { gte: 2 },
      },
      include: {
        session: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                matricNumber: true,
              },
            },
            assessment: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // ─── Assessment Completion Rate ───────────────────────────────────────────
    const [completed, totalAttempted, inProgress] = await prisma.$transaction([
      prisma.assessmentSession.count({
        where: {
          status: 'SUBMITTED',
        },
      }),
      prisma.assessmentSession.count({
        where: {
          status: { in: ['SUBMITTED', 'TIMED_OUT'] },
        },
      }),
      prisma.assessmentSession.count({
        where: {
          status: 'IN_PROGRESS',
        },
      }),
    ])

    const completionRate = totalAttempted > 0 
      ? Math.round((completed / totalAttempted) * 100) 
      : 0

    // ─── Return data with icon names as strings ──────────────────────────────
    // The icons will be mapped in the page component
    return {
      // Current session
      currentSession: currentSession ? {
        id: currentSession.id,
        name: currentSession.name,
        semester: currentSession.semesters[0]?.type ?? null,
        status: currentSession.status,
      } : null,

      // Stats with icon names as strings
      stats: [
        { label: 'Total Users', value: totalUsers, icon: 'Users', href: '/admin/users' },
        { label: 'Active Students', value: activeStudents, icon: 'Users', href: '/admin/users?filter=students' },
        { label: 'Active Staff', value: activeStaff, icon: 'Users', href: '/admin/users?filter=staff' },
        { label: 'Courses', value: courses, icon: 'BookOpen', href: '/admin/structure' },
        { label: 'Assessments', value: assessments, icon: 'ClipboardList', href: '/admin/assessments' },
        { label: 'Pending Reviews', value: pendingReviews, icon: 'AlertCircle', href: '/admin/reviews' },
      ],

      // System stats
      systemStats: {
        totalStudents: totalUsers,
        totalStaff: await prisma.staff.count(),
        activeStudents,
        activeStaff,
        courses,
        assessments,
        pendingReviews,
        pendingRegistrations,
        activeSessions,
        draftAssessments,
        completionRate,
      },

      // Registration stats
      registrationStats: {
        pending: pendingRegistrations,
        approved: approvedRegistrations,
        rejected: rejectedRegistrations,
        weekly: weeklyRegistrations,
      },

      // Assessment stats
      assessmentStats: {
        draft: draftAssessments,
        active: activeAssessments,
        scheduled: scheduledAssessments,
        ended: endedAssessments,
        activeSessions,
      },

      // Recent Activity
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        actorType: log.actorType,
        createdAt: log.createdAt.toISOString(),
        actorName: log.staff 
          ? `${log.staff.firstName} ${log.staff.lastName}`
          : log.student 
            ? `${log.student.firstName} ${log.student.lastName}`
            : 'System',
        actorId: log.staffId || log.studentId || null,
      })),

      // Recent registrations
      recentRegistrations: recentRegistrations.map(r => ({
        id: r.id,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        studentMatric: r.student.matricNumber,
        courseCode: r.course.code,
        courseTitle: r.course.title,
        semester: r.semester.type,
        session: r.semester.session.name,
        createdAt: r.createdAt.toISOString(),
      })),

      // Recent users
      recentUsers: {
        students: recentStudents.map(s => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          matricNumber: s.matricNumber,
          email: s.email,
          status: s.status,
          department: s.department?.name,
          programme: s.programme?.name,
          createdAt: s.createdAt.toISOString(),
        })),
        staff: recentStaff.map(s => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          staffNumber: s.staffNumber,
          email: s.email,
          status: s.status,
          role: s.primaryRole,
          department: s.department?.name,
          createdAt: s.createdAt.toISOString(),
        })),
      },

      // Top students
      topStudents: topStudents.map(s => ({
        name: `${s.student.firstName} ${s.student.lastName}`,
        matricNumber: s.student.matricNumber,
        department: s.student.department?.name,
        percentage: Number(s.percentage),
      })),

      // Top courses
      topCourses: topCoursesWithCount.map(c => ({
        code: c.course?.code || 'N/A',
        title: c.course?.title || 'Unknown',
        department: c.course?.department?.name || 'N/A',
        count: c._count.id,
      })),

      // Recent violations
      recentViolations: recentViolations.map(v => ({
        id: v.id,
        type: v.type,
        severity: v.severity,
        studentName: `${v.session.student.firstName} ${v.session.student.lastName}`,
        studentMatric: v.session.student.matricNumber,
        assessment: v.session.assessment.title,
        createdAt: v.createdAt.toISOString(),
      })),

      // System health
      systemHealth: {
        completionRate,
        totalAttempted,
        inProgress,
        pendingRegistrations,
        activeSessions,
      },

      // Timestamp
      loadedAt: new Date().toISOString(),
    }

  } catch (err) {
    console.error('Admin dashboard load error:', err)
    throw error(500, 'Failed to load admin dashboard')
  }
}