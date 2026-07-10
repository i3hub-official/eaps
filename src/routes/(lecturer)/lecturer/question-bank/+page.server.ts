// src/routes/(lecturer)/lecturer/question-bank/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

const PAGE_SIZE = 10

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	// Courses this lecturer actually teaches — used both for the course
	// filter dropdown and to scope every question query below. Combined
	// with createdById, this guarantees a lecturer only ever sees their
	// own questions on their own courses, even if a course offering's
	// lecturerId ever changes hands mid-session.
	const myCourses = await prisma.course.findMany({
		where: { status: 'ACTIVE', offerings: { some: { lecturerId: user.id } } },
		orderBy: { code: 'asc' },
	})
	const myCourseIds = myCourses.map((c) => c.id)

	const search = url.searchParams.get('search') ?? ''
	const courseFilter = url.searchParams.get('course') ?? 'all'
	const typeFilter = url.searchParams.get('type') ?? 'all'
	const difficultyFilter = url.searchParams.get('difficulty') ?? 'all'
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)

	const where = {
		createdById: user.id,
		courseId: courseFilter !== 'all' ? courseFilter : { in: myCourseIds },
		...(typeFilter !== 'all' ? { type: typeFilter as any } : {}),
		...(difficultyFilter !== 'all' ? { difficulty: difficultyFilter as any } : {}),
		...(search ? { body: { contains: search, mode: 'insensitive' as const } } : {}),
	}

	const [totalCount, questions] = await Promise.all([
		prisma.question.count({ where }),
		prisma.question.findMany({
			where,
			include: {
				course: true,
				options: true,
				tags: { include: { tag: true } },
			},
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
	])

	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		courses: myCourses.map((c) => ({ id: c.id, code: c.code, title: c.title })),
		questions: questions.map((q) => ({
			id: q.id,
			body: q.body,
			type: q.type,
			difficulty: q.difficulty,
			marks: q.marks.toString(),
			isActive: q.isActive,
			course: q.course ? `${q.course.code} — ${q.course.title}` : '—',
			optionCount: q.options.length,
			tagCount: q.tags.length,
			tagNames: q.tags.map((t) => t.tag.name),
		})),
		filters: { search, course: courseFilter, type: typeFilter, difficulty: difficultyFilter },
		pagination: { page, pageSize: PAGE_SIZE, totalCount, totalPages },
	}
}

export const actions: Actions = {
	toggleActive: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const questionId = String(formData.get('questionId') ?? '')

		const prisma = await getPrismaClient()
		const question = await prisma.question.findUnique({ where: { id: questionId } })
		if (!question || question.createdById !== user.id) {
			return fail(403, { error: 'Not your question' })
		}

		await prisma.question.update({
			where: { id: questionId },
			data: { isActive: !question.isActive },
		})

		return { success: true }
	},

	delete: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const questionId = String(formData.get('questionId') ?? '')

		const prisma = await getPrismaClient()
		const question = await prisma.question.findUnique({ where: { id: questionId } })
		if (!question || question.createdById !== user.id) {
			return fail(403, { error: 'Not your question' })
		}

		await prisma.question.delete({ where: { id: questionId } })
		return { success: true }
	},
}