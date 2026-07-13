// src/routes/api/staff/invitations/verify/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { token } = await request.json()
		
		if (!token) {
			return json({ error: 'Token is required' }, { status: 400 })
		}

		const prisma = await getPrismaClient()
		const tokenHash = hashInvitationToken(token)

		const invitation = await prisma.staffInvitation.findUnique({
			where: { tokenHash },
			include: {
				college: true,
				department: true,
				courses: {
					include: {
						course: true
					}
				}
			}
		})

		if (!invitation) {
			return json({ error: 'Invalid invitation' }, { status: 404 })
		}

		if (invitation.status !== 'PENDING') {
			return json({ error: 'Invitation has already been used' }, { status: 400 })
		}

		if (invitation.expiresAt < new Date()) {
			return json({ error: 'Invitation has expired' }, { status: 400 })
		}

		return json({
			invitation: {
				id: invitation.id,
				email: invitation.email,
				role: invitation.primaryRole,
				college: invitation.college?.name || 'Not assigned',
				department: invitation.department?.name || 'Not assigned',
				levels: invitation.levels || [],
				courses: invitation.courses.map((ic: any) => ({
					id: ic.courseId,
					code: ic.course.code,
					title: ic.course.title
				}))
			}
		})
	} catch (err) {
		console.error('Verify invitation error:', err)
		return json({ error: 'Failed to verify invitation' }, { status: 500 })
	}
}