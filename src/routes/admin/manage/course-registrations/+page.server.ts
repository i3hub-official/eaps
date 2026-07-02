// src/routes/admin/manage/course-registrations/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';
import { getActiveSemester } from '$lib/server/academic/semester.js';
import { resolveEligibleOfferings, resolveLowerLevelOfferings } from '$lib/server/academic/eligibility.js';
import type { EligibleOffering } from '$lib/server/academic/eligibility.js';
import { getRegPhase, regPhaseKey } from '$lib/server/academic/reg-phase.js';
import { unlockStudentRegistration } from '$lib/server/academic/registration-admin.js';

const DEFAULT_MAX_CARRY_OVER = 6;
const DEFAULT_MAX_BORROWED = 6;
const DEFAULT_MAX_CREDITS = 24;

// ─────────────────────────────────────────────────────────────────────────────
// Same active-semester resolution used by the student registration page.
// Both files need it independently (this one for the offering lookups AND
// for the unlock action's regKey), so it's duplicated rather than pulled into
// semester.ts — keeps this fix scoped to what was actually asked for.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveActiveSemesterRow() {
	const prisma = await getPrismaClient();
	const active = await getActiveSemester();
	const row = await prisma.academicSemester.findUnique({
		where: { session_semester: { session: active.session, semester: active.semester } },
		select: { id: true, session: true, semester: true, regOpen: true }
	});
	return { active, row };
}

function offeringToCourseShape(o: EligibleOffering) {
	return {
		id: o.offeringId,
		code: o.courseCode,
		title: o.courseTitle,
		creditUnits: o.creditUnits,
		level: o.courseLevel,
		department: { code: o.departmentCode }
	};
}

/** Best-effort offeringId resolution for the manual admin form, which lets an
 * admin free-type session/semester/course rather than picking from a curated
 * offering list. Returns null if no matching offering exists — registration
 * still proceeds without one (admin override), just without offering linkage. */
async function resolveOfferingId(
	courseId: string,
	session: string,
	semester: number,
	levelId: number | null
): Promise<string | null> {
	const prisma = await getPrismaClient();
	const semesterRow = await prisma.academicSemester.findUnique({
		where: { session_semester: { session, semester } },
		select: { id: true }
	});
	if (!semesterRow) return null;

	const offering = await prisma.courseOffering.findFirst({
		where: {
			courseId,
			academicSemesterId: semesterRow.id,
			...(levelId ? { levelId } : {})
		},
		select: { id: true }
	});
	return offering?.id ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals.user);
	const prisma = await getPrismaClient();

	const studentId = url.searchParams.get('studentId') ?? undefined;
	const { active, row: semesterRow } = await resolveActiveSemesterRow();
	const currentSession = active.session;
	const currentSemester = active.semester;

	const [registrations, students, courses, levels, colleges] = await Promise.all([
		prisma.courseRegistration.findMany({
			where: studentId ? { studentId } : undefined,
			include: {
				student: {
					select: {
						id: true,
						fullName: true,
						email: true,
						matricNumber: true,
						departmentId: true,
						collegeId: true,
						level: { select: { level: true, name: true } },
						department: { select: { id: true, name: true, code: true } }
					}
				},
				course: { include: { department: { select: { id: true, name: true, code: true, collegeId: true } } } },
				level: { select: { level: true, name: true } }
			},
			orderBy: { createdAt: 'desc' },
			take: studentId ? undefined : 200
		}),
		prisma.user.findMany({
			where: { role: 'student', isActive: true },
			select: {
				id: true,
				fullName: true,
				matricNumber: true,
				email: true,
				collegeId: true,
				departmentId: true,
				department: { select: { id: true, name: true, code: true } },
				level: { select: { id: true, level: true, name: true } },
				session: true
			},
			orderBy: { fullName: 'asc' }
		}),
		prisma.course.findMany({
			include: { department: { select: { id: true, name: true, code: true, collegeId: true } } },
			orderBy: { code: 'asc' }
		}),
		prisma.level.findMany({ orderBy: { level: 'asc' } }),
		prisma.college.findMany({ orderBy: { name: 'asc' } })
	]);

	let studentAvailableCourses: {
		normal: ReturnType<typeof offeringToCourseShape>[];
		carryOver: ReturnType<typeof offeringToCourseShape>[];
		borrowed: ReturnType<typeof offeringToCourseShape>[];
	} | null = null;
	let studentRegPhase: 'draft' | 'submitted' | 'locked' | null = null;

	if (studentId) {
		const student = students.find((s) => s.id === studentId);

		if (student) {
			const key = regPhaseKey(currentSession, currentSemester);
			studentRegPhase = await getRegPhase(studentId, key);
		}

		if (student && student.level && student.departmentId && semesterRow) {
			const [eligible, lowerLevel] = await Promise.all([
				resolveEligibleOfferings(studentId, semesterRow.id),
				student.level.level > 100
					? resolveLowerLevelOfferings(studentId, semesterRow.id)
					: Promise.resolve([] as EligibleOffering[])
			]);

			studentAvailableCourses = {
				normal: eligible
					.filter((o) => !o.isRegistered && (o.type === 'core' || o.type === 'gst'))
					.map(offeringToCourseShape),
				borrowed: eligible
					.filter((o) => !o.isRegistered && (o.type === 'borrowed' || o.type === 'elective'))
					.map(offeringToCourseShape),
				carryOver: lowerLevel.filter((o) => !o.isRegistered).map(offeringToCourseShape)
			};
		}
	}

	return {
		registrations,
		students,
		courses,
		levels,
		colleges,
		selectedStudentId: studentId ?? null,
		studentAvailableCourses,
		studentRegPhase,
		activeSemester: { session: currentSession, semester: currentSemester },
		limits: {
			maxCredits: DEFAULT_MAX_CREDITS,
			maxCarryOver: DEFAULT_MAX_CARRY_OVER,
			maxBorrowed: DEFAULT_MAX_BORROWED
		}
	};
};

