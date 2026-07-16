import { error, fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { CourseStatus, CourseType } from '@prisma/client'

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		throw error(403, 'You do not have permission to edit courses.')
	}

	const prisma = await getPrismaClient()

	const [course, departments, levels] = await Promise.all([
		prisma.course.findUnique({ where: { id: params.id } }),
		prisma.department.findMany({ select: { id: true, name: true, shortName: true }, orderBy: { name: 'asc' } }),
		prisma.level.findMany({ select: { id: true, name: true, label: true }, orderBy: { name: 'asc' } }),
	])

	if (!course) {
		throw error(404, 'Course not found.')
	}

	return {
		course,
		departments: departments.map(d => ({ value: d.id, label: d.name, sublabel: d.shortName })),
		levels: levels.map(l => ({ value: l.id, label: l.label || `${l.name} Level` })),
		courseTypes: Object.values(CourseType),
		courseStatuses: Object.values(CourseStatus),
	}
}

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = await requireStaff(locals.user)
		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to edit courses.' })
		}

		const prisma = await getPrismaClient()
		const form = await request.formData()

		const departmentId = form.get('departmentId')?.toString() ?? ''
		const levelId = form.get('levelId')?.toString() ?? ''
		const code = form.get('code')?.toString().trim().toUpperCase() ?? ''
		const title = form.get('title')?.toString().trim() ?? ''
		const creditUnitsRaw = form.get('creditUnits')?.toString() ?? ''
		const type = form.get('type')?.toString() ?? ''
		const status = form.get('status')?.toString() ?? ''
		const description = form.get('description')?.toString().trim() || null

		if (!departmentId || !levelId || !code || !title || !creditUnitsRaw || !type || !status) {
			return fail(400, { error: 'All fields except description are required.' })
		}

		const creditUnits = parseInt(creditUnitsRaw)
		if (Number.isNaN(creditUnits) || creditUnits < 1) {
			return fail(400, { error: 'Credit units must be a positive number.' })
		}

		if (!Object.values(CourseType).includes(type as CourseType)) {
			return fail(400, { error: 'Invalid course type.' })
		}
		if (!Object.values(CourseStatus).includes(status as CourseStatus)) {
			return fail(400, { error: 'Invalid course status.' })
		}

		const existing = await prisma.course.findUnique({ where: { id: params.id } })
		if (!existing) {
			return fail(404, { error: 'Course not found.' })
		}

		const codeConflict = await prisma.course.findFirst({ where: { code, id: { not: params.id } } })
		if (codeConflict) {
			return fail(400, { error: 'That course code is already in use.' })
		}

		await prisma.course.update({
			where: { id: params.id },
			data: {
				departmentId,
				levelId,
				code,
				title,
				creditUnits,
				type: type as CourseType,
				status: status as CourseStatus,
				description,
			},
		})

		throw redirect(303, `/admin/courses/${params.id}`)
	},
}