// src/routes/(admin)/admin/levels/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to manage levels.',
			levels: [],
			stats: { total: 0, withCourses: 0, withStudents: 0 }
		}
	}

	const prisma = await getPrismaClient()

	const levels = await prisma.level.findMany({
		include: {
			courses: true,
			students: true,
		},
		orderBy: { name: 'asc' }
	})

	const stats = {
		total: levels.length,
		withCourses: levels.filter(l => l.courses.length > 0).length,
		withStudents: levels.filter(l => l.students.length > 0).length,
	}

	return {
		levels: levels.map(l => ({
			id: l.id,
			name: l.name,
			label: l.label,
			courseCount: l.courses.length,
			studentCount: l.students.length,
			createdAt: l.createdAt,
		})),
		stats
	}
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to create levels.' })
		}

		const formData = await request.formData()
		const name = parseInt(String(formData.get('name') ?? ''))
		const label = String(formData.get('label') ?? '').trim()

		if (!name || isNaN(name) || name <= 0) {
			return fail(400, { error: 'Invalid level name' })
		}

		if (!label) {
			return fail(400, { error: 'Level label is required' })
		}

		const prisma = await getPrismaClient()

		try {
			const existing = await prisma.level.findUnique({
				where: { name }
			})

			if (existing) {
				return fail(400, { error: `Level ${name} already exists` })
			}

			await prisma.level.create({
				data: { name, label }
			})

			return { success: true, message: `Level ${name} created successfully` }
		} catch (err) {
			console.error('[levels] Failed to create level:', err)
			return fail(500, { error: 'Failed to create level' })
		}
	},

	update: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to update levels.' })
		}

		const formData = await request.formData()
		const id = String(formData.get('id') ?? '')
		const label = String(formData.get('label') ?? '').trim()

		if (!id) {
			return fail(400, { error: 'Level ID is required' })
		}

		if (!label) {
			return fail(400, { error: 'Level label is required' })
		}

		const prisma = await getPrismaClient()

		try {
			await prisma.level.update({
				where: { id },
				data: { label }
			})

			return { success: true, message: 'Level updated successfully' }
		} catch (err) {
			console.error('[levels] Failed to update level:', err)
			return fail(500, { error: 'Failed to update level' })
		}
	},

	delete: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to delete levels.' })
		}

		const formData = await request.formData()
		const id = String(formData.get('id') ?? '')

		if (!id) {
			return fail(400, { error: 'Level ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			// Check if level has courses or students
			const level = await prisma.level.findUnique({
				where: { id },
				include: {
					courses: { take: 1 },
					students: { take: 1 }
				}
			})

			if (!level) {
				return fail(404, { error: 'Level not found' })
			}

			if (level.courses.length > 0) {
				return fail(400, { error: 'Cannot delete level with active courses' })
			}

			if (level.students.length > 0) {
				return fail(400, { error: 'Cannot delete level with enrolled students' })
			}

			await prisma.level.delete({
				where: { id }
			})

			return { success: true, message: 'Level deleted successfully' }
		} catch (err) {
			console.error('[levels] Failed to delete level:', err)
			return fail(500, { error: 'Failed to delete level' })
		}
	}
}