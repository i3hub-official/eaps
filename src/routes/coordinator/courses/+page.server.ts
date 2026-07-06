// src/routes/coordinator/courses/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireDepartmentCoordinatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
	if (user.role !== 'department_coordinator') {
		throw new Error('Access denied. Department Coordinator access required.');
	}
	
	if (!user.departmentId) {
		throw new Error('Department Coordinator must be associated with a department');
	}
	
	const prisma = await getPrismaClient();
	const departmentId = user.departmentId;

	// Get all courses in the department
	const courses = await prisma.course.findMany({
		where: {
			departmentId,
			isActive: true,
			isDiscontinued: false
		},
		select: {
			id: true,
			code: true,
			title: true,
			creditUnits: true,
			level: true,
			semester: true,
			isGeneral: true,
			offerings: {
				where: { status: 'open' },
				select: {
					id: true,
					status: true,
					capacity: true,
					academicSemester: { select: { label: true, session: true } }
				}
			},
			lecturerAssignments: {
				select: {
					lecturer: {
						select: {
							id: true,
							fullName: true,
							email: true
						}
					}
				}
			},
			curriculums: {
				where: { departmentId },
				select: {
					type: true,
					level: { select: { level: true } }
				}
			}
		},
		orderBy: [{ level: 'asc' }, { semester: 'asc' }, { code: 'asc' }]
	});

	// Get all lecturers in the department for assignment modal
	const lecturers = await prisma.user.findMany({
		where: {
			role: 'lecturer',
			departmentId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true
		}
	});

	// Get active semester
	const activeSemester = await prisma.academicSemester.findFirst({
		where: { isActive: true },
		select: { id: true, session: true, semester: true }
	});

	// Get levels
	const levels = await prisma.level.findMany({
		orderBy: { level: 'asc' },
		select: { id: true, level: true, name: true }
	});

	return {
		courses,
		lecturers,
		activeSemester,
		levels,
		departmentId
	};
};

export const actions: Actions = {
	assignLecturer: async ({ request, locals }) => {
		const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
		if (user.role !== 'department_coordinator') {
			return fail(403, { error: 'Access denied. Department Coordinator access required.' });
		}

		const form = await request.formData();
		const courseId = form.get('courseId') as string;
		const lecturerId = form.get('lecturerId') as string;

		if (!courseId || !lecturerId) {
			return fail(400, { error: 'Course and lecturer are required' });
		}

		const prisma = await getPrismaClient();

		try {
			await prisma.lecturerCourse.upsert({
				where: {
					lecturerId_courseId: {
						lecturerId,
						courseId
					}
				},
				create: {
					lecturerId,
					courseId,
					departmentId: user.departmentId!,
					assignedById: user.id
				},
				update: {
					assignedAt: new Date(),
					assignedById: user.id
				}
			});

			return { success: true, message: 'Lecturer assigned to course successfully' };
		} catch (err) {
			return fail(400, { error: (err as Error).message });
		}
	},

	removeLecturer: async ({ request, locals }) => {
		const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
		if (user.role !== 'department_coordinator') {
			return fail(403, { error: 'Access denied. Department Coordinator access required.' });
		}

		const form = await request.formData();
		const courseId = form.get('courseId') as string;
		const lecturerId = form.get('lecturerId') as string;

		if (!courseId || !lecturerId) {
			return fail(400, { error: 'Course and lecturer are required' });
		}

		const prisma = await getPrismaClient();

		try {
			await prisma.lecturerCourse.delete({
				where: {
					lecturerId_courseId: {
						lecturerId,
						courseId
					}
				}
			});

			return { success: true, message: 'Lecturer removed from course successfully' };
		} catch (err) {
			return fail(400, { error: (err as Error).message });
		}
	}
};