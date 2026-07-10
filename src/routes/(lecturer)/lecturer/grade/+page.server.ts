// src/routes/(lecturer)/lecturer/grade/+page.server.ts
import type { PageServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals, url }) => {
	// Protect route
	if (!locals.staff || locals.staff.primaryRole !== 'LECTURER') {
		throw redirect(303, '/login')
	}

	const prisma = await getPrismaClient()
	const staffId = locals.staff.id

	// ─── Filters ──────────────────────────────────────────────────────────────

	const courseFilter = url.searchParams.get('course')
	const statusFilter = url.searchParams.get('status') || 'pending'
	const search = url.searchParams.get('search')

	// ─── Get lecturer's courses ───────────────────────────────────────────────

	const courses = await prisma.course.findMany({
		where: { departmentId: locals.staff.departmentId },
		select: { id: true, code: true, title: true },
		orderBy: { code: 'asc' },
	})

	// ─── Build where clause for student answers ────────────────────────────────

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

	// ─── Fetch submissions ─────────────────────────────────────────────────────

	const submissions = await prisma.studentAnswer.findMany({
		where: whereClause,
		include: {
			session: {
				include: {
					assessment: {
						include: {
							course: { select: { code: true, title: true } },
						},
					},
					student: {
						select: { matricNumber: true, firstName: true, lastName: true },
					},
				},
			},
			question: {
				include: { options: true },
			},
		},
		orderBy: {
			answeredAt: 'desc',
		},
	})

	// Filter by search if provided
	let filtered = submissions
	if (search && search.trim()) {
		const searchLower = search.toLowerCase()
		filtered = submissions.filter(
			(s) =>
				s.question.body.toLowerCase().includes(searchLower) ||
				s.session.student.matricNumber.toLowerCase().includes(searchLower) ||
				s.session.student.firstName.toLowerCase().includes(searchLower) ||
				s.session.student.lastName.toLowerCase().includes(searchLower)
		)
	}

	return {
		staff: {
			id: locals.staff.id,
			firstName: locals.staff.firstName,
			lastName: locals.staff.lastName,
		},
		submissions: filtered.map((s) => ({
			id: s.id,
			questionId: s.questionId,
			sessionId: s.sessionId,
			studentName: `${s.session.student.firstName} ${s.session.student.lastName}`,
			studentMatric: s.session.student.matricNumber,
			course: `${s.session.assessment.course.code}`,
			assessment: s.session.assessment.title,
			questionBody: s.question.body.substring(0, 80) + (s.question.body.length > 80 ? '...' : ''),
			questionType: s.question.type,
			textAnswer: s.textAnswer,
			selectedOptions: s.selectedOptions as string[] | null,
			marksAwarded: s.marksAwarded ? Number(s.marksAwarded) : null,
			isGraded: s.isManualGraded,
			answeredAt: s.answeredAt,
		})),
		courses: [
			{ id: 'all', label: 'All courses' },
			...courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
		],
		filters: {
			course: courseFilter,
			status: statusFilter,
			search,
		},
		stats: {
			pending: submissions.filter((s) => !s.isManualGraded).length,
			graded: submissions.filter((s) => s.isManualGraded).length,
			total: submissions.length,
		},
	}
}