export const actions: Actions = {
	// ── Manual create (top-level "Add Registration" modal, courseId-based) ──
	create: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const data = await request.formData();
		const prisma = await getPrismaClient();

		const studentId = data.get('studentId') as string;
		const courseId = data.get('courseId') as string;
		const session = data.get('session') as string;
		const semester = parseInt(data.get('semester') as string);
		const registrationType = (data.get('registrationType') as string) || 'normal';
		const levelId = data.get('levelId') ? parseInt(data.get('levelId') as string) : null;

		if (!studentId) return fail(400, { error: 'Student selection is required' });
		if (!courseId) return fail(400, { error: 'Course selection is required' });
		if (!session) return fail(400, { error: 'Session is required' });
		if (isNaN(semester)) return fail(400, { error: 'Semester is required' });

		const student = await prisma.user.findUnique({ where: { id: studentId }, select: { levelId: true } });
		if (!student) return fail(404, { error: 'Student not found' });

		let maxCarryOver = DEFAULT_MAX_CARRY_OVER;
		let maxBorrowed = DEFAULT_MAX_BORROWED;
		if (student.levelId) {
			try {
				const configRow = await prisma.levelSemesterConfig.findUnique({
					where: { levelId_semester: { levelId: student.levelId, semester } },
					select: { maxCarryOver: true, maxBorrowed: true }
				});
				if (configRow) {
					maxCarryOver = configRow.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
					maxBorrowed = configRow.maxBorrowed ?? DEFAULT_MAX_BORROWED;
				}
			} catch (err) {
				console.warn('Could not fetch config for validation, using defaults:', err);
			}
		}

		if (registrationType === 'carry_over' || registrationType === 'borrowed') {
			const currentRegs = await prisma.courseRegistration.findMany({
				where: { studentId, session, semester },
				select: { registrationType: true }
			});
			if (registrationType === 'carry_over') {
				const coCount = currentRegs.filter((r) => r.registrationType === 'carry_over').length;
				if (coCount >= maxCarryOver) {
					return fail(400, { error: `Carry-over limit (${maxCarryOver}) already reached for this student` });
				}
			}
			if (registrationType === 'borrowed') {
				const bCount = currentRegs.filter((r) => r.registrationType === 'borrowed').length;
				if (bCount >= maxBorrowed) {
					return fail(400, { error: `Borrowed course limit (${maxBorrowed}) already reached for this student` });
				}
			}
		}

		const offeringId = await resolveOfferingId(courseId, session, semester, levelId);

		try {
			await prisma.courseRegistration.create({
				data: {
					studentId,
					courseId,
					offeringId,
					session,
					semester,
					registrationType: registrationType as any,
					levelId: levelId ?? undefined
				}
			});
		} catch (err: any) {
			if (err.code === 'P2002') {
				return fail(400, { error: 'Student is already registered for this course in this session and semester' });
			}
			console.error(err);
			return fail(500, { error: 'Failed to create course registration' });
		}
		return { success: true, message: 'Course registration created successfully' };
	},

	// ── Drawer add (offering-based, exact match, no ambiguity) ─────────────
	createFromOffering: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const data = await request.formData();
		const prisma = await getPrismaClient();

		const studentId = data.get('studentId') as string;
		const offeringId = data.get('offeringId') as string;
		const registrationType = (data.get('registrationType') as string) || 'normal';

		if (!studentId) return fail(400, { error: 'Student selection is required' });
		if (!offeringId) return fail(400, { error: 'Offering selection is required' });

		const offering = await prisma.courseOffering.findUnique({
			where: { id: offeringId },
			include: { academicSemester: { select: { session: true, semester: true } } }
		});
		if (!offering) return fail(404, { error: 'Course offering not found' });

		const student = await prisma.user.findUnique({ where: { id: studentId }, select: { levelId: true } });
		if (!student) return fail(404, { error: 'Student not found' });

		let maxCarryOver = DEFAULT_MAX_CARRY_OVER;
		let maxBorrowed = DEFAULT_MAX_BORROWED;
		if (student.levelId) {
			try {
				const configRow = await prisma.levelSemesterConfig.findUnique({
					where: { levelId_semester: { levelId: student.levelId, semester: offering.academicSemester.semester } },
					select: { maxCarryOver: true, maxBorrowed: true }
				});
				if (configRow) {
					maxCarryOver = configRow.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
					maxBorrowed = configRow.maxBorrowed ?? DEFAULT_MAX_BORROWED;
				}
			} catch (err) {
				console.warn('Could not fetch config for validation, using defaults:', err);
			}
		}

		const currentRegs = await prisma.courseRegistration.findMany({
			where: { studentId, session: offering.academicSemester.session, semester: offering.academicSemester.semester },
			select: { registrationType: true }
		});
		if (registrationType === 'carry_over') {
			const coCount = currentRegs.filter((r) => r.registrationType === 'carry_over').length;
			if (coCount >= maxCarryOver) {
				return fail(400, { error: `Carry-over limit (${maxCarryOver}) already reached for this student` });
			}
		}
		if (registrationType === 'borrowed') {
			const bCount = currentRegs.filter((r) => r.registrationType === 'borrowed').length;
			if (bCount >= maxBorrowed) {
				return fail(400, { error: `Borrowed course limit (${maxBorrowed}) already reached for this student` });
			}
		}

		try {
			await prisma.courseRegistration.create({
				data: {
					studentId,
					courseId: offering.courseId,
					offeringId: offering.id,
					session: offering.academicSemester.session,
					semester: offering.academicSemester.semester,
					registrationType: registrationType as any,
					levelId: offering.levelId
				}
			});
		} catch (err: any) {
			if (err.code === 'P2002') {
				return fail(400, { error: 'Student is already registered for this course in this session and semester' });
			}
			console.error(err);
			return fail(500, { error: 'Failed to create course registration' });
		}
		return { success: true, message: 'Course registration created successfully' };
	},

	edit: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const data = await request.formData();
		const prisma = await getPrismaClient();

		const id = data.get('id') as string;
		const studentId = data.get('studentId') as string;
		const courseId = data.get('courseId') as string;
		const session = data.get('session') as string;
		const semester = parseInt(data.get('semester') as string);
		const registrationType = (data.get('registrationType') as string) || 'normal';
		const levelId = data.get('levelId') ? parseInt(data.get('levelId') as string) : null;

		if (!studentId) return fail(400, { error: 'Student selection is required' });
		if (!courseId) return fail(400, { error: 'Course selection is required' });
		if (!session) return fail(400, { error: 'Session is required' });
		if (isNaN(semester)) return fail(400, { error: 'Semester is required' });

		const student = await prisma.user.findUnique({ where: { id: studentId }, select: { levelId: true } });

		if (student?.levelId) {
			let maxCarryOver = DEFAULT_MAX_CARRY_OVER;
			let maxBorrowed = DEFAULT_MAX_BORROWED;
			try {
				const configRow = await prisma.levelSemesterConfig.findUnique({
					where: { levelId_semester: { levelId: student.levelId, semester } },
					select: { maxCarryOver: true, maxBorrowed: true }
				});
				if (configRow) {
					maxCarryOver = configRow.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
					maxBorrowed = configRow.maxBorrowed ?? DEFAULT_MAX_BORROWED;
				}
			} catch (err) {
				console.warn('Could not fetch config for validation, using defaults:', err);
			}

			if (registrationType === 'carry_over' || registrationType === 'borrowed') {
				const currentRegs = await prisma.courseRegistration.findMany({
					where: { studentId, session, semester, NOT: { id } },
					select: { registrationType: true }
				});
				if (registrationType === 'carry_over') {
					const coCount = currentRegs.filter((r) => r.registrationType === 'carry_over').length;
					if (coCount >= maxCarryOver) {
						return fail(400, { error: `Carry-over limit (${maxCarryOver}) already reached for this student` });
					}
				}
				if (registrationType === 'borrowed') {
					const bCount = currentRegs.filter((r) => r.registrationType === 'borrowed').length;
					if (bCount >= maxBorrowed) {
						return fail(400, { error: `Borrowed course limit (${maxBorrowed}) already reached for this student` });
					}
				}
			}
		}

		const offeringId = await resolveOfferingId(courseId, session, semester, levelId);

		try {
			await prisma.courseRegistration.update({
				where: { id },
				data: {
					studentId,
					courseId,
					offeringId,
					session,
					semester,
					registrationType: registrationType as any,
					levelId: levelId ?? undefined
				}
			});
		} catch (err: any) {
			if (err.code === 'P2002') {
				return fail(400, { error: 'Student is already registered for this course in this session and semester' });
			}
			console.error(err);
			return fail(500, { error: 'Failed to update course registration' });
		}
		return { success: true, message: 'Course registration updated successfully' };
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const data = await request.formData();
		const id = data.get('id') as string;
		const prisma = await getPrismaClient();

		try {
			await prisma.courseRegistration.delete({ where: { id } });
		} catch {
			return fail(500, { error: 'Failed to delete course registration' });
		}
		return { success: true, message: 'Course registration deleted successfully' };
	},

	// ── Unlock a student's registration for the current active semester ────
	unlock: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const data = await request.formData();

		const studentId = data.get('studentId') as string;
		const reason = (data.get('reason') as string) || undefined;
		const adminId = locals.user?.id;

		if (!studentId) return fail(400, { error: 'Student is required' });
		if (!adminId) return fail(401, { error: 'Admin session not found' });

		const { active } = await resolveActiveSemesterRow();

		const result = await unlockStudentRegistration({
			studentId,
			session: active.session,
			semester: active.semester,
			unlockedById: adminId,
			reason
		});

		return {
			success: true,
			message: `Registration reopened (was ${result.previousPhase}, now ${result.newPhase}).`
		};
	}
};