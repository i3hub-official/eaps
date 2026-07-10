// src/routes/api/onboarding/department/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { protectText } from '$lib/security/dataProtection.js'

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireLecturer(locals.user)

	// Check permission
	if (!['SUPER_ADMIN', 'REGISTRAR', 'DEAN', 'HOD'].includes(user.primaryRole)) {
		throw error(403, 'You do not have permission to create departments')
	}

	const body = await request.json()
	const { name, shortName, code, collegeId, email, phone } = body

	if (!name || !shortName || !collegeId) {
		throw error(400, 'Name, short name, and college are required')
	}

	const prisma = await getPrismaClient()

	// Check if department already exists
	const existing = await prisma.department.findFirst({
		where: {
			collegeId,
			OR: [
				{ name: protectText(name) },
				{ shortName: protectText(shortName) },
			],
		},
	})

	if (existing) {
		throw error(409, 'A department with this name or short name already exists in this college')
	}

	const [protectedName, protectedShortName, protectedCode, protectedEmail, protectedPhone] = await Promise.all([
		protectText(name),
		protectText(shortName),
		code ? protectText(code) : protectText(shortName.toUpperCase()),
		email ? protectText(email) : null,
		phone ? protectText(phone) : null,
	])

	// Create department AND assign the lecturer to it in one transaction
	const { department } = await prisma.$transaction(async (tx) => {
		const department = await tx.department.create({
			data: {
				collegeId,
				name: protectedName,
				shortName: protectedShortName,
				code: protectedCode || protectedShortName,
				email: protectedEmail,
				phone: protectedPhone,
			},
		})

		// Update the lecturer's Staff record to point to this department
		await tx.staff.update({
			where: { id: user.id },
			data: { departmentId: department.id },
		})

		// Audit log for department creation
		await tx.auditLog.create({
			data: {
				actorType: 'staff',
				staffId: user.id,
				action: 'DEPARTMENT_CREATED',
				entity: 'Department',
				entityId: department.id,
				afterData: {
					name,
					shortName,
					code: code || shortName.toUpperCase(),
					collegeId,
				},
			},
		})

		// Audit log for staff assignment
		await tx.auditLog.create({
			data: {
				actorType: 'staff',
				staffId: user.id,
				action: 'STAFF_DEPARTMENT_ASSIGNED',
				entity: 'Staff',
				entityId: user.id,
				afterData: {
					staffId: user.id,
					departmentId: department.id,
					departmentName: name,
				},
			},
		})

		return { department }
	})

	return json({ success: true, department })
}