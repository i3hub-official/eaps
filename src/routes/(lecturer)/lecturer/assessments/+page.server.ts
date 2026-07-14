// src/routes/(lecturer)/lecturer/assessments/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireLecturer(locals.user)

	// Get filter params from URL
	const statusFilter = url.searchParams.get('status')
	const typeFilter = url.searchParams.get('type')
	const searchQuery = url.searchParams.get('search')

	if (!user.departmentId) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			assessments: [],
			stats: {
				total: 0,
				active: 0,
				draft: 0,
				published: 0,
				scheduled: 0,
				ended: 0,
				totalStudents: 0,
				completionRate: 0,
				avgScore: 0,
			},
			filters: {
				status: 'all',
				type: 'all',
				search: '',
			},
			error: 'No department assigned. Contact your HOD.'
		}
	}

	const prisma = await getPrismaClient()
	const staffId = user.id

	// ─── Build where clause with filters ──────────────────────────────────
	const where: any = { createdById: staffId }
	
	if (statusFilter && statusFilter !== 'all') {
		where.status = statusFilter
	}
	if (typeFilter && typeFilter !== 'all') {
		where.type = typeFilter
	}
	if (searchQuery) {
		where.OR = [
			{ title: { contains: searchQuery, mode: 'insensitive' } },
			{ course: { code: { contains: searchQuery, mode: 'insensitive' } } },
		]
	}

	// ─── Get assessments ──────────────────────────────────────────────────
	const assessments = await prisma.assessment.findMany({
		where,
		include: {
			course: {
				select: {
					code: true,
					title: true,
					level: { select: { name: true } },
				},
			},
			sessions: {
				select: {
					id: true,
					status: true,
				},
			},
			results: {
				select: {
					percentage: true,
					passed: true,
					marksObtained: true,
					totalMarks: true,
				},
			},
			tags: { include: { tag: true } },
			eligibility: {
				select: { studentId: true },
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

	// ─── Calculate statistics ──────────────────────────────────────────────
	let totalStudents = 0
	let totalCompletions = 0
	let totalSessions = 0
	let totalScores = 0
	let totalScoresCount = 0
	let activeCount = 0
	let draftCount = 0
	let publishedCount = 0
	let scheduledCount = 0
	let endedCount = 0

	const assessmentStats = assessments.map((assessment) => {
		const sessionCount = assessment.sessions.length
		const completedSessions = assessment.sessions.filter(
			s => s.status === 'SUBMITTED' || s.status === 'TIMED_OUT'
		).length
		const completionRate = sessionCount > 0 ? Math.round((completedSessions / sessionCount) * 100) : 0

		let avgScore = 0
		let passRate = 0
		if (assessment.results.length > 0) {
			const total = assessment.results.reduce((sum, r) => sum + Number(r.percentage || 0), 0)
			avgScore = Math.round(total / assessment.results.length)
			const passed = assessment.results.filter(r => r.passed === true).length
			passRate = Math.round((passed / assessment.results.length) * 100)
		}

		// Update totals
		totalStudents += sessionCount
		totalCompletions += completedSessions
		totalSessions += sessionCount
		if (assessment.results.length > 0) {
			const total = assessment.results.reduce((sum, r) => sum + Number(r.percentage || 0), 0)
			totalScores += total
			totalScoresCount += assessment.results.length
		}

		// Count by status
		if (assessment.status === 'ACTIVE') activeCount++
		if (assessment.status === 'DRAFT') draftCount++
		if (assessment.status === 'PUBLISHED') publishedCount++
		if (assessment.status === 'SCHEDULED') scheduledCount++
		if (assessment.status === 'ENDED') endedCount++

		// Get unique student count from eligibility
		const uniqueStudents = new Set(assessment.eligibility.map(e => e.studentId)).size

		return {
			id: assessment.id,
			title: assessment.title,
			type: assessment.type,
			status: assessment.status,
			courseCode: assessment.course.code,
			courseTitle: assessment.course.title,
			level: assessment.course.level?.name || null,
			studentCount: uniqueStudents || sessionCount,
			completionRate: completionRate,
			avgScore: avgScore,
			passRate: passRate,
			createdAt: assessment.createdAt,
			startTime: assessment.startTime,
			endTime: assessment.endTime,
			dueDate: assessment.dueDate,
			tags: assessment.tags.map((t) => t.tag.name),
			sessionCount: sessionCount,
			completedSessions: completedSessions,
		}
	})

	const overallCompletionRate = totalSessions > 0 ? Math.round((totalCompletions / totalSessions) * 100) : 0
	const overallAvgScore = totalScoresCount > 0 ? Math.round(totalScores / totalScoresCount) : 0

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		assessments: assessmentStats,
		stats: {
			total: assessments.length,
			active: activeCount,
			draft: draftCount,
			published: publishedCount,
			scheduled: scheduledCount,
			ended: endedCount,
			totalStudents: totalStudents,
			completionRate: overallCompletionRate,
			avgScore: overallAvgScore,
		},
		filters: {
			status: statusFilter || 'all',
			type: typeFilter || 'all',
			search: searchQuery || '',
		},
	}
}