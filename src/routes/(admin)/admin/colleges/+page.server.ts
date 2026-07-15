// src/routes/(admin)/admin/colleges/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view colleges.',
			colleges: [],
			stats: { total: 0, departments: 0, staff: 0, students: 0 }
		}
	}

	const prisma = await getPrismaClient()

	const colleges = await prisma.college.findMany({
		include: {
			departments: {
				include: {
					students: true,
					staff: true,
				}
			}
		},
		orderBy: { name: 'asc' }
	})

	const stats = {
		total: colleges.length,
		departments: colleges.reduce((sum, c) => sum + c.departments.length, 0),
		staff: colleges.reduce((sum, c) => sum + c.departments.reduce((s, d) => s + d.staff.length, 0), 0),
		students: colleges.reduce((sum, c) => sum + c.departments.reduce((s, d) => s + d.students.length, 0), 0),
	}

	return {
		colleges: colleges.map(c => ({
			id: c.id,
			name: c.name,
			shortName: c.shortName,
			code: c.code,
			email: c.email,
			phone: c.phone,
			departmentCount: c.departments.length,
			studentCount: c.departments.reduce((sum, d) => sum + d.students.length, 0),
			staffCount: c.departments.reduce((sum, d) => sum + d.staff.length, 0),
			createdAt: c.createdAt,
		})),
		stats
	}
}