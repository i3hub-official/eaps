// src/routes/(lecturer)/lecturer/assessments/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: PageServerLoad = async ({ locals }) => {
	// Use the guard to ensure user is authenticated as lecturer
	const user = await requireLecturer(locals.user)

	// If no department ID, return error state
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
				totalStudents: 0,
				completionRate: 0,
				avgScore: 0,
			},
			error: 'No department assigned. Contact your HOD.'
		}
	}

	const prisma = await getPrismaClient()
	const staffId = user.id

	// ─── Get all assessments created by this lecturer ──────────────────────

	const assessments = await prisma.assessment.findMany({
		where: {
			createdById: staffId,
		},
		include: {
			course: {
				select: {
					code: true,
					title: true,
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
				},
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

	const assessmentStats = assessments.map((assessment) => {
		const sessionCount = assessment.sessions.length
		const completedSessions = assessment.sessions.filter(
			s => s.status === 'SUBMITTED' || s.status === 'TIMED_OUT'
		).length
		const completionRate = sessionCount > 0 ? Math.round((completedSessions / sessionCount) * 100) : 0

		let avgScore = 0
		if (assessment.results.length > 0) {
			const total = assessment.results.reduce((sum, r) => sum + Number(r.percentage), 0)
			avgScore = Math.round(total / assessment.results.length)
		}

		// Update totals
		totalStudents += sessionCount
		totalCompletions += completedSessions
		totalSessions += sessionCount
		if (assessment.results.length > 0) {
			const total = assessment.results.reduce((sum, r) => sum + Number(r.percentage), 0)
			totalScores += total
			totalScoresCount += assessment.results.length
		}

		if (assessment.status === 'ACTIVE' || assessment.status === 'SCHEDULED') {
			activeCount++
		}
		if (assessment.status === 'DRAFT') {
			draftCount++
		}

		return {
			id: assessment.id,
			title: assessment.title,
			type: assessment.type,
			status: assessment.status,
			courseCode: assessment.course.code,
			courseTitle: assessment.course.title,
			studentCount: sessionCount,
			completionRate: completionRate,
			avgScore: avgScore,
			createdAt: assessment.createdAt,
			startTime: assessment.startTime,
			endTime: assessment.endTime,
			dueDate: assessment.dueDate,
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
			totalStudents: totalStudents,
			completionRate: overallCompletionRate,
			avgScore: overallAvgScore,
		},
	}
}