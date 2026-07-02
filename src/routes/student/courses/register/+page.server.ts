// src/routes/(student)/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';
import { getActiveSemester } from '$lib/server/academic/semester.js';
import { resolveEligibleOfferings, resolveLowerLevelOfferings } from '$lib/server/academic/eligibility.js';
import type { EligibleOffering } from '$lib/server/academic/eligibility.js';
import { getRegPhase, setRegPhase } from '$lib/server/academic/reg-phase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Registration state machine
//
//   draft → submitted → locked
//
// State stored in UserPreference.prefs JSON:
//   { regState: { "2025/2026_1": "draft" | "submitted" | "locked" } }
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper: resolve the AcademicSemester row (with its numeric FK id)
// backing whatever semester.ts currently considers "active". Offering-based
// queries need the real id; session/semester strings alone aren't enough.
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

function serializeOffering(o: EligibleOffering, preselectedCourseId: string | null) {
	return {
		id: o.offeringId,
		code: o.courseCode,
		title: o.courseTitle,
		creditUnits: o.creditUnits,
		level: o.courseLevel,
		semester: o.offeringSemester,
		department: o.departmentName,
		departmentCode: o.departmentCode,
		college: o.collegeName ?? '—',
		collegeAbbr: o.collegeAbbr ?? '—',
		registrationCount: o.registrationCount,
		preselected: o.courseId === preselectedCourseId
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Load
// ─────────────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStudent(locals.user);
	const prisma = await getPrismaClient();

	const { active, row: semesterRow } = await resolveActiveSemesterRow();
	const currentSession = active.session;
	const currentSemester = active.semester;
	const regOpen = semesterRow?.regOpen ?? active.regOpen;
	const regKey = `${currentSession}_${currentSemester}`;

	const [levelRow, collegeRow, phase] = await Promise.all([
		user.levelId
			? prisma.level.findUnique({ where: { id: user.levelId }, select: { level: true } })
			: null,
		user.collegeId
			? prisma.college.findUnique({ where: { id: user.collegeId }, select: { name: true } })
			: null,
		getRegPhase(user.id, regKey)
	]);
	const studentLevel = levelRow?.level ?? 100;

	const configRow = await prisma.levelSemesterConfig.findUnique({
		where: { levelId_semester: { levelId: user.levelId ?? 0, semester: currentSemester } },
		select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true }
	});
	const MAX_CREDITS = configRow?.maxCredits ?? 25;
	const MAX_CARRY_OVER = configRow?.maxCarryOver ?? 6;
	const MAX_BORROWED = configRow?.maxBorrowed ?? 6;

	const existingRegs = await prisma.courseRegistration.findMany({
		where: { studentId: user.id, session: currentSession, semester: currentSemester },
		include: {
			course: {
				select: {
					code: true,
					title: true,
					creditUnits: true,
					level: true,
					department: { select: { name: true, code: true } }
				}
			}
		},
		orderBy: { createdAt: 'asc' }
	});

	const currentCredits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

	// Offering-driven course discovery. If the active semester has no
	// AcademicSemester row yet (semester.ts on its date fallback, nobody has
	// seeded one), degrade to empty lists rather than 500ing the whole page —
	// the student sees "no courses available" instead of a crash.
	const [eligible, lowerLevel] = semesterRow
		? await Promise.all([
				resolveEligibleOfferings(user.id, semesterRow.id),
				studentLevel > 100
					? resolveLowerLevelOfferings(user.id, semesterRow.id)
					: Promise.resolve([] as EligibleOffering[])
			])
		: [[] as EligibleOffering[], [] as EligibleOffering[]];

	const preselected = url.searchParams.get('course') ?? null;

	// "College" tab = the student's own department's core + gst curriculum.
	// "Borrowed" tab = courses explicitly attached to their department as
	// borrowed/elective via Curriculum. Both exclude courses already registered.
	const collegeCourses = eligible
		.filter((o) => !o.isRegistered && (o.type === 'core' || o.type === 'gst'))
		.map((o) => serializeOffering(o, preselected));

	const borrowedCourses = eligible
		.filter((o) => !o.isRegistered && (o.type === 'borrowed' || o.type === 'elective'))
		.map((o) => serializeOffering(o, preselected));

	const carryOverCourses = lowerLevel
		.filter((o) => !o.isRegistered)
		.map((o) => serializeOffering(o, preselected));

	return {
		existingRegistrations: existingRegs.map((r) => ({
			id: r.id,
			courseId: r.courseId,
			courseCode: r.course.code,
			courseTitle: r.course.title,
			creditUnits: r.course.creditUnits,
			level: r.course.level,
			department: r.course.department?.name ?? '—',
			registrationType: r.registrationType,
			status: r.status,
			registeredAt: r.createdAt
		})),
		collegeCourses,
		carryOverCourses,
		borrowedCourses,
		meta: {
			session: currentSession,
			semester: currentSemester,
			maxCredits: MAX_CREDITS,
			maxCarryOver: MAX_CARRY_OVER,
			maxBorrowed: MAX_BORROWED,
			currentCredits,
			studentLevel,
			studentCollege: collegeRow?.name ?? null,
			phase,
			regOpen
		}
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared context resolver
// ─────────────────────────────────────────────────────────────────────────────
async function resolveStudentContext(user: Awaited<ReturnType<typeof requireStudent>>) {
	const prisma = await getPrismaClient();

	const { active, row: semesterRow } = await resolveActiveSemesterRow();
	const currentSession = active.session;
	const currentSemester = active.semester;
	const regOpen = semesterRow?.regOpen ?? active.regOpen;
	const regKey = `${currentSession}_${currentSemester}`;

	const [levelRow, phase] = await Promise.all([
		user.levelId
			? prisma.level.findUnique({ where: { id: user.levelId }, select: { level: true } })
			: null,
		getRegPhase(user.id, regKey)
	]);
	const studentLevel = levelRow?.level ?? 100;

	const configRow = await prisma.levelSemesterConfig.findUnique({
		where: { levelId_semester: { levelId: user.levelId ?? 0, semester: currentSemester } },
		select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true }
	});

	return {
		currentSession,
		currentSemester,
		academicSemesterId: semesterRow?.id ?? null,
		studentDepartmentId: user.departmentId ?? null,
		regKey,
		studentLevel,
		phase,
		regOpen,
		maxCredits: configRow?.maxCredits ?? 25,
		maxCarryOver: configRow?.maxCarryOver ?? 6,
		maxBorrowed: configRow?.maxBorrowed ?? 6
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-offering validation helper (replaces the old per-course version)
// ─────────────────────────────────────────────────────────────────────────────
async function validateOfferingForStudent(
	offeringId: string,
	type: 'normal' | 'carry_over' | 'borrowed',
	ctx: Awaited<ReturnType<typeof resolveStudentContext>>
) {
	const prisma = await getPrismaClient();

	const offering = await prisma.courseOffering.findUnique({
		where: { id: offeringId },
		include: {
			course: { select: { id: true, code: true, creditUnits: true } },
			level: { select: { level: true } },
			departments: { select: { departmentId: true } }
		}
	});
	if (!offering) return { error: `Course offering not found.` };
	if (offering.status !== 'open') return { error: `${offering.course.code} is not open for registration.` };

	const sameDept = offering.departments.some((d) => d.departmentId === ctx.studentDepartmentId);
	const offeringLevel = offering.level.level;

	if (type === 'normal') {
		if (!sameDept) return { error: 'Normal registration is only for courses offered to your department.' };
		if (offeringLevel !== ctx.studentLevel)
			return { error: 'Normal registration is only for courses at your current level.' };
	}
	if (type === 'carry_over') {
		if (!sameDept) return { error: 'Carry-over is only for courses offered to your department.' };
		if (ctx.studentLevel <= 100) return { error: '100 Level students cannot register carry-over courses.' };
		if (offeringLevel >= ctx.studentLevel)
			return { error: 'Carry-over courses must be from a level below yours.' };
	}
	if (type === 'borrowed') {
		if (!ctx.studentDepartmentId) return { error: 'Your department is not set. Contact your academic office.' };
		if (sameDept) return { error: 'Borrowed registration is only for courses not offered to your own department.' };
		if (offeringLevel !== ctx.studentLevel) return { error: 'Borrowed courses must be at your current level.' };
	}

	return { offering };
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const actions: Actions = {
	// ── Batch add (draft phase) ───────────────────────────────────────────
	// Receives repeated fields: offeringId[], type[]  (parallel arrays)
	batchRegister: async ({ request, locals }) => {
		const user = await requireStudent(locals.user);
		const prisma = await getPrismaClient();
		const fd = await request.formData();
		const ctx = await resolveStudentContext(user);

		if (!ctx.regOpen) {
			return fail(403, { error: 'Course registration is currently closed. Contact your academic office.' });
		}
		if (ctx.phase === 'locked') {
			return fail(403, { error: 'Your registration is fully locked. Contact your academic office.' });
		}
		if (ctx.phase !== 'draft') {
			return fail(400, { error: 'Use the update action once your registration is submitted.' });
		}

		const offeringIds = fd.getAll('offeringId').map((v) => v.toString());
		const types = fd.getAll('type').map((v) => v.toString() as 'normal' | 'carry_over' | 'borrowed');

		if (offeringIds.length === 0) return fail(400, { error: 'No courses selected.' });

		const existingRegs = await prisma.courseRegistration.findMany({
			where: { studentId: user.id, session: ctx.currentSession, semester: ctx.currentSemester },
			select: { courseId: true, registrationType: true, course: { select: { creditUnits: true } } }
		});
		const registeredCourseIds = new Set(existingRegs.map((r) => r.courseId));
		let usedCredits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

		const toCreate: {
			courseId: string;
			offeringId: string;
			type: 'normal' | 'carry_over' | 'borrowed';
			status: string;
		}[] = [];

		for (let i = 0; i < offeringIds.length; i++) {
			const offeringId = offeringIds[i];
			const type = types[i] ?? 'normal';

			const result = await validateOfferingForStudent(offeringId, type, ctx);
			if (result.error) return fail(400, { error: result.error });

			const offering = result.offering!;
			if (registeredCourseIds.has(offering.course.id)) continue; // skip already-registered silently

			usedCredits += offering.course.creditUnits;
			if (usedCredits > ctx.maxCredits) {
				return fail(400, { error: `Credit limit exceeded. Max is ${ctx.maxCredits} CU.` });
			}

			const status = type === 'carry_over' ? 'pending' : 'approved';
			toCreate.push({ courseId: offering.course.id, offeringId, type, status });
		}

		if (toCreate.length === 0) {
			return fail(400, { error: 'All selected courses are already registered.' });
		}

		const existingCarryOver = existingRegs.filter((r) => r.registrationType === 'carry_over').length;
		const existingBorrowed = existingRegs.filter((r) => r.registrationType === 'borrowed').length;
		const addingCarryOver = toCreate.filter((c) => c.type === 'carry_over').length;
		const addingBorrowed = toCreate.filter((c) => c.type === 'borrowed').length;

		if (existingCarryOver + addingCarryOver > ctx.maxCarryOver) {
			return fail(400, {
				error: `Carry-over limit is ${ctx.maxCarryOver} courses. You already have ${existingCarryOver}.`
			});
		}
		if (existingBorrowed + addingBorrowed > ctx.maxBorrowed) {
			return fail(400, {
				error: `Borrowed limit is ${ctx.maxBorrowed} courses. You already have ${existingBorrowed}.`
			});
		}

		try {
			await prisma.$transaction(
				toCreate.map(({ courseId, offeringId, type, status }) =>
					prisma.courseRegistration.create({
						data: {
							studentId: user.id,
							courseId,
							offeringId,
							session: ctx.currentSession,
							semester: ctx.currentSemester,
							registrationType: type,
							status,
							levelId: user.levelId ?? undefined
						}
					})
				)
			);
		} catch (err: any) {
			if (err?.code === 'P2002') {
				return fail(409, { error: 'One or more selected courses were already registered. Refresh and try again.' });
			}
			throw err;
		}

		return { success: true, added: toCreate.length };
	},

	// ── Drop one course (draft phase) ─────────────────────────────────────
	drop: async ({ request, locals }) => {
		const user = await requireStudent(locals.user);
		const prisma = await getPrismaClient();
		const fd = await request.formData();
		const registrationId = fd.get('registrationId')?.toString();
		if (!registrationId) return fail(400, { error: 'Registration ID required.' });

		const ctx = await resolveStudentContext(user);
		if (ctx.phase === 'locked') {
			return fail(403, { error: 'Registration is locked. Contact your academic office.' });
		}

		const reg = await prisma.courseRegistration.findFirst({
			where: { id: registrationId, studentId: user.id }
		});
		if (!reg) return fail(404, { error: 'Registration not found.' });

		await prisma.courseRegistration.delete({ where: { id: registrationId } });
		return { success: true };
	},

	// ── Submit registration (draft → submitted) ───────────────────────────
	submit: async ({ locals }) => {
		const user = await requireStudent(locals.user);
		const prisma = await getPrismaClient();

		const ctx = await resolveStudentContext(user);

		if (ctx.phase !== 'draft') return fail(400, { error: 'Already submitted.' });

		const count = await prisma.courseRegistration.count({
			where: { studentId: user.id, session: ctx.currentSession, semester: ctx.currentSemester }
		});
		if (count === 0) {
			return fail(400, { error: 'Register at least one course before submitting.' });
		}

		await setRegPhase(user.id, ctx.regKey, 'submitted');
		return { success: true, phase: 'submitted' };
	},

	// ── One-time update (submitted → locked) ──────────────────────────────
	// addOfferingId[] + addType[] (parallel) and dropId[] (registration IDs)
	update: async ({ request, locals }) => {
		const user = await requireStudent(locals.user);
		const prisma = await getPrismaClient();

		const fd = await request.formData();
		const ctx = await resolveStudentContext(user);

		if (ctx.phase === 'draft') {
			return fail(400, { error: 'Submit your registration before using the update window.' });
		}
		if (ctx.phase === 'locked') {
			return fail(403, { error: 'You have already used your one-time update. Contact your academic office.' });
		}

		const addOfferingIds = fd.getAll('addOfferingId').map((v) => v.toString());
		const addTypes = fd.getAll('addType').map((v) => v.toString() as 'normal' | 'carry_over' | 'borrowed');
		const dropIds = fd.getAll('dropId').map((v) => v.toString());

		if (addOfferingIds.length === 0 && dropIds.length === 0) {
			return fail(400, { error: 'No changes selected.' });
		}

		const existingRegs = await prisma.courseRegistration.findMany({
			where: { studentId: user.id, session: ctx.currentSession, semester: ctx.currentSemester },
			select: { id: true, courseId: true, registrationType: true, course: { select: { creditUnits: true } } }
		});
		let credits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

		for (const dropId of dropIds) {
			const reg = existingRegs.find((r) => r.id === dropId);
			if (!reg) return fail(404, { error: `Registration ${dropId} not found.` });
			credits -= reg.course.creditUnits;
		}

		const toAdd: {
			courseId: string;
			offeringId: string;
			creditUnits: number;
			type: 'normal' | 'carry_over' | 'borrowed';
			status: string;
		}[] = [];

		for (let i = 0; i < addOfferingIds.length; i++) {
			const offeringId = addOfferingIds[i];
			const type = addTypes[i] ?? 'normal';

			const result = await validateOfferingForStudent(offeringId, type, ctx);
			if (result.error) return fail(400, { error: result.error });

			const offering = result.offering!;
			credits += offering.course.creditUnits;
			if (credits > ctx.maxCredits) {
				return fail(400, { error: `Credit limit exceeded after changes. Max is ${ctx.maxCredits} CU.` });
			}

			const status = type === 'carry_over' ? 'pending' : 'approved';
			toAdd.push({ courseId: offering.course.id, offeringId, creditUnits: offering.course.creditUnits, type, status });
		}

		const remainingRegs = existingRegs.filter((r) => !dropIds.includes(r.id));
		const keptCarryOver = remainingRegs.filter((r) => r.registrationType === 'carry_over').length;
		const keptBorrowed = remainingRegs.filter((r) => r.registrationType === 'borrowed').length;
		const addingCarryOver = toAdd.filter((c) => c.type === 'carry_over').length;
		const addingBorrowed = toAdd.filter((c) => c.type === 'borrowed').length;

		if (keptCarryOver + addingCarryOver > ctx.maxCarryOver) {
			return fail(400, { error: `Carry-over limit is ${ctx.maxCarryOver} courses.` });
		}
		if (keptBorrowed + addingBorrowed > ctx.maxBorrowed) {
			return fail(400, { error: `Borrowed limit is ${ctx.maxBorrowed} courses.` });
		}

		try {
			await prisma.$transaction([
				...dropIds.map((id) => prisma.courseRegistration.delete({ where: { id } })),
				...toAdd.map(({ courseId, offeringId, type, status }) =>
					prisma.courseRegistration.create({
						data: {
							studentId: user.id,
							courseId,
							offeringId,
							session: ctx.currentSession,
							semester: ctx.currentSemester,
							registrationType: type,
							status,
							levelId: user.levelId ?? undefined
						}
					})
				)
			]);
		} catch (err: any) {
			if (err?.code === 'P2002') {
				return fail(409, { error: 'One or more selected courses were already registered. Refresh and try again.' });
			}
			throw err;
		}

		await setRegPhase(user.id, ctx.regKey, 'locked');
		return { success: true, phase: 'locked' };
	}
};