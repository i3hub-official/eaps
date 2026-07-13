import type { Actions, PageServerLoad } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'
import { hashPassword, validatePasswordStrength, createStaffSession, STAFF_COOKIE, cookieOptions } from '$lib/server/auth'
import { staffRoleHome } from '$lib/server/auth/roleHome'
import { protectStaffData } from '$lib/security/dataProtection.js'

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/staff/dashboard')
	}
	return {}
}

export const actions: Actions = {
	setup: async ({ request, cookies, getClientAddress }) => {
		const formData = await request.formData()
		const token = String(formData.get('token') ?? '')
		const firstName = String(formData.get('firstName') ?? '').trim()
		const lastName = String(formData.get('lastName') ?? '').trim()
		const phoneNumber = String(formData.get('phoneNumber') ?? '').trim()
		const password = String(formData.get('password') ?? '')
		const confirmPassword = String(formData.get('confirmPassword') ?? '')

		if (!token) {
			return fail(400, { error: 'Your onboarding session is missing. Please start over from your invitation email.' })
		}

		const errors: Record<string, string> = {}
		if (!firstName || firstName.length < 2) errors.firstName = 'First name is required'
		if (!lastName || lastName.length < 2) errors.lastName = 'Last name is required'
		if (!phoneNumber || phoneNumber.length < 10) errors.phoneNumber = 'A valid phone number is required'
		if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
		const pwErr = validatePasswordStrength(password)
		if (pwErr) errors.password = pwErr

		if (Object.keys(errors).length > 0) return fail(400, { errors })

		const prisma = await getPrismaClient()
		const tokenHash = hashInvitationToken(token)

		const invitation = await prisma.staffInvitation.findUnique({
			where: { tokenHash },
			include: { courses: true },
		})

		if (!invitation) return fail(400, { error: 'Invalid invitation.' })
		if (invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
			return fail(400, { error: 'This invitation is no longer valid.' })
		}

		const passwordHash = await hashPassword(password)
		const staffNumber = `STAFF-${invitation.primaryRole.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`

		try {
			const staff = await prisma.$transaction(async (tx) => {
				// NOTE: verify protectStaffData's signature accepts `phone` —
				// if not, add phone/phoneHash handling to that helper first,
				// following the same deterministic-hash pattern as email/name.
				const protectedData = await protectStaffData({
					email: invitation.email,
					firstName,
					lastName,
					staffNumber,
					phone: phoneNumber,
				})

			const createdStaff = await tx.staff.create({
	data: {
		staffNumber, // plain value generated above — matches schema's plain @unique column
		email: protectedData.email,
		emailHash: protectedData.emailHash,
		firstName: protectedData.firstName,
		firstNameHash: protectedData.firstNameHash,
		lastName: protectedData.lastName,
		lastNameHash: protectedData.lastNameHash,
		phone: protectedData.phone,
		phoneHash: protectedData.phoneHash,
		passwordHash,
		primaryRole: invitation.primaryRole,
		collegeId: invitation.collegeId,
		departmentId: invitation.departmentId,
		status: 'ACTIVE',
		mustChangePassword: false,
	},
})

				const role = await tx.role.findUnique({ where: { name: invitation.primaryRole } })
				if (role) {
					await tx.staffRoleAssignment.create({
						data: { staffId: createdStaff.id, roleId: role.id, isActive: true },
					})
				}

				const currentSemester = await tx.semester.findFirst({ where: { isCurrent: true } })
				if (currentSemester && invitation.courses.length > 0) {
					for (const ic of invitation.courses) {
						const offering = await tx.courseOffering.findUnique({
							where: { courseId_semesterId: { courseId: ic.courseId, semesterId: currentSemester.id } },
						})
						if (offering) {
							await tx.courseOffering.update({
								where: { id: offering.id },
								data: { lecturerId: createdStaff.id },
							})
						} else {
							await tx.courseOffering.create({
								data: { courseId: ic.courseId, semesterId: currentSemester.id, lecturerId: createdStaff.id },
							})
						}
					}
				}

				await tx.staffInvitation.update({
					where: { id: invitation.id },
					data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedStaffId: createdStaff.id },
				})

				return createdStaff
			})

			const ip = getClientAddress()
			const userAgent = request.headers.get('user-agent') ?? undefined
			const { token: sessionToken } = await createStaffSession(staff.id, { ipAddress: ip, userAgent })
			cookies.set(STAFF_COOKIE, sessionToken, cookieOptions)

			throw redirect(303, staffRoleHome(staff.primaryRole))
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) throw err
			console.error('[onboarding/staff/setup] Failed to complete onboarding:', err)
			return fail(500, { error: 'Failed to complete onboarding. Please try again or contact your administrator.' })
		}
	},
}