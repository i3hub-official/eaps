// src/routes/(lecturer)/lecturer/courses/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user);
	const prisma = await getPrismaClient();

	const courses = await prisma.course.findMany({
		where: {
			offerings: {
				some: { lecturerId: user.id },
			},
		},
		include: {
			department: true,
			level: true,
			offerings: {
				where: { lecturerId: user.id },
				include: { semester: { include: { session: true } } },
				orderBy: { createdAt: 'desc' },
			},
			registrations: {
				where: { status: 'APPROVED' },
			},
			assessments: {
				where: { createdById: user.id },
			},
		},
		orderBy: { code: 'asc' },
	});

	return {
		user,
		courses: courses.map((c) => {
			const currentOffering = c.offerings.find((o) => o.semester.isCurrent) ?? c.offerings[0];

			return {
				id: c.id,
				code: c.code,
				title: c.title,
				creditUnits: c.creditUnits,
				type: c.type,
				status: c.status,
				department: c.department.shortName,
				level: c.level.name,
				studentCount: c.registrations.length,
				assessmentCount: c.assessments.length,
				semesterLabel: currentOffering
					? `${currentOffering.semester.session.name} · ${currentOffering.semester.type}`
					: 'Not offered this session',
			};
		}),
	};
};