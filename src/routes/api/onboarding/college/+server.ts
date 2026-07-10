// src/routes/api/onboarding/college/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { protectText } from '$lib/security/dataProtection.js'

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireLecturer(locals.user)

	// Check permission
	if (!['SUPER_ADMIN', 'REGISTRAR', 'VC', 'DVC'].includes(user.primaryRole)) {
		throw error(403, 'You do not have permission to create colleges')
	}

	const body = await request.json()
	const { name, shortName, code, email, phone } = body

	if (!name || !shortName) {
		throw error(400, 'Name and short name are required')
	}

	const prisma = await getPrismaClient()

	// Check if college already exists
	const existing = await prisma.college.findFirst({
		where: {
			OR: [
				{ name: protectText(name) },
				{ shortName: protectText(shortName) },
			],
		},
	})

	if (existing) {
		throw error(409, 'A college with this name or short name already exists')
	}

	const [protectedName, protectedShortName, protectedCode, protectedEmail, protectedPhone] = await Promise.all([
		protectText(name),
		protectText(shortName),
		code ? protectText(code) : protectText(shortName.toUpperCase()),
		email ? protectText(email) : null,
		phone ? protectText(phone) : null,
	])

	// Get or create university (MOUAU)
	const university = await prisma.university.findUnique({
		where: { shortName: 'MOUAU' },
	})

	if (!university) {
		throw error(500, 'University not found. Please seed the database first.')
	}

	// Create college AND assign the lecturer to it in one transaction
	const { college } = await prisma.$transaction(async (tx) => {
		const college = await tx.college.create({
			data: {
				universityId: university.id,
				name: protectedName,
				shortName: protectedShortName,
				code: protectedCode || protectedShortName,
				email: protectedEmail,
				phone: protectedPhone,
			},
		})

		// Update the lecturer's Staff record to point to this college
		await tx.staff.update({
			where: { id: user.id },
			data: { collegeId: college.id },
		})

		// Audit log for college creation
		await tx.auditLog.create({
			data: {
				actorType: 'staff',
				staffId: user.id,
				action: 'COLLEGE_CREATED',
				entity: 'College',
				entityId: college.id,
				afterData: {
					name,
					shortName,
					code: code || shortName.toUpperCase(),
					assignedTo: user.id,
				},
			},
		})

		// Audit log for staff assignment
		await tx.auditLog.create({
			data: {
				actorType: 'staff',
				staffId: user.id,
				action: 'STAFF_COLLEGE_ASSIGNED',
				entity: 'Staff',
				entityId: user.id,
				afterData: {
					staffId: user.id,
					collegeId: college.id,
					collegeName: name,
				},
			},
		})

		return { college }
	})

	return json({ success: true, college })
}