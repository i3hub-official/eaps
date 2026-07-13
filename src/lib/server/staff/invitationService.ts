// src/lib/server/staff/invitationService.ts
import { createInvitationToken } from '$lib/server/auth/invitationToken'
import { getPrismaClient } from '$lib/server/db/index.js'
import type { Prisma } from '@prisma/client'

export interface CreateStaffInvitationInput {
	email: string
	collegeId: string
	departmentId: string
	levels?: string[]
	expirationDays?: number
}

export async function createStaffInvitation(input: CreateStaffInvitationInput) {
	const {
		email,
		collegeId,
		departmentId,
		levels = [],
		expirationDays = 7,
	} = input

	const prisma = await getPrismaClient()

	// Generate secure token (same pattern as password reset/verification tokens)
	const { token, tokenHash } = createInvitationToken()

	// Calculate expiration
	const expiresAt = new Date()
	expiresAt.setDate(expiresAt.getDate() + expirationDays)

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
		include: {
			college: { select: { id: true, name: true } },
			department: { select: { id: true, name: true } },
		},
	})

	// Build onboarding URL with token in hash fragment
	const baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173'
	const onboardingUrl = `${baseUrl}/onboarding#token=${token}`

	return {
		invitation: {
			id: invitation.id,
			email: invitation.email,
			college: invitation.college.name,
			department: invitation.department.name,
			status: invitation.status,
			expiresAt: invitation.expiresAt,
		},
		token, // Return raw token for email — don't store this client-side
		onboardingUrl, // Full URL to send in email
	}
}

export async function revokeStaffInvitation(invitationId: string) {
	const prisma = await getPrismaClient()

	return await prisma.staffInvitation.update({
		where: { id: invitationId },
		data: { status: 'REVOKED' },
	})
}

export async function getStaffInvitationStats(departmentId: string) {
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

export async function listPendingInvitations(departmentId: string, limit = 50) {
	const prisma = await getPrismaClient()

	return await prisma.staffInvitation.findMany({
		where: { departmentId, status: 'PENDING' },
		select: {
			id: true,
			email: true,
			createdAt: true,
			expiresAt: true,
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
	})
}