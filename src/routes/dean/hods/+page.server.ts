import type { PageServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireDean(locals.user);
	const prisma = await getPrismaClient();
	const collegeId = locals.user!.collegeId!;

	// HODs are users with role='hod' scoped to this dean's college.
	// departmentId on the User itself tells us which department they head;
	// DepartmentExamCoordinator (a separate, optional exam-coordination role)
	// is fetched too so the page can show if an HOD is also the exam coordinator.
	const hods = await prisma.user.findMany({
		where: {
			role: 'hod',
			collegeId
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			phone: true,
			staffId: true,
			photoUrl: true,
			isActive: true,
			isSuspended: true,
			createdAt: true,
			department: {
				select: {
					id: true,
					name: true,
					code: true,
					examCoordinator: {
						select: {
							userId: true
						}
					}
				}
			}
		},
		orderBy: { fullName: 'asc' }
	});

	// Departments in this college with no HOD assigned yet — useful for the dean
	// to see gaps at a glance.
	const departments = await prisma.department.findMany({
		where: { collegeId },
		select: { id: true, name: true, code: true },
		orderBy: { name: 'asc' }
	});

	const departmentIdsWithHod = new Set(hods.map((h) => h.department?.id).filter(Boolean));
	const departmentsWithoutHod = departments.filter((d) => !departmentIdsWithHod.has(d.id));

	return {
		hods,
		departmentsWithoutHod
	};
};