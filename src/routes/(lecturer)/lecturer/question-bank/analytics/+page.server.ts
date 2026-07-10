// src/routes/(lecturer)/lecturer/question-bank/analytics/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	// Get all questions by this lecturer
	const allQuestions = await prisma.question.findMany({
		where: { createdById: user.id },
		include: {
			tags: { include: { tag: true } },
			assessmentQs: true,
			_count: {
				select: { assessmentQs: true },
			},
		},
	})

	// ─── Tag Statistics ───────────────────────────────────────────────────────

	const tagStats = new Map<
		string,
		{
			name: string
			count: number
			usedInAssessments: number
			avgMarks: number
			difficulty: Record<string, number>
		}
	>()

	for (const question of allQuestions) {
		for (const tagMap of question.tags) {
			const tagName = tagMap.tag.name
			if (!tagStats.has(tagName)) {
				tagStats.set(tagName, {
					name: tagName,
					count: 0,
					usedInAssessments: 0,
					avgMarks: 0,
					difficulty: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
				})
			}

			const stat = tagStats.get(tagName)!
			stat.count++
			stat.usedInAssessments += question._count.assessmentQs
			stat.avgMarks += Number(question.marks)
			stat.difficulty[question.difficulty]++
		}
	}

	// Calculate averages
	const tagStatsArray = Array.from(tagStats.values()).map((stat) => ({
		...stat,
		avgMarks: stat.count > 0 ? Number((stat.avgMarks / stat.count).toFixed(2)) : 0,
	}))

	// ─── Overall Statistics ──────────────────────────────────────────────────

	const totalQuestions = allQuestions.length
	const totalTags = tagStats.size

	const questionsUsedInAssessments = allQuestions.filter((q) => q._count.assessmentQs > 0).length
	const totalAssessmentUses = allQuestions.reduce((sum, q) => sum + q._count.assessmentQs, 0)

	const difficultyBreakdown = {
		EASY: allQuestions.filter((q) => q.difficulty === 'EASY').length,
		MEDIUM: allQuestions.filter((q) => q.difficulty === 'MEDIUM').length,
		HARD: allQuestions.filter((q) => q.difficulty === 'HARD').length,
		EXPERT: allQuestions.filter((q) => q.difficulty === 'EXPERT').length,
	}

	const totalMarks = allQuestions.reduce((sum, q) => sum + Number(q.marks), 0)
	const avgMarksPerQuestion = totalQuestions > 0 ? Number((totalMarks / totalQuestions).toFixed(2)) : 0

	// ─── Course Breakdown ────────────────────────────────────────────────────

	const courseStats = await prisma.course.findMany({
		where: {
			questions: {
				some: {
					createdById: user.id,
				},
			},
		},
		select: {
			id: true,
			code: true,
			title: true,
			_count: {
				select: {
					questions: {
						where: { createdById: user.id },
					},
				},
			},
		},
		orderBy: { code: 'asc' },
	})

	// ─── Most Used Questions ────────────────────────────────────────────────

	const mostUsedQuestions = allQuestions
		.filter((q) => q._count.assessmentQs > 0)
		.sort((a, b) => b._count.assessmentQs - a._count.assessmentQs)
		.slice(0, 10)
		.map((q) => ({
			id: q.id,
			body: q.body.substring(0, 100) + (q.body.length > 100 ? '...' : ''),
			difficulty: q.difficulty,
			marks: Number(q.marks),
			usedCount: q._count.assessmentQs,
			tags: q.tags.map((t) => t.tag.name),
		}))

	// ─── Unused Questions ───────────────────────────────────────────────────

	const unusedQuestions = allQuestions
		.filter((q) => q._count.assessmentQs === 0)
		.map((q) => ({
			id: q.id,
			body: q.body.substring(0, 100) + (q.body.length > 100 ? '...' : ''),
			difficulty: q.difficulty,
			marks: Number(q.marks),
			tags: q.tags.map((t) => t.tag.name),
		}))

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		stats: {
			totalQuestions,
			totalTags,
			questionsUsedInAssessments,
			totalAssessmentUses,
			avgQuestionsPerTag: totalTags > 0 ? Number((totalQuestions / totalTags).toFixed(2)) : 0,
			avgMarksPerQuestion,
			unusedQuestionsCount: unusedQuestions.length,
		},
		difficulty: difficultyBreakdown,
		tags: tagStatsArray.sort((a, b) => b.count - a.count),
		courses: courseStats.map((c) => ({
			id: c.id,
			code: c.code,
			title: c.title,
			questionCount: c._count.questions,
		})),
		mostUsedQuestions,
		unusedQuestions: unusedQuestions.slice(0, 10),
	}
}