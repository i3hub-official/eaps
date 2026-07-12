// src/routes/(auth)/onboarding/staff/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'
import { hashPassword, validatePasswordStrength, createStaffSession, STAFF_COOKIE, cookieOptions } from '$lib/server/auth'
import { staffRoleHome } from '$lib/server/auth/roleHome'
import { protectStaffData } from '$lib/security/dataProtection.js'

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? ''
	if (!token) return { error: 'Missing invitation token.' }

	const prisma = await getPrismaClient()
	const tokenHash = hashInvitationToken(token)

	const invitation = await prisma.staffInvitation.findUnique({
		where: { tokenHash },
		include: { college: true, department: true, courses: { include: { course: true } } },
	})

	if (!invitation) return { error: 'Invalid or unrecognized invitation link.' }
	if (invitation.status === 'ACCEPTED') return { error: 'This invitation has already been used.' }
	if (invitation.status === 'REVOKED') return { error: 'This invitation has been revoked.' }
	if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) {
		return { error: 'This invitation link has expired. Contact your administrator for a new one.' }
	}

	return {
		token,
		invitation: {
			email: invitation.email,
			role: invitation.primaryRole,
			college: invitation.college.name,
			department: invitation.department.name,
			courses: invitation.courses.map((c) => `${c.course.code} — ${c.course.title}`),
		},
	}
}

export const actions: Actions = {
	accept: async ({ request, cookies, getClientAddress }) => {
		const formData = await request.formData()
		const token = String(formData.get('token') ?? '')
		const firstName = String(formData.get('firstName') ?? '').trim()
		const otherNames = String(formData.get('otherNames') ?? '').trim() || null
		const lastName = String(formData.get('lastName') ?? '').trim()
		const password = String(formData.get('password') ?? '')

		const errors: Record<string, string> = {}
		if (!firstName) errors.firstName = 'First name is required'
		if (!lastName) errors.lastName = 'Last name is required'
		const pwErr = validatePasswordStrength(password)
		if (pwErr) errors.password = pwErr

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

		if (Object.keys(errors).length > 0) return fail(400, { errors })

		const passwordHash = await hashPassword(password)

		// Generate a unique staffNumber — no admin-facing "assign a staff
		// number" step exists in this flow, so derive one deterministically
		// from a counter-safe cuid suffix rather than requiring manual entry.
		const staffNumber = `STAFF-${invitation.primaryRole.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`

		try {
			const staff = await prisma.$transaction(async (tx) => {
				const protectedData = await protectStaffData({
					email: invitation.email,
					firstName,
					lastName,
					staffNumber,
				})

				const createdStaff = await tx.staff.create({
					data: {
						staffNumber,
						email: protectedData.email,
						emailHash: protectedData.emailHash,
						firstName: protectedData.firstName,
						firstNameHash: protectedData.firstNameHash,
						lastName: protectedData.lastName,
						lastNameHash: protectedData.lastNameHash,
						otherNames: otherNames ? protectedData.otherNames : null,
						otherNamesHash: otherNames ? protectedData.otherNamesHash : null,
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

				// Assign the invited courses in the current semester, if one
				// exists — mirrors the round-robin assignment logic from the
				// seed script, but here it's explicit courses picked by the
				// admin rather than auto-balanced.
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
			if (err && typeof err === 'object' && 'status' in err) throw err // redirect
			console.error('[onboarding/staff] Failed to accept invitation:', err)
			return fail(500, { error: 'Failed to complete onboarding. Please try again or contact your administrator.' })
		}
	},
}