// src/routes/(admin)/admin/settings/+page.server.ts
import { error, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

// Everyone except LECTURER and INVIGILATOR can manage the registration window.
// Adjust this list if your intended hierarchy differs.
const ROLES_ABOVE_LECTURER = [
	'SUPER_ADMIN',
	'VC',
	'DVC',
	'REGISTRAR',
	'UNIVERSITY_EXAM_OFFICER',
	'UNIVERSITY_COURSE_COORDINATOR',
	'DEAN',
	'HOD',
	'COLLEGE_EXAM_OFFICER',
	'COLLEGE_COORDINATOR',
	'DEPARTMENT_EXAM_OFFICER',
	'DEPARTMENT_COORDINATOR',
]

function assertRegistrationManager(user: any) {
	if (!ROLES_ABOVE_LECTURER.includes(user.primaryRole)) {
		throw error(403, 'You do not have permission to manage course registration.')
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)
	const prisma = await getPrismaClient()

	const isSuperAdmin = user.primaryRole === 'SUPER_ADMIN'
	const canManageRegistration = ROLES_ABOVE_LECTURER.includes(user.primaryRole)

	if (!isSuperAdmin && !canManageRegistration) {
		return {
			error: 'You do not have permission to view settings.',
			settings: {},
			permissions: { isSuperAdmin: false, canManageRegistration: false },
		}
	}

	const settings: Record<string, any> = {}

	// ─── SUPER_ADMIN-only sections ──────────────────────────────────────
	if (isSuperAdmin) {
		settings.general = {
			appName: 'EAPS',
			appVersion: '1.0.0',
			environment: process.env.NODE_ENV || 'development',
			baseUrl: url.origin,
		}

		settings.academic = {
			semesters: await prisma.semester.findMany({
				include: { session: true },
				orderBy: { startDate: 'desc' },
				take: 10,
			}),
			levels: await prisma.level.findMany({
				orderBy: { name: 'asc' },
			}),
		}

		settings.system = {
			nodeVersion: process.version,
			platform: process.platform,
			memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
			uptimeSeconds: Math.floor(process.uptime()),
		}

		settings.stats = {
			totalUsers: (await prisma.student.count()) + (await prisma.staff.count()),
			totalStudents: await prisma.student.count(),
			totalStaff: await prisma.staff.count(),
			totalCourses: await prisma.course.count(),
		}
	}

	// ─── Registration control (broader role set) ───────────────────────
	if (canManageRegistration) {
		const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } })

		if (!session) {
			settings.registration = {
				session: null,
				semesters: [],
				error: 'No active academic session. Set one before managing registration.',
			}
		} else {
			const semesters = await prisma.semester.findMany({
				where: { sessionId: session.id },
				orderBy: { startDate: 'asc' },
			})

			settings.registration = {
				session: { id: session.id, name: session.name },
				semesters: semesters.map((s) => ({
					id: s.id,
					type: s.type,
					isCurrent: s.isCurrent,
					registrationEnabled: s.registrationEnabled,
					regOpenAt: s.regOpenAt,
					regCloseAt: s.regCloseAt,
				})),
				error: null,
			}
		}
	}

	return {
		settings,
		permissions: { isSuperAdmin, canManageRegistration },
	}
}

export const actions: Actions = {
	toggle: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)
		assertRegistrationManager(user)
		const prisma = await getPrismaClient()

		const form = await request.formData()
		const semesterId = form.get('semesterId')?.toString() ?? ''
		const enabled = form.get('enabled')?.toString() === 'true'

		if (!semesterId) return fail(400, { error: 'Missing semester id.' })

		const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
		if (!semester) return fail(404, { error: 'Semester not found.' })

		await prisma.semester.update({
			where: { id: semesterId },
			data: { registrationEnabled: enabled },
		})

		return { success: true, message: enabled ? 'Registration enabled.' : 'Registration disabled.' }
	},

	updateWindow: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)
		assertRegistrationManager(user)
		const prisma = await getPrismaClient()

		const form = await request.formData()
		const semesterId = form.get('semesterId')?.toString() ?? ''
		const regOpenAtRaw = form.get('regOpenAt')?.toString() ?? ''
		const regCloseAtRaw = form.get('regCloseAt')?.toString() ?? ''

		if (!semesterId) return fail(400, { error: 'Missing semester id.' })

		const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
		if (!semester) return fail(404, { error: 'Semester not found.' })

		const regOpenAt = regOpenAtRaw ? new Date(regOpenAtRaw) : null
		const regCloseAt = regCloseAtRaw ? new Date(regCloseAtRaw) : null

		if (regOpenAt && regCloseAt && regCloseAt <= regOpenAt) {
			return fail(400, { error: 'Close time must be after open time.' })
		}

		await prisma.semester.update({
			where: { id: semesterId },
			data: { regOpenAt, regCloseAt },
		})

		return { success: true, message: 'Registration window updated.' }
	},
}