import type { PageServerLoad } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const student = await requireStudent(locals.user)
	const prisma = await getPrismaClient()

	const faceDescriptor = await prisma.faceDescriptor.findUnique({
		where: { studentId: student.id },
	})

	// Real assessments this student can actually take, so the test page
	// exercises the genuine verify-session lookup (assessmentId + studentId)
	// instead of a fabricated id that never matches anything.
	const registeredCourseIds = (
		await prisma.courseRegistration.findMany({
			where: { studentId: student.id, status: 'APPROVED' },
			select: { courseId: true },
		})
	).map((r) => r.courseId)

	const assessments =
		registeredCourseIds.length > 0
			? await prisma.assessment.findMany({
					where: {
						type: { in: ['TEST', 'EXAMINATION'] },
						courseId: { in: registeredCourseIds },
						status: { in: ['PUBLISHED', 'ACTIVE'] },
					},
					include: { course: true },
					orderBy: { createdAt: 'desc' },
				})
			: []

	// Existing PENDING/IN_PROGRESS/PAUSED sessions, if the student already
	// started one — lets the test page resume the real flow rather than
	// only ever starting fresh.
	const activeSessions = await prisma.assessmentSession.findMany({
		where: { studentId: student.id, status: { in: ['PENDING', 'IN_PROGRESS', 'PAUSED'] } },
		select: { id: true, assessmentId: true, status: true },
	})

	return {
		student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
		faceEnrolled: Boolean(faceDescriptor),
		assessments: assessments.map((a) => ({
			id: a.id,
			title: a.title,
			type: a.type,
			course: `${a.course.code} — ${a.course.title}`,
		})),
		activeSessions,
	}
}