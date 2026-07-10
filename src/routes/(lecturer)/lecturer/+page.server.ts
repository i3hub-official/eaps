// src/routes/(lecturer)/lecturer/+page.server.ts (UPDATED)
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	if (!user.departmentId) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			stats: { courses: 0, students: 0, assessments: 0, pendingGrades: 0, questions: 0, published: 0 },
			upcomingAssessments: [],
			pendingSubmissions: [],
			recentActivity: [],
			coursePerformance: [],
			assessmentStats: [],
		}
	}

	const prisma = await getPrismaClient()
	const staffId = user.id
	const departmentId = user.departmentId
	const now = new Date()

	// ─── Get all courses in department ─────────────────────────────────────

	const allCourses = await prisma.course.findMany({
		where: { departmentId, status: 'ACTIVE' },
		select: { id: true, code: true, title: true },
	})

	const courseIds = allCourses.map((c) => c.id)

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
			session: { assessment: { createdById: staffId } },
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
			assessment: { createdById: staffId },
			status: 'IN_PROGRESS',
		},
	})

	const totalSessions = await prisma.assessmentSession.count({
		where: {
			assessment: { createdById: staffId },
		},
	})

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

			const avgScore = results.length > 0
				? Math.round(
						results.reduce((sum, r) => sum + Number(r.percentage), 0) / results.length
					)
				: 0

			const passRate = results.length > 0
				? Math.round(
						(results.filter((r) => r.passed).length / results.length) * 100
					)
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
		})
	)

	// ─── Assessment Statistics ────────────────────────────────────────────

	const assessmentStats = await Promise.all(
		(
			await prisma.assessment.findMany({
				where: { createdById: staffId },
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
		})
	)

	// ─── Recent Activity ──────────────────────────────────────────────────

	const auditLogs = await prisma.auditLog.findMany({
		where: {
			staffId: user.id,
			action: {
				in: [
					'ASSESSMENT_CREATED',
					'ASSESSMENT_PUBLISHED',
					'QUESTION_ADDED',
					'ANSWER_GRADED',
					'RESULT_RELEASED',
				],
			},
		},
		orderBy: { createdAt: 'desc' },
		take: 10,
	})

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		stats: {
			courses: courseCount,
			students: studentCount,
			assessments: assessmentCount,
			published: publishedCount,
			pendingGrades: pendingGradesCount,
			questions: questionCount,
			activeSessions,
			totalSessions,
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
		recentActivity: auditLogs.map((log) => ({
			id: log.id,
			action: log.action,
			entity: log.entity,
			createdAt: log.createdAt,
		})),
	}
}