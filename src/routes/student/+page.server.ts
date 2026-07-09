// src/routes/student/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards'
import { fail } from '@sveltejs/kit';

// ─── Load ─────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals }) => {
	const student = await requireStudent(locals.user)
	const prisma = await getPrismaClient();

	// ─── Fetch Dashboard Data ──────────────────────────────────────────────

	const [recentAssessments, upcomingAssessments, courseRegistrations, notifications, fullStudent] = await Promise.all([
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
		// (entryYear, createdAt, full relation objects)
		prisma.student.findUnique({
			where: { id: student.id },
			include: { department: true, programme: true, currentLevel: true },
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
	const studentView = {
		id: student.id,
		firstName: student.firstName,
		lastName: student.lastName,
		email: student.email,
		matricNumber: student.matricNumber,
		status: fullStudent?.status ?? student.status,
		entryYear: fullStudent?.entryYear ?? null,
		createdAt: fullStudent?.createdAt ?? null,
		department: fullStudent?.department ?? null,
		programme: fullStudent?.programme ?? null,
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
				percentage: a.result.percentage,
				marksObtained: a.result.marksObtained,
				totalMarks: a.result.totalMarks,
			} : null,
		})),
		upcomingAssessments: upcomingAssessments.map(a => ({
			id: a.id,
			title: a.title,
			type: a.type,
			startTime: a.startTime,
			status: a.status,
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