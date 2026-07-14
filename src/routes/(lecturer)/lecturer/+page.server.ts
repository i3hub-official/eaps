// src/routes/(lecturer)/lecturer/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'

const STATUS_PRIORITY: Record<string, number> = {
	ACTIVE: 0,
	SCHEDULED: 1,
	DRAFT: 2,
	ENDED: 3,
	CANCELLED: 4,
}

const EMPTY_STATUS_COUNTS = { ACTIVE: 0, SCHEDULED: 0, DRAFT: 0, ENDED: 0, CANCELLED: 0 }

export const load: PageServerLoad = async ({ parent }) => {
	const { user, onboarding } = await parent()

	const prisma = await getPrismaClient()
	const staffId = user.id
	const now = new Date()

	const emptyStats = {
		courses: 0,
		students: 0,
		assessments: 0,
		pendingGrades: 0,
		questions: 0,
		published: 0,
		activeSessions: 0,
		totalSessions: 0,
		statusCounts: EMPTY_STATUS_COUNTS,
	}

	// ─── Get courses the lecturer actually teaches via CourseOffering ──────
	const offerings = await prisma.courseOffering.findMany({
		where: {
			lecturerId: staffId,
			course: { status: 'ACTIVE' },
		},
		select: {
			courseId: true,
			course: {
				select: {
					id: true,
					code: true,
					title: true,
				},
			},
		},
		distinct: ['courseId'],
	})

	const allCourses = offerings.map((o) => o.course)
	const courseIds = allCourses.map((c) => c.id)

	if (courseIds.length === 0) {
		return {
			stats: emptyStats,
			upcomingAssessments: [],
			pendingSubmissions: [],
			recentActivity: [],
			coursePerformance: [],
			assessmentStats: [],
			pendingGrades: [],
			assessmentOverview: [],
		}
	}

	// ─── Statistics ────────────────────────────────────────────────────────

	const courseCount = allCourses.length

	const studentCount = await prisma.courseRegistration.count({
		where: { status: 'APPROVED', courseId: { in: courseIds } },
	})

	const assessmentCount = await prisma.assessment.count({
		where: { createdById: staffId },
	})

	const publishedCount = await prisma.assessment.count({
		where: {
			createdById: staffId,
			status: {
				in: ['PUBLISHED', 'SCHEDULED', 'ACTIVE', 'ENDED'],
			},
		},
	})

	const questionCount = await prisma.question.count({
		where: { createdById: staffId, isActive: true },
	})

	const pendingGradesCount = await prisma.studentAnswer.count({
		where: {
			isManualGraded: false,
			session: { assessment: { createdById: staffId } },
		},
	})

	// ─── Upcoming Assessments (next 7 days) ────────────────────────────────

	const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

	const upcomingAssessments = await prisma.assessment.findMany({
		where: {
			createdById: staffId,
			status: { in: ['PUBLISHED', 'SCHEDULED', 'ACTIVE'] },
			startTime: { gte: now, lte: oneWeekFromNow },
			courseId: { in: courseIds },
		},
		select: {
			id: true,
			title: true,
			type: true,
			startTime: true,
			endTime: true,
			durationMinutes: true,
			status: true,
			course: { select: { code: true, title: true } },
		},
		orderBy: { startTime: 'asc' },
		take: 8,
	})

	// ─── Pending Submissions (due soon) ────────────────────────────────────

	const pendingSubmissions = await prisma.assessment.findMany({
		where: {
			createdById: staffId,
			type: 'ASSIGNMENT',
			dueDate: { gte: now, lte: oneWeekFromNow },
			courseId: { in: courseIds },
		},
		select: {
			id: true,
			title: true,
			type: true,
			dueDate: true,
			course: { select: { code: true, title: true } },
		},
		orderBy: { dueDate: 'asc' },
		take: 5,
	})

	// ─── Answers Awaiting Grade (from most recent) ─────────────────────────

	const recentAnswersToGrade = await prisma.studentAnswer.findMany({
		where: {
			isManualGraded: false,
			session: {
				assessment: {
					createdById: staffId,
					courseId: { in: courseIds },
				},
			},
		},
		include: {
			question: { select: { body: true } },
			session: {
				include: {
					assessment: { select: { title: true } },
					student: { select: { firstName: true, lastName: true, matricNumber: true } },
				},
			},
		},
		orderBy: { answeredAt: 'desc' },
		take: 5,
	})

	// ─── Active Exam Sessions Right Now ────────────────────────────────────

	const activeSessions = await prisma.assessmentSession.count({
		where: {
			assessment: {
				createdById: staffId,
				courseId: { in: courseIds },
			},
			status: 'IN_PROGRESS',
		},
	})

	const totalSessions = await prisma.assessmentSession.count({
		where: {
			assessment: {
				createdById: staffId,
				courseId: { in: courseIds },
			},
		},
	})

	// ─── Assessment Status Breakdown + "At a Glance" overview ──────────────
	// Powers the top-of-dashboard glance card: a count per status, plus a
	// priority-sorted list (ACTIVE → SCHEDULED → DRAFT → ENDED → CANCELLED,
	// matching the same priority order used on the assessments list page)
	// so the lecturer sees what needs attention first without opening a tab.

	const statusGroups = await prisma.assessment.groupBy({
		by: ['status'],
		where: { createdById: staffId, courseId: { in: courseIds } },
		_count: { _all: true },
	})

	const statusCounts = { ...EMPTY_STATUS_COUNTS }
	for (const g of statusGroups) {
		if (g.status in statusCounts) {
			statusCounts[g.status as keyof typeof statusCounts] = g._count._all
		}
	}

	const overviewCandidates = await prisma.assessment.findMany({
		where: {
			createdById: staffId,
			courseId: { in: courseIds },
			status: { in: ['ACTIVE', 'SCHEDULED', 'DRAFT', 'ENDED', 'CANCELLED'] },
		},
		select: {
			id: true,
			title: true,
			type: true,
			status: true,
			startTime: true,
			endTime: true,
			dueDate: true,
			updatedAt: true,
			course: { select: { code: true } },
		},
		orderBy: { updatedAt: 'desc' },
		take: 50,
	})

	const timeOf = (a: (typeof overviewCandidates)[number]) => {
		if (a.startTime) return new Date(a.startTime).getTime()
		if (a.dueDate) return new Date(a.dueDate).getTime()
		if (a.endTime) return new Date(a.endTime).getTime()
		return new Date(a.updatedAt).getTime()
	}

	const assessmentOverview = [...overviewCandidates]
		.sort((a, b) => {
			const pa = STATUS_PRIORITY[a.status] ?? 99
			const pb = STATUS_PRIORITY[b.status] ?? 99
			if (pa !== pb) return pa - pb
			return timeOf(a) - timeOf(b)
		})
		.slice(0, 10)
		.map((a) => ({
			id: a.id,
			title: a.title,
			type: a.type,
			status: a.status,
			courseCode: a.course.code,
			startTime: a.startTime,
			endTime: a.endTime,
			dueDate: a.dueDate,
		}))

	// ─── Course Performance Insights ───────────────────────────────────────

	const coursePerformance = await Promise.all(
		allCourses.map(async (course) => {
			const registrations = await prisma.courseRegistration.count({
				where: { courseId: course.id, status: 'APPROVED' },
			})

			const assessments = await prisma.assessment.count({
				where: { courseId: course.id, createdById: staffId },
			})

			const results = await prisma.assessmentResult.findMany({
				where: {
					assessment: { courseId: course.id, createdById: staffId },
				},
				select: { percentage: true, passed: true },
			})

			const avgScore =
				results.length > 0
					? Math.round(results.reduce((sum, r) => sum + Number(r.percentage), 0) / results.length)
					: 0

			const passRate =
				results.length > 0
					? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
					: 0

			return {
				id: course.id,
				code: course.code,
				name: course.title,
				students: registrations,
				assessments,
				avgScore,
				passRate,
			}
		}),
	)

	// ─── Assessment Statistics ────────────────────────────────────────────

	const assessmentStats = await Promise.all(
		(
			await prisma.assessment.findMany({
				where: {
					createdById: staffId,
					courseId: { in: courseIds },
				},
				select: { id: true, title: true, type: true, course: { select: { code: true } } },
				orderBy: { createdAt: 'desc' },
				take: 5,
			})
		).map(async (assessment) => {
			const sessions = await prisma.assessmentSession.count({
				where: { assessmentId: assessment.id, status: { in: ['SUBMITTED', 'TIMED_OUT'] } },
			})

			const avgScore = await prisma.assessmentResult.aggregate({
				where: { assessmentId: assessment.id },
				_avg: { percentage: true },
			})

			return {
				id: assessment.id,
				title: assessment.title,
				type: assessment.type,
				courseCode: assessment.course.code,
				completions: sessions,
				avgScore: avgScore._avg.percentage ? Math.round(Number(avgScore._avg.percentage)) : 0,
			}
		}),
	)

	// ─── Recent Activity ──────────────────────────────────────────────────

	const auditLogs = await prisma.auditLog.findMany({
		where: {
			staffId,
			action: {
				in: ['ASSESSMENT_CREATED', 'ASSESSMENT_PUBLISHED', 'QUESTION_ADDED', 'ANSWER_GRADED', 'RESULT_RELEASED'],
			},
		},
		orderBy: { createdAt: 'desc' },
		take: 10,
	})

	return {
		stats: {
			courses: courseCount,
			students: studentCount,
			assessments: assessmentCount,
			published: publishedCount,
			pendingGrades: pendingGradesCount,
			questions: questionCount,
			activeSessions,
			totalSessions,
			statusCounts,
		},
		upcomingAssessments: upcomingAssessments.map((a) => ({
			id: a.id,
			title: a.title,
			type: a.type,
			courseCode: a.course.code,
			courseName: a.course.title,
			startTime: a.startTime,
			endTime: a.endTime,
			duration: a.durationMinutes,
			status: a.status,
		})),
		pendingSubmissions: pendingSubmissions.map((a) => ({
			id: a.id,
			title: a.title,
			courseCode: a.course.code,
			dueDate: a.dueDate,
		})),
		pendingGrades: recentAnswersToGrade.map((a) => ({
			id: a.id,
			studentName: `${a.session.student.firstName} ${a.session.student.lastName}`,
			studentMatric: a.session.student.matricNumber,
			assessment: a.session.assessment.title,
			questionPreview: a.question.body.substring(0, 60) + (a.question.body.length > 60 ? '...' : ''),
			answeredAt: a.answeredAt,
		})),
		coursePerformance,
		assessmentStats,
		assessmentOverview,
		recentActivity: auditLogs.map((log) => ({
			id: log.id,
			action: log.action,
			entity: log.entity,
			createdAt: log.createdAt,
		})),
	}
}