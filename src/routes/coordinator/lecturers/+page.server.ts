// src/routes/coordinator/lecturers/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireDeptManagement } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireDeptManagement(locals.user);
	
	if (!user.departmentId) {
		throw new Error('Department Coordinator must be associated with a department');
	}
	
	const prisma = await getPrismaClient();
	const departmentId = user.departmentId;

	// Get ALL lecturers in the department with their courses and teaching assignments
	const lecturers = await prisma.user.findMany({
		where: {
			role: 'lecturer',
			departmentId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			staffId: true,
			phone: true,
			// Course assignments (which courses they are assigned to teach)
			lecturerCourses: {
				include: {
					course: {
						select: {
							id: true,
							code: true,
							title: true,
							creditUnits: true,
							level: true
						}
					}
				}
			},
			// Teaching assignments (which offerings they are assigned to)
			teachingAssignments: {
				include: {
					offering: {
						select: {
							id: true,
							course: {
								select: {
									code: true,
									title: true
								}
							},
							academicSemester: {
								select: {
									label: true,
									session: true
								}
							}
						}
					}
				}
			}
		},
		orderBy: { fullName: 'asc' }
	});

	// Get all courses for the assignment modal
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
			level: true
		},
		orderBy: [{ level: 'asc' }, { code: 'asc' }]
	});

	// Calculate stats
	const stats = {
		total: lecturers.length,
		withCourses: lecturers.filter(l => l.lecturerCourses && l.lecturerCourses.length > 0).length,
		withoutCourses: lecturers.filter(l => !l.lecturerCourses || l.lecturerCourses.length === 0).length,
		totalAssignments: lecturers.reduce((sum, l) => sum + (l.lecturerCourses?.length || 0), 0)
	};

	console.log('Lecturers found:', lecturers.length);
	console.log('Stats:', stats);

	return {
		lecturers,
		courses,
		stats,
		departmentId
	};
};

export const actions: Actions = {
	assignCourse: async ({ request, locals }) => {
		const user = requireDeptManagement(locals.user);
		if (!user.departmentId) {
			return fail(400, { error: 'Department Coordinator must be associated with a department' });
		}

		const form = await request.formData();
		const lecturerId = form.get('lecturerId') as string;
		const courseId = form.get('courseId') as string;

		if (!lecturerId || !courseId) {
			return fail(400, { error: 'Lecturer and course are required' });
		}

		const prisma = await getPrismaClient();

		try {
			// Check if assignment already exists
			const existing = await prisma.lecturerCourse.findUnique({
				where: {
					lecturerId_courseId: {
						lecturerId,
						courseId
					}
				}
			});

			if (existing) {
				return fail(400, { error: 'This course is already assigned to this lecturer' });
			}

			await prisma.lecturerCourse.create({
				data: {
					lecturerId,
					courseId,
					departmentId: user.departmentId,
					assignedById: user.id
				}
			});

			return { success: true, message: 'Course assigned to lecturer successfully' };
		} catch (err) {
			console.error('Assign course error:', err);
			return fail(400, { error: (err as Error).message });
		}
	},

	removeCourse: async ({ request, locals }) => {
		const user = requireDeptManagement(locals.user);
		if (!user.departmentId) {
			return fail(400, { error: 'Department Coordinator must be associated with a department' });
		}

		const form = await request.formData();
		const lecturerId = form.get('lecturerId') as string;
		const courseId = form.get('courseId') as string;

		if (!lecturerId || !courseId) {
			return fail(400, { error: 'Lecturer and course are required' });
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

			return { success: true, message: 'Course removed from lecturer successfully' };
		} catch (err) {
			console.error('Remove course error:', err);
			return fail(400, { error: (err as Error).message });
		}
	}
};