// src/routes/(admin)/admin/access-control/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { revealName } from '$lib/security/dataProtection.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to manage access control.',
			roles: [],
			permissions: [],
			staff: [],
			stats: { totalRoles: 0, totalPermissions: 0, totalAssignments: 0 }
		}
	}

	const prisma = await getPrismaClient()

	const [roles, permissions, staffWithRoles] = await Promise.all([
		prisma.role.findMany({
			include: {
				permissions: {
					include: {
						permission: true
					}
				},
				staffRoles: {
					include: {
						staff: true
					}
				}
			},
			orderBy: { name: 'asc' }
		}),
		// ─── FIX: Use array for multiple orderBy fields ──────────────────
		prisma.permission.findMany({
			orderBy: [
				{ group: 'asc' },
				{ name: 'asc' }
			]
		}),
		prisma.staff.findMany({
			where: {
				roleAssignments: { some: { isActive: true } }
			},
			include: {
				roleAssignments: {
					where: { isActive: true },
					include: {
						role: true
					}
				}
			},
			take: 50
		})
	])

	// Decrypt staff names
	const decryptedStaff = staffWithRoles.map(s => {
		let name = 'Unknown'
		try {
			const firstName = revealName(s.firstName)
			const lastName = revealName(s.lastName)
			name = `${firstName} ${lastName}`
		} catch (e) {
			name = 'Staff (Decryption Error)'
		}
		return {
			id: s.id,
			name,
			email: s.email,
			primaryRole: s.primaryRole,
			roles: s.roleAssignments.map(ra => ra.role.name),
		}
	})

	const stats = {
		totalRoles: roles.length,
		totalPermissions: permissions.length,
		totalAssignments: staffWithRoles.length,
	}

	return {
		roles: roles.map(r => ({
			id: r.id,
			name: r.name,
			displayName: r.displayName,
			description: r.description,
			isSystem: r.isSystem,
			permissionCount: r.permissions.length,
			staffCount: r.staffRoles.length,
			permissions: r.permissions.map(p => p.permission.name),
		})),
		permissions: permissions.map(p => ({
			id: p.id,
			name: p.name,
			description: p.description,
			group: p.group,
		})),
		staff: decryptedStaff,
		stats
	}
}

export const actions: Actions = {
	assignRole: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to assign roles.' })
		}

		const formData = await request.formData()
		const staffId = String(formData.get('staffId') ?? '')
		const roleId = String(formData.get('roleId') ?? '')

		if (!staffId || !roleId) {
			return fail(400, { error: 'Staff ID and Role ID are required' })
		}

		const prisma = await getPrismaClient()

		try {
			// Check if assignment already exists
			const existing = await prisma.staffRoleAssignment.findUnique({
				where: {
					staffId_roleId: { staffId, roleId }
				}
			})

			if (existing) {
				if (existing.isActive) {
					return fail(400, { error: 'Staff member already has this role' })
				}
				// Reactivate
				await prisma.staffRoleAssignment.update({
					where: { id: existing.id },
					data: { isActive: true }
				})
			} else {
				await prisma.staffRoleAssignment.create({
					data: {
						staffId,
						roleId,
						assignedBy: user.id,
						isActive: true,
					}
				})
			}

			return { success: true, message: 'Role assigned successfully' }
		} catch (err) {
			console.error('[access-control] Failed to assign role:', err)
			return fail(500, { error: 'Failed to assign role' })
		}
	},

	removeRole: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to remove roles.' })
		}

		const formData = await request.formData()
		const assignmentId = String(formData.get('assignmentId') ?? '')

		if (!assignmentId) {
			return fail(400, { error: 'Assignment ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			await prisma.staffRoleAssignment.delete({
				where: { id: assignmentId }
			})
			return { success: true, message: 'Role removed successfully' }
		} catch (err) {
			console.error('[access-control] Failed to remove role:', err)
			return fail(500, { error: 'Failed to remove role' })
		}
	}
}