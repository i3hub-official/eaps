// src/lib/server/staff/invitations.ts
import { randomBytes } from 'crypto'
import crypto from 'crypto'
import type { Prisma } from '@prisma/client'
import { getPrismaClient } from '$lib/server/db/index.js'

interface CreateInvitationOptions {
	email: string
	collegeId: string
	departmentId: string
	levels?: string[]
	expirationDays?: number
}

/**
 * Generate a secure staff invitation with hash fragment token.
 * Token is hashed before storing in DB.
 * Returns link with token in URL hash (never in query params).
 */
export async function generateStaffInvitation(options: CreateInvitationOptions) {
	const {
		email,
		collegeId,
		departmentId,
		levels = [],
		expirationDays = 7,
	} = options

	const prisma = await getPrismaClient()

	// Generate cryptographically secure random token
	const token = randomBytes(32).toString('hex')

	// Hash token for storage (can't be reversed)
	const tokenHash = crypto
		.createHash('sha256')
		.update(token)
		.digest('hex')

	// Calculate expiration
	const expiresAt = new Date()
	expiresAt.setDate(expiresAt.getDate() + expirationDays)

	try {
		// Create invitation in database
		const invitation = await prisma.staffInvitation.create({
			data: {
				email,
				tokenHash,
				collegeId,
				departmentId,
				levels,
				expiresAt,
				status: 'PENDING',
			},
		})

		// Generate onboarding URL with token in hash fragment
		// Hash fragment is client-side only, never sent to server in URL
		const baseUrl = process.env.PUBLIC_APP_URL || 'https://localhost:1209'
		const onboardingUrl = `${baseUrl}/onboarding#token=${token}`

		return {
			invitation: {
				id: invitation.id,
				email: invitation.email,
				status: invitation.status,
				expiresAt: invitation.expiresAt,
			},
			token, // Return token for email — don't store this!
			onboardingUrl, // Full link to send in email
		}
	} catch (err) {
		console.error('[STAFF-INVITATIONS] Error creating invitation:', err)
		throw err
	}
}

/**
 * Send invitation email to staff member.
 * Should be called after generateStaffInvitation().
 */
export async function sendInvitationEmail(
	email: string,
	firstName: string,
	lastName: string,
	onboardingUrl: string,
	collegeId: string,
	departmentId: string
) {
	// TODO: Implement email sending (Resend, SendGrid, etc.)
	// Example with Resend:
	/*
	const resend = new Resend(process.env.RESEND_API_KEY)

	const emailResult = await resend.emails.send({
		from: 'noreply@mouau.edu.ng',
		to: email,
		subject: 'Complete Your MOUAU e-Test Staff Account',
		html: `
			<h1>Welcome, ${firstName}!</h1>
			<p>You've been invited to join MOUAU e-Test as a lecturer.</p>
			<p><a href="${onboardingUrl}">Complete your account setup here</a></p>
			<p>This link expires in 7 days.</p>
		`
	})

	if (!emailResult.data?.id) {
		throw new Error('Failed to send invitation email')
	}
	*/

	console.log(`[STAFF-INVITATIONS] Invitation sent to ${email}`)
	console.log(`[STAFF-INVITATIONS] Onboarding URL: ${onboardingUrl}`)

	return { success: true }
}

/**
 * Revoke a pending invitation (before it's accepted).
 */
export async function revokeInvitation(invitationId: string) {
	const prisma = await getPrismaClient()

	const invitation = await prisma.staffInvitation.update({
		where: { id: invitationId },
		data: { status: 'REVOKED' },
	})

	console.info('[STAFF-INVITATIONS] Invitation revoked:', { invitationId })

	return invitation
}

/**
 * Get invitation stats for college/department.
 */
export async function getInvitationStats(departmentId: string) {
	const prisma = await getPrismaClient()

	const stats = await prisma.staffInvitation.groupBy({
		by: ['status'],
		where: { departmentId },
		_count: true,
	})

	return stats.reduce(
		(acc, item) => {
			acc[item.status] = item._count
			return acc
		},
		{} as Record<string, number>
	)
}

/**
 * List pending invitations for a department (for admin panel).
 */
export async function listPendingInvitations(departmentId: string) {
	const prisma = await getPrismaClient()

	const invitations = await prisma.staffInvitation.findMany({
		where: {
			departmentId,
			status: 'PENDING',
		},
		select: {
			id: true,
			email: true,
			createdAt: true,
			expiresAt: true,
		},
		orderBy: { createdAt: 'desc' },
	})

	return invitations
}