// src/routes/(lecturer)/lecturer/grade/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { revealName, revealMatricNumber } from '$lib/security/dataProtection'
import { fail } from '@sveltejs/kit'

const AUTO_GRADABLE_TYPES = new Set(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'])

function scoreObjective(
	selectedOptions: string[] | null,
	options: { id: string; isCorrect: boolean }[]
): boolean {
	const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id).sort()
	const selectedIds = [...(selectedOptions ?? [])].sort()
	if (correctIds.length !== selectedIds.length) return false
	return correctIds.every((id, i) => id === selectedIds[i])
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireLecturer(locals.user)

	if (!user.departmentId) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			submissions: [],
			courses: [{ id: 'all', label: 'All courses' }],
			filters: { course: null, status: 'pending', search: null },
			stats: { pending: 0, graded: 0, total: 0, autoGradable: 0 },
			error: 'No department assigned. Contact your HOD.',
		}
	}

	const prisma = await getPrismaClient()
	const staffId = user.id

	const courseFilter = url.searchParams.get('course')
	const statusFilter = url.searchParams.get('status') || 'pending'
	const search = url.searchParams.get('search')

	const courses = await prisma.course.findMany({
		where: { departmentId: user.departmentId },
		select: { id: true, code: true, title: true },
		orderBy: { code: 'asc' },
	})

	const whereClause: any = {
		session: {
			assessment: { createdById: staffId },
		},
	}

	if (statusFilter === 'pending') {
		whereClause.isManualGraded = false
	} else if (statusFilter === 'graded') {
		whereClause.isManualGraded = true
	}

	if (courseFilter && courseFilter !== 'all') {
		whereClause.session = {
			...whereClause.session,
			assessment: {
				createdById: staffId,
				courseId: courseFilter,
			},
		}
	}

	const submissions = await prisma.studentAnswer.findMany({
		where: whereClause,
		include: {
			session: {
				include: {
					assessment: {
						include: {
							course: { select: { id: true, code: true, title: true } },
						},
					},
					student: {
						select: {
							matricNumber: true,
							firstName: true,
							lastName: true,
							otherNames: true,
						},
					},
				},
			},
			question: {
				include: { options: true },
			},
		},
		orderBy: { answeredAt: 'desc' },
	})

	let filtered = submissions
	if (search && search.trim()) {
		const q = search.toLowerCase()
		filtered = submissions.filter((s) => {
			if (s.question.body.toLowerCase().includes(q)) return true
			try {
				const matric = revealMatricNumber(s.session.student.matricNumber).toLowerCase()
				const first = revealName(s.session.student.firstName).toLowerCase()
				const last = revealName(s.session.student.lastName).toLowerCase()
				return matric.includes(q) || first.includes(q) || last.includes(q)
			} catch {
				return false
			}
		})
	}

	const processedSubmissions = filtered.map((s) => {
		let studentName = 'Unknown Student'
		try {
			const first = revealName(s.session.student.firstName)
			const last = revealName(s.session.student.lastName)
			const other = s.session.student.otherNames
				? revealName(s.session.student.otherNames)
				: ''
			studentName = `${last}, ${first}${other ? ' ' + other : ''}`.trim()
		} catch {}

		let studentMatric = 'Unknown'
		try {
			studentMatric = revealMatricNumber(s.session.student.matricNumber)
		} catch {}

		const isAutoGradable = AUTO_GRADABLE_TYPES.has(s.question.type)
		const autoCorrect = isAutoGradable
			? scoreObjective(s.selectedOptions as string[] | null, s.question.options)
			: null

		return {
			id: s.id,
			questionId: s.questionId,
			sessionId: s.sessionId,
			studentName,
			studentMatric,
			courseId: s.session.assessment.course.id,
			course: s.session.assessment.course.code,
			assessment: s.session.assessment.title,
			questionBody:
				s.question.body.substring(0, 80) + (s.question.body.length > 80 ? '…' : ''),
			questionType: s.question.type,
			textAnswer: s.textAnswer,
			selectedOptions: s.selectedOptions as string[] | null,
			marksAwarded: s.marksAwarded ? Number(s.marksAwarded) : null,
			isGraded: s.isManualGraded,
			isAutoGradable,
			autoCorrect,
			answeredAt: s.answeredAt,
		}
	})

	const autoGradableCount = processedSubmissions.filter(
		(s) => s.isAutoGradable && !s.isGraded
	).length

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		submissions: processedSubmissions,
		courses: [
			{ id: 'all', label: 'All courses' },
			...courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
		],
		filters: { course: courseFilter, status: statusFilter, search },
		stats: {
			pending: submissions.filter((s) => !s.isManualGraded).length,
			graded: submissions.filter((s) => s.isManualGraded).length,
			total: submissions.length,
			autoGradable: autoGradableCount,
		},
	}
}

export const actions: Actions = {
	autoGrade: async ({ locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const pending = await prisma.studentAnswer.findMany({
			where: {
				isManualGraded: false,
				question: { type: { in: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'] } },
				session: { assessment: { createdById: user.id } },
			},
			include: {
				question: { include: { options: true } },
			},
		})

		if (pending.length === 0) {
			return { success: true, graded: 0, message: 'No pending objective answers to grade.' }
		}

		const updates = pending.map((answer) => {
			const isCorrect = scoreObjective(
				answer.selectedOptions as string[] | null,
				answer.question.options
			)
			const marks = isCorrect ? Number(answer.question.marks ?? 1) : 0
			return prisma.studentAnswer.update({
				where: { id: answer.id },
				data: { isManualGraded: true, marksAwarded: marks },
			})
		})

		try {
			await prisma.$transaction(updates)
		} catch (err) {
			console.error('[autoGrade] transaction failed:', err)
			return fail(500, { error: 'Auto-grading failed. Please try again.' })
		}

		return {
			success: true,
			graded: pending.length,
			message: `${pending.length} answer${pending.length === 1 ? '' : 's'} auto-graded successfully.`,
		}
	},

	// ─── Bulk Grade ──────────────────────────────────────────────────────
	bulkGrade: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const submissionIdsJson = formData.get('submissionIds')?.toString()
		const marksJson = formData.get('marks')?.toString()

		if (!submissionIdsJson || !marksJson) {
			return fail(400, { error: 'Submission IDs and marks are required' })
		}

		let submissionIds: string[]
		let marks: Record<string, number>
		try {
			submissionIds = JSON.parse(submissionIdsJson)
			marks = JSON.parse(marksJson)
		} catch {
			return fail(400, { error: 'Invalid data format' })
		}

		const prisma = await getPrismaClient()

		try {
			const updates = submissionIds.map((id) => {
				const mark = marks[id] || 0
				return prisma.studentAnswer.update({
					where: {
						id,
						session: { assessment: { createdById: user.id } },
					},
					data: {
						isManualGraded: true,
						marksAwarded: mark,
						gradedAt: new Date(),
						gradedById: user.id,
					},
				})
			})

			await prisma.$transaction(updates)
			return { success: true, count: submissionIds.length }
		} catch (err) {
			console.error('[bulkGrade] transaction failed:', err)
			return fail(500, { error: 'Bulk grading failed. Please try again.' })
		}
	},
}