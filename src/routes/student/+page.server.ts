// src/routes/student/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { 
	STUDENT_COOKIE, 
	getStudentByToken,
	cookieOptions 
} from '$lib/server/auth';
import { redirect, fail } from '@sveltejs/kit';
import {
	revealName,
	revealEmail,
	revealMatricNumber,
} from '$lib/security/dataProtection';

// ─── Helper: Safely decrypt data ────────────────────────────────────────────
function safeDecrypt<T>(decryptFn: () => T, fallback: T): T {
	try {
		return decryptFn();
	} catch {
		return fallback;
	}
}

// ─── Load ─────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ cookies }) => {
	// Get student session from cookie
	const token = cookies.get(STUDENT_COOKIE);
	if (!token) {
		throw redirect(303, '/login');
	}

	// Verify student session using getStudentByToken
	const result = await getStudentByToken(token);
	if (!result) {
		cookies.delete(STUDENT_COOKIE, cookieOptions);
		throw redirect(303, '/login');
	}

	const { student } = result;
	const prisma = await getPrismaClient();

	// ─── Fetch Dashboard Data ──────────────────────────────────────────────

	// Get assessments (recent and upcoming)
	const [recentAssessments, upcomingAssessments, courseRegistrations, notifications] = await Promise.all([
		// Recent assessments (last 30 days)
		prisma.assessmentSession.findMany({
			where: {
				studentId: student.id,
				createdAt: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
				},
			},
			include: {
				assessment: {
					include: {
						course: true,
					},
				},
				result: true,
			},
			orderBy: { createdAt: 'desc' },
			take: 10,
		}),

		// Upcoming assessments
		prisma.assessment.findMany({
			where: {
				startTime: {
					gte: new Date(),
				},
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
			include: {
				course: true,
			},
			orderBy: { startTime: 'asc' },
			take: 5,
		}),

		// Course registrations
		prisma.courseRegistration.findMany({
			where: {
				studentId: student.id,
				status: 'APPROVED',
			},
			include: {
				course: {
					include: {
						level: true,
						department: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		}),

		// Notifications
		prisma.notification.findMany({
			where: {
				studentId: student.id,
			},
			orderBy: { createdAt: 'desc' },
			take: 10,
		}),
	]);

	// ─── Calculate Dashboard Metrics ──────────────────────────────────────

	const totalCredits = courseRegistrations.reduce(
		(sum, reg) => sum + (reg.course?.creditUnits || 0),
		0
	);

	// ─── Get Full Student with Relations ──────────────────────────────────
	const fullStudent = await prisma.student.findUnique({
		where: { id: student.id },
		include: {
			department: true,
			programme: true,
			currentLevel: true,
		},
	});

	if (!fullStudent) {
		cookies.delete(STUDENT_COOKIE, cookieOptions);
		throw redirect(303, '/login');
	}

	// ─── Only decrypt what's needed for the dashboard ─────────────────────
	const decryptedStudent = {
		id: fullStudent.id,
		// Only decrypt fields shown in the UI
		firstName: safeDecrypt(() => revealName(fullStudent.firstName), fullStudent.firstName),
		lastName: safeDecrypt(() => revealName(fullStudent.lastName), fullStudent.lastName),
		email: safeDecrypt(() => revealEmail(fullStudent.email), fullStudent.email),
		matricNumber: safeDecrypt(() => revealMatricNumber(fullStudent.matricNumber), fullStudent.matricNumber),
		// These don't need decryption - they're not encrypted in the schema
		status: fullStudent.status,
		entryYear: fullStudent.entryYear,
		createdAt: fullStudent.createdAt,
		// Relations (not encrypted)
		department: fullStudent.department,
		programme: fullStudent.programme,
		currentLevel: fullStudent.currentLevel,
	};

	return {
		student: decryptedStudent,
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
	markNotificationRead: async ({ request, cookies }) => {
		const form = await request.formData();
		const notificationId = form.get('notificationId')?.toString();

		if (!notificationId) {
			return fail(400, { error: 'Notification ID required' });
		}

		const token = cookies.get(STUDENT_COOKIE);
		if (!token) {
			return fail(401, { error: 'Unauthorized' });
		}

		const result = await getStudentByToken(token);
		if (!result) {
			return fail(401, { error: 'Unauthorized' });
		}

		const prisma = await getPrismaClient();
		await prisma.notification.update({
			where: {
				id: notificationId,
				studentId: result.student.id,
			},
			data: {
				isRead: true,
				readAt: new Date(),
			},
		});

		return { success: true };
	},

	// ─── Mark All Notifications as Read ──────────────────────────────────
	markAllNotificationsRead: async ({ cookies }) => {
		const token = cookies.get(STUDENT_COOKIE);
		if (!token) {
			return fail(401, { error: 'Unauthorized' });
		}

		const result = await getStudentByToken(token);
		if (!result) {
			return fail(401, { error: 'Unauthorized' });
		}

		const prisma = await getPrismaClient();
		await prisma.notification.updateMany({
			where: {
				studentId: result.student.id,
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