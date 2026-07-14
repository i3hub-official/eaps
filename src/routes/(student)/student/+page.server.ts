// src/routes/student/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards'
import { fail } from '@sveltejs/kit';
import { revealText } from '$lib/security/dataProtection.js';

// ─── Load ─────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals }) => {
	const student = await requireStudent(locals.user)
	const prisma = await getPrismaClient();

	// ─── Fetch Dashboard Data ──────────────────────────────────────────────

	const [recentAssessments, upcomingAssessments, courseRegistrations, notifications, fullStudent, faceDescriptor] = await Promise.all([
		// Recent assessments (last 30 days)
		prisma.assessmentSession.findMany({
			where: {
				studentId: student.id,
				createdAt: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
				},
			},
			include: {
				assessment: { include: { course: true } },
				result: true,
			},
			orderBy: { createdAt: 'desc' },
			take: 10,
		}),

		// Upcoming assessments
		prisma.assessment.findMany({
			where: {
				startTime: { gte: new Date() },
				status: 'PUBLISHED',
				eligibility: {
					some: {
						OR: [
							{ departmentId: student.departmentId },
							{ levelId: student.currentLevelId },
							{ studentId: student.id },
						],
					},
				},
			},
			include: { course: true },
			orderBy: { startTime: 'asc' },
			take: 5,
		}),

		// Course registrations
		prisma.courseRegistration.findMany({
			where: { studentId: student.id, status: 'APPROVED' },
			include: { course: { include: { level: true, department: true } } },
			orderBy: { createdAt: 'desc' },
		}),

		// Notifications
		prisma.notification.findMany({
			where: { studentId: student.id },
			orderBy: { createdAt: 'desc' },
			take: 10,
		}),

		// Extra fields not on the session-derived `student` object
		// (entryYear, createdAt, faceEnrolledAt, full relation objects)
		prisma.student.findUnique({
			where: { id: student.id },
			include: { department: true, programme: true, currentLevel: true },
		}),

		// The actual source of truth for "is this student enrolled" — 
		// faceEnrolledAt is just a timestamp set once at enrollment time and
		// never cleared if the descriptor row is later deleted (e.g. an
		// admin removing a fraudulent duplicate enrollment). A dangling
		// faceEnrolledAt with no matching FaceDescriptor would otherwise
		// make the dashboard claim the student is enrolled when they
		// actually have no descriptor on file to verify against.
		prisma.faceDescriptor.findUnique({
			where: { studentId: student.id },
			select: { id: true },
		}),
	]);

	// ─── Calculate Dashboard Metrics ──────────────────────────────────────

	const totalCredits = courseRegistrations.reduce(
		(sum, reg) => sum + (reg.course?.creditUnits || 0),
		0
	);

	// `student` from requireStudent already has decrypted firstName/lastName/
	// email/matricNumber (decrypted once in hooks.server.ts) — no need to
	// re-decrypt. `fullStudent` just supplies the extra fields/relations
	// that aren't part of the session-derived user shape.
	
	// Decrypt programme data if it exists
	let decryptedProgramme = null;
	if (fullStudent?.programme) {
		try {
			decryptedProgramme = {
				...fullStudent.programme,
				name: fullStudent.programme.name ? revealText(fullStudent.programme.name) : fullStudent.programme.name,
				shortName: fullStudent.programme.shortName ? revealText(fullStudent.programme.shortName) : fullStudent.programme.shortName,
			};
		} catch (e) {
			console.warn('Failed to decrypt programme data:', e);
			decryptedProgramme = fullStudent.programme;
		}
	}

	const studentView = {
		id: student.id,
		firstName: student.firstName,
		otherNames: student.otherNames,
		lastName: student.lastName, 	 	
		email: student.email,
		matricNumber: student.matricNumber,
		status: fullStudent?.status ?? student.status,
		entryYear: fullStudent?.entryYear ?? null,
		createdAt: fullStudent?.createdAt ?? null,
		faceEnrolledAt: fullStudent?.faceEnrolledAt ?? null,
		// Actual enrollment state — a FaceDescriptor row must exist, not
		// just a non-null faceEnrolledAt timestamp.
		faceEnrolled: !!faceDescriptor,
		department: fullStudent?.department ?? null,
		programme: decryptedProgramme,
		currentLevel: fullStudent?.currentLevel ?? null,
	};

	return {
		student: studentView,
		dashboard: {
			totalAssessments: recentAssessments.length,
			totalCreditUnits: totalCredits,
		},
		recentAssessments: recentAssessments.map(a => ({
			id: a.id,
			status: a.status,
			title: a.assessment?.title || 'Untitled Assessment',
			type: a.assessment?.type || 'UNKNOWN',
			createdAt: a.createdAt,
			startedAt: a.startedAt,
			result: a.result ? {
				grade: a.result.grade,
				percentage: Number(a.result.percentage),
				marksObtained: Number(a.result.marksObtained),
				totalMarks: Number(a.result.totalMarks),
			} : null,
		})),
		upcomingAssessments: upcomingAssessments.map(a => ({
			id: a.id,
			title: a.title,
			type: a.type,
			startTime: a.startTime,
			status: a.status,
			requireFaceVerify: a.requireFaceVerify,
			course: a.course ? {
				code: a.course.code,
				title: a.course.title,
			} : null,
		})),
		courseRegistrations: courseRegistrations.map(reg => ({
			id: reg.id,
			status: reg.status,
			course: reg.course ? {
				code: reg.course.code,
				title: reg.course.title,
				creditUnits: reg.course.creditUnits,
			} : null,
		})),
		notifications: notifications.map(n => ({
			id: n.id,
			title: n.title,
			body: n.body,
			isRead: n.isRead,
			createdAt: n.createdAt,
			type: n.type,
		})),
		loading: false,
		error: null,
	};
};

// ─── Actions ──────────────────────────────────────────────────────────────────
export const actions: Actions = {
	// ─── Mark Notification as Read ─────────────────────────────────────────
	markNotificationRead: async ({ request, locals }) => {
		const student = await requireStudent(locals.user)

		const form = await request.formData();
		const notificationId = form.get('notificationId')?.toString();

		if (!notificationId) {
			return fail(400, { error: 'Notification ID required' });
		}

		const prisma = await getPrismaClient();
		await prisma.notification.update({
			where: {
				id: notificationId,
				studentId: student.id,
			},
			data: {
				isRead: true,
				readAt: new Date(),
			},
		});

		return { success: true };
	},

	// ─── Mark All Notifications as Read ──────────────────────────────────
	markAllNotificationsRead: async ({ locals }) => {
		const student = await requireStudent(locals.user)

		const prisma = await getPrismaClient();
		await prisma.notification.updateMany({
			where: {
				studentId: student.id,
				isRead: false,
			},
			data: {
				isRead: true,
				readAt: new Date(),
			},
		});

		return { success: true };
	},
};