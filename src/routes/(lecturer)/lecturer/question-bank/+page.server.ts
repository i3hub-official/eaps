// src/routes/(lecturer)/lecturer/question-bank/+page.server.ts (UPDATED)
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireLecturer(locals.user)

	const prisma = await getPrismaClient()

	// ─── Filters ──────────────────────────────────────────────────────────────

	const courseFilter = url.searchParams.get('course')
	const typeFilter = url.searchParams.get('type')
	const difficultyFilter = url.searchParams.get('difficulty')
	const search = url.searchParams.get('search')

	// ─── Build where clause ───────────────────────────────────────────────

	const whereClause: any = {
		createdById: user.id,
	}

	if (courseFilter && courseFilter !== 'all') {
		whereClause.courseId = courseFilter
	}

	if (typeFilter && typeFilter !== 'all') {
		whereClause.type = typeFilter
	}

	if (difficultyFilter && difficultyFilter !== 'all') {
		whereClause.difficulty = difficultyFilter
	}

	if (search && search.trim()) {
		whereClause.body = {
			contains: search,
			mode: 'insensitive',
		}
	}

	// ─── Fetch questions ──────────────────────────────────────────────────

	const questions = await prisma.question.findMany({
		where: whereClause,
		include: {
			course: {
				select: { code: true, title: true },
			},
			options: true,
			tags: {
				include: { tag: true },
			},
		},
		orderBy: { createdAt: 'desc' },
	})

	// ─── Fetch lecturer's courses for filter ──────────────────────────────

	const courses = await prisma.course.findMany({
		where: { departmentId: user.departmentId },
		select: { id: true, code: true, title: true },
		orderBy: { code: 'asc' },
	})

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		questions: questions.map((q) => ({
			id: q.id,
			type: q.type,
			body: q.body.substring(0, 100) + (q.body.length > 100 ? '...' : ''),
			difficulty: q.difficulty,
			marks: Number(q.marks),
			course: q.course ? `${q.course.code}` : 'General',
			optionCount: q.options.length,
			tagCount: q.tags.length,
			createdAt: q.createdAt,
			isActive: q.isActive,
		})),
		courses: courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
		filters: {
			course: courseFilter,
			type: typeFilter,
			difficulty: difficultyFilter,
			search,
		},
	}
}