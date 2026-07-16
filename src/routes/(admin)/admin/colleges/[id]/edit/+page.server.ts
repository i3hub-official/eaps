import { error, fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		throw error(403, 'You do not have permission to edit colleges.')
	}

	const prisma = await getPrismaClient()

	const college = await prisma.college.findUnique({ where: { id: params.id } })

	if (!college) {
		throw error(404, 'College not found.')
	}

	return { college }
}

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = await requireStaff(locals.user)
		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to edit colleges.' })
		}

		const prisma = await getPrismaClient()
		const form = await request.formData()

		const name = form.get('name')?.toString().trim() ?? ''
		const shortName = form.get('shortName')?.toString().trim() ?? ''
		const code = form.get('code')?.toString().trim() ?? ''
		const email = form.get('email')?.toString().trim() || null
		const phone = form.get('phone')?.toString().trim() || null

		if (!name || !shortName || !code) {
			return fail(400, { error: 'Name, short name, and code are required.' })
		}

		const existing = await prisma.college.findUnique({ where: { id: params.id } })
		if (!existing) {
			return fail(404, { error: 'College not found.' })
		}

		const codeConflict = await prisma.college.findFirst({ where: { code, id: { not: params.id } } })
		if (codeConflict) {
			return fail(400, { error: 'That college code is already in use.' })
		}

		// University stays fixed for now -- reuse the existing universityId
		// rather than exposing it as an editable field.
		const shortNameConflict = await prisma.college.findFirst({
			where: { universityId: existing.universityId, shortName, id: { not: params.id } },
		})
		if (shortNameConflict) {
			return fail(400, { error: 'That short name is already used within this university.' })
		}

		await prisma.college.update({
			where: { id: params.id },
			data: { name, shortName, code, email, phone },
		})

		throw redirect(303, `/admin/colleges/${params.id}`)
	},
}