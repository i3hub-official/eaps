// src/routes/(admin)/admin/departments/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view departments.',
			departments: [],
			colleges: [],
			stats: { total: 0, students: 0, staff: 0, courses: 0 }
		}
	}

	const prisma = await getPrismaClient()

	const [departments, colleges] = await Promise.all([
		prisma.department.findMany({
			include: {
				college: true,
				students: true,
				staff: true,
				courses: true,
			},
			orderBy: { name: 'asc' }
		}),
		prisma.college.findMany({
			select: { id: true, name: true, shortName: true },
			orderBy: { name: 'asc' }
		})
	])

	const stats = {
		total: departments.length,
		students: departments.reduce((sum, d) => sum + d.students.length, 0),
		staff: departments.reduce((sum, d) => sum + d.staff.length, 0),
		courses: departments.reduce((sum, d) => sum + d.courses.length, 0),
	}

	return {
		departments: departments.map(d => ({
			id: d.id,
			name: d.name,
			shortName: d.shortName,
			code: d.code,
			collegeId: d.collegeId,
			college: d.college?.shortName || 'N/A',
			studentCount: d.students.length,
			staffCount: d.staff.length,
			courseCount: d.courses.length,
			createdAt: d.createdAt,
		})),
		colleges: colleges.map(c => ({ id: c.id, name: c.name, shortName: c.shortName })),
		stats
	}
}