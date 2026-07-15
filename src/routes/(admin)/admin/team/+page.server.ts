// src/routes/(admin)/admin/developers/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { createInvitationToken } from '$lib/server/auth/invitationToken'
import { sendDeveloperInvitationEmail } from '$lib/server/auth/email'
import { StaffRole } from '@prisma/client'

const PAGE_SIZE = 10
const INVITATION_EXPIRY_HOURS = 168 // 7 days

// Only SUPER_ADMIN can manage developers
const CAN_MANAGE_DEVELOPERS: StaffRole[] = ['SUPER_ADMIN']

// Developer roles with descriptions
const DEVELOPER_ROLES = [
	{ value: 'OWNER', label: 'Owner', description: 'Full access - can manage everything including other developers' },
	{ value: 'ADMIN', label: 'Admin', description: 'Can manage the system but not other developers' },
	{ value: 'DEVELOPER', label: 'Developer', description: 'Can develop features but limited system access' },
	{ value: 'SUPPORT', label: 'Support', description: 'Can view data and help users but no system changes' },
	{ value: 'OBSERVER', label: 'Observer', description: 'Read-only access' },
]

// Available permissions for developers
const AVAILABLE_PERMISSIONS = [
	{ name: 'VIEW_DASHBOARD', display: 'View Dashboard', description: 'Access to overview dashboard' },
	{ name: 'MANAGE_USERS', display: 'Manage Users', description: 'Create, edit, delete user accounts' },
	{ name: 'MANAGE_COURSES', display: 'Manage Courses', description: 'Create, edit, delete courses' },
	{ name: 'MANAGE_ASSESSMENTS', display: 'Manage Assessments', description: 'Create, edit, delete assessments' },
	{ name: 'MANAGE_QUESTIONS', display: 'Manage Questions', description: 'Create, edit, delete questions' },
	{ name: 'VIEW_REPORTS', display: 'View Reports', description: 'Access analytics and reports' },
	{ name: 'MANAGE_GRADES', display: 'Manage Grades', description: 'Grade submissions and release results' },
	{ name: 'MANAGE_SETTINGS', display: 'Manage Settings', description: 'Configure system settings' },
	{ name: 'MANAGE_DEVELOPERS', display: 'Manage Developers', description: 'Add, remove, manage developer team' },
	{ name: 'VIEW_LOGS', display: 'View Logs', description: 'Access system logs and audit trails' },
	{ name: 'MANAGE_INVITATIONS', display: 'Manage Invitations', description: 'Send and manage staff invitations' },
	{ name: 'MANAGE_FACE_DATA', display: 'Manage Face Data', description: 'Access and manage face recognition data' },
]

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)
	
	// Check if user has permission to manage developers
	if (!CAN_MANAGE_DEVELOPERS.includes(user.primaryRole)) {
		return {
			error: 'You do not have permission to manage developers.',
			developers: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			availablePermissions: [],
			developerRoles: [],
            canManage: false,
		}
	}

	const prisma = await getPrismaClient()
	const page = parseInt(url.searchParams.get('page') || '1')
	const skip = (page - 1) * PAGE_SIZE

	const [developers, totalCount] = await Promise.all([
		prisma.developerTeam.findMany({
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.developerTeam.count(),
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	return {
		developers: developers.map((dev) => ({
			id: dev.id,
			email: dev.email,
			name: dev.name,
			role: dev.role,
			permissions: dev.permissions,
			isActive: dev.isActive,
			lastLoginAt: dev.lastLoginAt,
			createdAt: dev.createdAt,
			acceptedAt: dev.acceptedAt,
		})),
		pagination: {
			currentPage: page,
			totalPages,
			totalItems: totalCount,
			pageSize: PAGE_SIZE,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
		availablePermissions: AVAILABLE_PERMISSIONS,
		developerRoles: DEVELOPER_ROLES,
		canManage: true,
	}
}

export const actions: Actions = {

	invite: async ({ request, locals }) => {
	const user = await requireStaff(locals.user)
	
	if (!CAN_MANAGE_DEVELOPERS.includes(user.primaryRole)) {
		return fail(403, { error: 'You do not have permission to invite developers.' })
	}

	const formData = await request.formData()
	const email = String(formData.get('email') ?? '').trim().toLowerCase()
	const name = String(formData.get('name') ?? '').trim()
	const role = String(formData.get('role') ?? '')
	const permissions = formData.getAll('permissions').map(String).filter(Boolean)

	const errors: Record<string, string> = {}
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.email = 'A valid email is required'
	}
	if (!name) errors.name = 'Name is required'
	if (!role) errors.role = 'Select a role'

	if (Object.keys(errors).length > 0) {
		return fail(400, { errors })
	}

	const prisma = await getPrismaClient()

	// Check if developer already exists
	const existing = await prisma.developerTeam.findUnique({
		where: { email },
	})

	if (existing) {
		return fail(400, { 
			errors: { email: 'This developer is already on the team.' } 
		})
	}

	// Get role display name
	const roleDisplay = DEVELOPER_ROLES.find(r => r.value === role)?.label || role

	// Create invitation token
	const { token, tokenHash } = createInvitationToken()
	const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

	try {
		await prisma.developerTeam.create({
			data: {
				email,
				name,
				role: role as any,
				permissions,
				tokenHash,
				tokenExpiresAt: expiresAt,
				invitedBy: user.id,
				invitedAt: new Date(),
				isActive: false,
			},
		})

		// Send invitation email with role and permissions
		await sendDeveloperInvitationEmail(
			email,
			name,
			roleDisplay,
			permissions,
			token,
			INVITATION_EXPIRY_HOURS
		)

		return { success: true }
	} catch (err) {
		console.error('[team] Failed to invite developer:', err)
		return fail(500, { error: 'Failed to send invitation' })
	}
},

	update: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)
		
		if (!CAN_MANAGE_DEVELOPERS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to update developers.' })
		}

		const formData = await request.formData()
		const developerId = String(formData.get('developerId') ?? '')
		const role = String(formData.get('role') ?? '')
		const permissions = formData.getAll('permissions').map(String).filter(Boolean)
		const isActive = formData.get('isActive') === 'true'

		const prisma = await getPrismaClient()

		try {
			await prisma.developerTeam.update({
				where: { id: developerId },
				data: {
					role: role as any,
					permissions,
					isActive,
				},
			})
			return { success: true }
		} catch (err) {
			console.error('[developers] Failed to update developer:', err)
			return fail(500, { error: 'Failed to update developer' })
		}
	},

	remove: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)
		
		if (!CAN_MANAGE_DEVELOPERS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to remove developers.' })
		}

		const formData = await request.formData()
		const developerId = String(formData.get('developerId') ?? '')

		const prisma = await getPrismaClient()

		try {
			await prisma.developerTeam.delete({
				where: { id: developerId },
			})
			return { success: true }
		} catch (err) {
			console.error('[developers] Failed to remove developer:', err)
			return fail(500, { error: 'Failed to remove developer' })
		}
	},

	resendInvite: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)
		
		if (!CAN_MANAGE_DEVELOPERS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to resend invitations.' })
		}

		const formData = await request.formData()
		const developerId = String(formData.get('developerId') ?? '')

		const prisma = await getPrismaClient()
		const developer = await prisma.developerTeam.findUnique({
			where: { id: developerId },
		})

		if (!developer) {
			return fail(404, { error: 'Developer not found' })
		}

		// Generate new token
		const { token, tokenHash } = createInvitationToken()
		const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000)

		await prisma.developerTeam.update({
			where: { id: developerId },
			data: {
				tokenHash,
				tokenExpiresAt: expiresAt,
				invitedAt: new Date(),
			},
		})

		await sendDeveloperInvitationEmail(developer.email, developer.name, token, expiresAt)

		return { success: true }
	},

    accept: async ({ request }) => {
		const formData = await request.formData()
		const token = String(formData.get('token') ?? '')

		if (!token) {
			return fail(400, { error: 'Token is required' })
		}

		const prisma = await getPrismaClient()

		// Find developer by token
		const developer = await prisma.developerTeam.findFirst({
			where: {
				tokenHash: token,
				tokenExpiresAt: { gt: new Date() },
				isActive: false,
			},
		})

		if (!developer) {
			return fail(400, { error: 'Invalid or expired invitation token' })
		}

		// Accept the invitation
		await prisma.developerTeam.update({
			where: { id: developer.id },
			data: {
				isActive: true,
				acceptedAt: new Date(),
				tokenHash: null,
				tokenExpiresAt: null,
			},
		})

		// Redirect to login or developer dashboard
		throw redirect(303, '/login?developer=accepted')
	},
}