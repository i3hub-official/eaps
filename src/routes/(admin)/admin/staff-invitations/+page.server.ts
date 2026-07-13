// src/routes/(admin)/admin/staff-invitations/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { createInvitationToken } from '$lib/server/auth/invitationToken'
import { sendStaffInvitationEmail } from '$lib/server/auth/email'
import { StaffRole } from '@prisma/client'
import { revealName } from '$lib/security/dataProtection.js'

const ASSIGNABLE_ROLES: StaffRole[] = Object.values(StaffRole).filter(
	(r) => r !== 'SUPER_ADMIN'
) as StaffRole[]

const INVITATION_EXPIRY_HOURS = 72

// Roles that don't need college/department assignment
const ROLES_WITHOUT_COLLEGE_DEPT: StaffRole[] = [
	'VC',
	'DVC',
	'REGISTRAR',
	'UNIVERSITY_EXAM_OFFICER',
	'UNIVERSITY_COURSE_COORDINATOR'
]

// Only these roles may issue invitations
const CAN_INVITE: StaffRole[] = ['SUPER_ADMIN']

// Helper to mask email
function maskEmail(email: string): string {
	if (!email) return ''
	const [local, domain] = email.split('@')
	if (local.length <= 3) {
		return `${local.charAt(0)}***@${domain}`
	}
	const first = local.charAt(0)
	const last = local.charAt(local.length - 1)
	const middle = '*'.repeat(Math.min(local.length - 2, 3))
	return `${first}${middle}${last}@${domain}`
}

