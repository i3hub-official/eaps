import { error, fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		throw error(403, 'You do not have permission to edit departments.')
	}

	const prisma = await getPrismaClient()

	const [department, colleges] = await Promise.all([
		prisma.department.findUnique({ where: { id: params.id } }),
		prisma.college.findMany({ select: { id: true, name: true, shortName: true }, orderBy: { name: 'asc' } }),
	])

	if (!department) {
		throw error(404, 'Department not found.')
	}

	return {
		department,
		colleges: colleges.map(c => ({ value: c.id, label: c.name, sublabel: c.shortName })),
	}
}

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = await requireStaff(locals.user)
		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to edit departments.' })
		}

		const prisma = await getPrismaClient()
		const form = await request.formData()

		const collegeId = form.get('collegeId')?.toString() ?? ''
		const name = form.get('name')?.toString().trim() ?? ''
		const shortName = form.get('shortName')?.toString().trim() ?? ''
		const code = form.get('code')?.toString().trim() ?? ''
		const email = form.get('email')?.toString().trim() || null
		const phone = form.get('phone')?.toString().trim() || null

		if (!collegeId || !name || !shortName || !code) {
			return fail(400, { error: 'College, name, short name, and code are required.' })
		}

		const existing = await prisma.department.findUnique({ where: { id: params.id } })
		if (!existing) {
			return fail(404, { error: 'Department not found.' })
		}

		const codeConflict = await prisma.department.findFirst({ where: { code, id: { not: params.id } } })
		if (codeConflict) {
			return fail(400, { error: 'That department code is already in use.' })
		}

		const shortNameConflict = await prisma.department.findFirst({
			where: { collegeId, shortName, id: { not: params.id } },
		})
		if (shortNameConflict) {
			return fail(400, { error: 'That short name is already used within this college.' })
		}

		await prisma.department.update({
			where: { id: params.id },
			data: { collegeId, name, shortName, code, email, phone },
		})

		throw redirect(303, `/admin/departments/${params.id}`)
	},
}