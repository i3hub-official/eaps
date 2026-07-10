// src/routes/(lecturer)/lecturer/courses/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { revealName } from '$lib/security/dataProtection'

// Encrypted names can fail to decrypt if stale/corrupt — fall back rather
// than throwing and taking down the whole page (mirrors hooks.server.ts).
function safeDecrypt(fn: () => string, fallback: string): string {
	try {
		return fn()
	} catch {
		return fallback
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	if (!user.departmentId) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			courses: [],
			error: 'No department assigned. Contact your HOD.',
		}
	}

	const prisma = await getPrismaClient()
	const departmentId = user.departmentId

	const currentSemester = await prisma.semester.findFirst({ where: { isCurrent: true } })

	const courses = await prisma.course.findMany({
		where: { departmentId, status: 'ACTIVE' },
		include: {
			level: true,
			registrations: { where: { status: 'APPROVED' } },
			assessments: { where: { createdById: user.id } },
			questions: { where: { createdById: user.id } },
			offerings: currentSemester
				? { where: { semesterId: currentSemester.id, lecturerId: user.id }, include: { lecturer: true } }
				: false,
		},
		orderBy: [{ level: { name: 'asc' } }, { code: 'asc' }],
	})

	const mapped = courses.map((c) => {
		// unique([courseId, semesterId]) means at most one offering per course
		// for the current semester.
		const offering = c.offerings?.[0]
		const isMine = offering?.lecturerId === user.id

		let lecturerName: string | null = null
		if (offering?.lecturer) {
			const first = safeDecrypt(() => revealName(offering.lecturer!.firstName), '')
			const last = safeDecrypt(() => revealName(offering.lecturer!.lastName), '')
			lecturerName = `${last} ${first}`.trim() || null
		}

		return {
			id: c.id,
			code: c.code,
			title: c.title,
			creditUnits: c.creditUnits,
			type: c.type,
			level: c.level.name,
			studentCount: c.registrations.length,
			assessmentCount: c.assessments.length,
			questionCount: c.questions.length,
			isMine,
			lecturerName,
		}
	})

	// Lecturer's own courses first, then by level/code (already sorted by the query).
	mapped.sort((a, b) => Number(b.isMine) - Number(a.isMine))

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		courses: mapped,
	}
}