export const load: PageServerLoad = async ({ locals }) => {
	await requireStaff(locals.user)
	const prisma = await getPrismaClient()

	const [colleges, departments, courses, invitations] = await Promise.all([
		prisma.college.findMany({ orderBy: { name: 'asc' } }),
		prisma.department.findMany({ orderBy: { name: 'asc' } }),
		prisma.course.findMany({ include: { level: true }, orderBy: { code: 'asc' } }),
		prisma.staffInvitation.findMany({
			include: { 
				college: true, 
				department: true, 
				courses: { include: { course: true } },
				acceptedStaff: true
			},
			orderBy: { createdAt: 'desc' },
			take: 50,
		}),
	])

	return {
		roles: ASSIGNABLE_ROLES,
		rolesWithoutCollegeDept: ROLES_WITHOUT_COLLEGE_DEPT,
		colleges: colleges.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName })),
		departments: departments.map((d) => ({ id: d.id, name: d.name, collegeId: d.collegeId })),
		courses: courses.map((c) => ({
			id: c.id,
			code: c.code,
			title: c.title,
			level: c.level.name,
			departmentId: c.departmentId,
		})),
		invitations: invitations.map((inv) => {
			let staffName = null
			if (inv.acceptedStaff && inv.status === 'ACCEPTED') {
				try {
					const firstName = revealName(inv.acceptedStaff.firstName)
					const lastName = revealName(inv.acceptedStaff.lastName)
					staffName = `${firstName} ${lastName}`
				} catch (e) {
					staffName = 'Unknown'
				}
			}
			
			return {
				id: inv.id,
				email: inv.email,
				maskedEmail: maskEmail(inv.email),
				staffName,
				role: inv.primaryRole,
				college: inv.college?.shortName || 'N/A',
				department: inv.department?.shortName || 'N/A',
				levels: inv.levels,
				courses: inv.courses.map((c) => c.course.code),
				status: inv.status,
				expiresAt: inv.expiresAt,
				createdAt: inv.createdAt,
				acceptedAt: inv.acceptedAt,
			}
		}),
	}
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const admin = await requireStaff(locals.user)
		if (!CAN_INVITE.includes(admin.primaryRole)) {
			return fail(403, { error: 'You do not have permission to invite staff.' })
		}

		const formData = await request.formData()
		const email = String(formData.get('email') ?? '').trim().toLowerCase()
		const primaryRole = String(formData.get('primaryRole') ?? '') as StaffRole
		const collegeId = String(formData.get('collegeId') ?? '')
		const departmentId = String(formData.get('departmentId') ?? '')
		const levels = formData.getAll('levels').map((v) => Number(v)).filter((n) => !Number.isNaN(n))
		const courseIds = formData.getAll('courseIds').map(String).filter(Boolean)

		const errors: Record<string, string> = {}
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'A valid email is required'
		if (!ASSIGNABLE_ROLES.includes(primaryRole)) errors.primaryRole = 'Select a valid role'

		// Only validate college/department for roles that need them
		const needsCollegeDept = !ROLES_WITHOUT_COLLEGE_DEPT.includes(primaryRole)
		
		if (needsCollegeDept) {
			if (!collegeId) errors.collegeId = 'Select a college'
			if (!departmentId) errors.departmentId = 'Select a department'
		}

		if (Object.keys(errors).length > 0) return fail(400, { errors })

		const prisma = await getPrismaClient()

		let college = null
		let department = null

		// Only validate college/department for roles that need them
		if (needsCollegeDept) {
			const [c, d] = await Promise.all([
				prisma.college.findUnique({ where: { id: collegeId } }),
				prisma.department.findUnique({ where: { id: departmentId } }),
			])
			college = c
			department = d
			
			if (!college) return fail(400, { errors: { collegeId: 'College not found' } })
			if (!department || department.collegeId !== collegeId) {
				return fail(400, { errors: { departmentId: 'Department does not belong to the selected college' } })
			}
		}

		// Verify selected courses
		if (courseIds.length > 0 && needsCollegeDept) {
			const validCourses = await prisma.course.findMany({
				where: { id: { in: courseIds }, departmentId },
				select: { id: true, levelId: true, level: { select: { name: true } } },
			})
			if (validCourses.length !== courseIds.length) {
				return fail(400, { errors: { courseIds: 'One or more selected courses are invalid for this department' } })
			}
			if (levels.length > 0) {
				const outOfScope = validCourses.some((c) => !levels.includes(c.level.name))
				if (outOfScope) {
					return fail(400, { errors: { courseIds: 'One or more selected courses fall outside the selected levels' } })
				}
			}
		}

		// One PENDING invitation per email at a time
		const existingPending = await prisma.staffInvitation.findFirst({
			where: { email, status: 'PENDING' },
		})
		if (existingPending) {
			return fail(400, {
				errors: { email: 'A pending invitation already exists for this email. Revoke it first to resend.' },
			})
		}

		const { token, tokenHash } = createInvitationToken()
		const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

		try {
			await prisma.staffInvitation.create({
				data: {
					email,
					primaryRole,
					collegeId: needsCollegeDept ? collegeId : null,
					departmentId: needsCollegeDept ? departmentId : null,
					levels: needsCollegeDept ? levels : [],
					tokenHash,
					status: 'PENDING',
					invitedById: admin.id,
					expiresAt,
					courses: needsCollegeDept && courseIds.length > 0 
						? { create: courseIds.map((courseId) => ({ courseId })) } 
						: undefined,
				},
			})
		} catch (err) {
			console.error('[staff-invitations] Failed to create invitation:', err)
			return fail(500, { error: 'Failed to create invitation' })
		}

		const courseList = courseIds.length && needsCollegeDept
			? (
					await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { code: true } })
				).map((c) => c.code)
			: []

		sendStaffInvitationEmail(
			email,
			primaryRole,
			needsCollegeDept ? college?.name || '' : 'N/A',
			needsCollegeDept ? department?.name || '' : 'N/A',
			courseList,
			token,
			INVITATION_EXPIRY_HOURS
		).catch((err) => console.error('[staff-invitations] Failed to send invitation email:', err))

		return { success: true }
	},

	resend: async ({ request, locals }) => {
		const admin = await requireStaff(locals.user)
		if (!CAN_INVITE.includes(admin.primaryRole)) {
			return fail(403, { error: 'You do not have permission to resend invitations.' })
		}

		const formData = await request.formData()
		const invitationId = String(formData.get('invitationId') ?? '')

		const prisma = await getPrismaClient()
		const invitation = await prisma.staffInvitation.findUnique({
			where: { id: invitationId },
			include: { 
				college: true, 
				department: true,
				courses: { include: { course: true } }
			},
		})

		if (!invitation) {
			return fail(404, { error: 'Invitation not found' })
		}

		if (invitation.status !== 'PENDING') {
			return fail(400, { error: 'Only pending invitations can be resent' })
		}

		// Generate new token and update expiry
		const { token, tokenHash } = createInvitationToken()
		const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

		await prisma.staffInvitation.update({
			where: { id: invitationId },
			data: {
				tokenHash,
				expiresAt,
				updatedAt: new Date(),
			},
		})

		const courseList = invitation.courses.map((c) => c.course.code)

		// Resend email
		sendStaffInvitationEmail(
			invitation.email,
			invitation.primaryRole,
			invitation.college?.name || 'N/A',
			invitation.department?.name || 'N/A',
			courseList,
			token,
			INVITATION_EXPIRY_HOURS
		).catch((err) => console.error('[staff-invitations] Failed to resend invitation email:', err))

		return { success: true }
	},

	revoke: async ({ request, locals }) => {
		const admin = await requireStaff(locals.user)
		if (!CAN_INVITE.includes(admin.primaryRole)) {
			return fail(403, { error: 'You do not have permission to revoke invitations.' })
		}

		const formData = await request.formData()
		const invitationId = String(formData.get('invitationId') ?? '')

		const prisma = await getPrismaClient()
		const invitation = await prisma.staffInvitation.findUnique({ where: { id: invitationId } })
		if (!invitation || invitation.status !== 'PENDING') {
			return fail(400, { error: 'Invitation cannot be revoked' })
		}

		await prisma.staffInvitation.update({
			where: { id: invitationId },
			data: { status: 'REVOKED' },
		})

		return { success: true }
	},
}