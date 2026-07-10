// src/routes/(lecturer)/lecturer/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user);
	const prisma = await getPrismaClient();

	// Get courses taught by this lecturer
	const courses = await prisma.course.findMany({
		where: {
			offerings: {
				some: {
					lecturerId: user.id,
				},
			},
		},
		include: {
			offerings: {
				include: {
					semester: true,
				},
			},
			registrations: {
				where: { status: 'APPROVED' },
			},
			assessments: true,
		},
	});

	// Get upcoming assessments
	const upcomingAssessments = await prisma.assessment.findMany({
		where: {
			createdById: user.id,
			status: { in: ['SCHEDULED', 'ACTIVE'] },
			startTime: { gt: new Date() },
		},
		orderBy: { startTime: 'asc' },
		take: 5,
	});

	// Calculate stats
	const totalStudents = courses.reduce((acc, c) => acc + c.registrations.length, 0);
	const pendingAssessments = courses.reduce((acc, c) => acc + c.assessments.filter(a => a.status === 'DRAFT' || a.status === 'PUBLISHED').length, 0);
	const upcomingExams = upcomingAssessments.filter(a => a.type === 'EXAMINATION').length;

	// Course progress data
	const courseProgress = courses.map(c => ({
		id: c.id,
		name: c.title,
		code: c.code,
		enrolled: c.registrations.length,
		progress: Math.min(100, Math.floor((c.assessments.filter(a => a.status === 'ENDED').length / Math.max(c.assessments.length, 1)) * 100)),
	}));

	return {
		user,
		courses: courses.map(c => ({
			id: c.id,
			code: c.code,
			title: c.title,
			studentCount: c.registrations.length,
			status: c.status === 'ACTIVE' ? 'Active' : 'Inactive',
		})),
		courseProgress,
		stats: {
			totalCourses: courses.length,
			totalStudents,
			pendingAssessments,
			upcomingExams,
		},
	};
};