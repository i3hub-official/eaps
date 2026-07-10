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

	// A CourseOffering needs a semester to attach to.
	const semester =
		(await prisma.semester.findFirst({ where: { isCurrent: true } })) ??
		(await prisma.semester.findFirst({ orderBy: { startDate: 'desc' } }))

	if (!semester) {
		throw error(500, 'No academic semester is set up yet. Ask an admin to create one before adding courses.')
	}

	const [protectedCode, protectedTitle, protectedDescription] = await Promise.all([
		protectText(code),
		protectText(title),
		description ? protectText(description) : null,
	])

	// Create the course, offering, and ensure lecturer's department is set
	const { course, offering } = await prisma.$transaction(async (tx) => {
		// If the lecturer doesn't have a department set, update it
		if (!user.departmentId) {
			await tx.staff.update({
				where: { id: user.id },
				data: { departmentId },
			})
		}

		const course = await tx.course.create({
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

		const offering = await tx.courseOffering.create({
			data: {
				courseId: course.id,
				semesterId: semester.id,
				lecturerId: user.id,
			},
		})

		await tx.auditLog.create({
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

		await tx.auditLog.create({
			data: {
				actorType: 'staff',
				staffId: user.id,
				action: 'COURSE_OFFERING_CREATED',
				entity: 'CourseOffering',
				entityId: offering.id,
				afterData: {
					courseId: course.id,
					semesterId: semester.id,
					lecturerId: user.id,
				},
			},
		})

		return { course, offering }
	})

	return json({ success: true, course, offering })
}