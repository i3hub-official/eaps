// src/routes/api/developer/invitations/verify/+server.ts
import { json } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'

export async function POST({ request }) {
	try {
		const { token } = await request.json()

		if (!token) {
			console.error('[developer/verify] No token provided')
			return json({ error: 'Token is required' }, { status: 400 })
		}

		console.log('[developer/verify] Token received:', token.substring(0, 10) + '...')

		const tokenHash = hashInvitationToken(token)
		console.log('[developer/verify] Token hash:', tokenHash)

		const prisma = await getPrismaClient()

		const invitation = await prisma.developerTeam.findFirst({
			where: { 
				tokenHash: tokenHash,
			},
		})

		console.log('[developer/verify] Invitation found:', invitation ? 'Yes' : 'No')

		if (!invitation) {
			return json({ error: 'Invalid invitation token. Please check your link and try again.' }, { status: 404 })
		}

		// Check if token has expired
		if (invitation.tokenExpiresAt && invitation.tokenExpiresAt < new Date()) {
			console.log('[developer/verify] Token expired at:', invitation.tokenExpiresAt)
			return json({ 
				error: 'This invitation has expired. Please request a new one from the administrator.' 
			}, { status: 400 })
		}

		// Check if already accepted
		if (invitation.isActive && invitation.acceptedAt) {
			return json({ 
				error: 'This invitation has already been accepted.' 
			}, { status: 400 })
		}

		return json({
			invitation: {
				id: invitation.id,
				email: invitation.email,
				name: invitation.name,
				role: invitation.role,
				permissions: invitation.permissions || [],
			}
		})
	} catch (error) {
		console.error('[developer/verify] Error:', error)
		return json({ 
			error: error instanceof Error ? error.message : 'Failed to verify invitation. Please contact support.' 
		}, { status: 500 })
	}
}