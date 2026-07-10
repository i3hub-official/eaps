// src/routes/api/onboarding/course/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { protectText } from '$lib/security/dataProtection.js'

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireLecturer(locals.user)

	// Check permission
	if (!['SUPER_ADMIN', 'REGISTRAR', 'HOD', 'DEPARTMENT_COORDINATOR', 'LECTURER'].includes(user.primaryRole)) {
		throw error(403, 'You do not have permission to create courses')
	}

	const body = await request.json()
	const { code, title, creditUnits, levelId, departmentId, type, description } = body

	if (!code || !title || !departmentId || !levelId) {
		throw error(400, 'Code, title, department, and level are required')
	}

	const prisma = await getPrismaClient()

	// Check if course already exists
	const existing = await prisma.course.findUnique({
		where: { code },
	})

	if (existing) {
		throw error(409, 'A course with this code already exists')
	}

	const [protectedCode, protectedTitle, protectedDescription] = await Promise.all([
		protectText(code),
		protectText(title),
		description ? protectText(description) : null,
	])

	const course = await prisma.course.create({
		data: {
			code: protectedCode,
			title: protectedTitle,
			creditUnits: creditUnits || 2,
			levelId,
			departmentId,
			type: type || 'COMPULSORY',
			description: protectedDescription,
			status: 'ACTIVE',
		},
	})

	// Audit log
	await prisma.auditLog.create({
		data: {
			actorType: 'staff',
			staffId: user.id,
			action: 'COURSE_CREATED',
			entity: 'Course',
			entityId: course.id,
			afterData: {
				code,
				title,
				creditUnits: creditUnits || 2,
				levelId,
				departmentId,
				type: type || 'COMPULSORY',
			},
		},
	})

	return json({ success: true, course })
}