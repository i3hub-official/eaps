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

	const college = await prisma.college.create({
		data: {
			universityId: university.id,
			name: protectedName,
			shortName: protectedShortName,
			code: protectedCode || protectedShortName,
			email: protectedEmail,
			phone: protectedPhone,
		},
	})

	// Audit log
	await prisma.auditLog.create({
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
			},
		},
	})

	return json({ success: true, college })
}