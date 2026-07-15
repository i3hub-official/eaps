// src/routes/api/developer/invitations/verify/+server.ts
import { json } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'

export async function POST({ request }) {
	try {
		const { token } = await request.json()

		if (!token) {
			return json({ error: 'Token is required' }, { status: 400 })
		}

		const tokenHash = hashInvitationToken(token)
		const prisma = await getPrismaClient()

		const invitation = await prisma.developerTeam.findUnique({
			where: { tokenHash },
		})

		if (!invitation) {
			return json({ error: 'Invalid invitation token' }, { status: 404 })
		}

		if (!invitation.isActive || invitation.tokenExpiresAt < new Date()) {
			return json({ error: 'This invitation has expired' }, { status: 400 })
		}

		return json({
			invitation: {
				id: invitation.id,
				email: invitation.email,
				role: invitation.role,
				permissions: invitation.permissions,
			}
		})
	} catch (error) {
		console.error('[api/developer/invitations/verify] Error:', error)
		return json({ error: 'Failed to verify invitation' }, { status: 500 })
	}
}