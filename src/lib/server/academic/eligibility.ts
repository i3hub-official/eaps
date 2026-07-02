// src/lib/server/academic/eligibility.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import { getActiveSemester } from '$lib/server/academic/semester.js';
import { CurriculumType, RegistrationStatus, CourseOfferingStatus } from '@prisma/client';

export interface EligibleOffering {
	offeringId: string;
	courseId: string;
	courseCode: string;
	courseTitle: string;
	creditUnits: number;
	courseLevel: number | null;
	offeringSemester: number;
	departmentName: string;
	departmentCode: string;
	collegeName: string | null;
	collegeAbbr: string | null;
	registrationCount: number;
	type: CurriculumType;
	isRegistered: boolean;
	registrationId: string | null;
}

const offeringInclude = {
	course: {
		select: {
			id: true,
			code: true,
			title: true,
			creditUnits: true,
			level: true,
			department: {
				select: {
					name: true,
					code: true,
					college: { select: { name: true, abbreviation: true } }
				}
			}
		}
	},
	_count: { select: { registrations: true } }
} as const;

type OfferingWithCourse = {
	id: string;
	courseId: string;
	course: {
		code: string;
		title: string;
		creditUnits: number;
		level: number | null;
		department: { name: string; code: string; college: { name: string; abbreviation: string | null } | null };
	};
	_count: { registrations: number };
};

function toEligibleOffering(
	o: OfferingWithCourse,
	semester: number,
	type: CurriculumType,
	registration: { id: string } | undefined
): EligibleOffering {
	return {
		offeringId: o.id,
		courseId: o.courseId,
		courseCode: o.course.code,
		courseTitle: o.course.title,
		creditUnits: o.course.creditUnits,
		courseLevel: o.course.level,
		offeringSemester: semester,
		departmentName: o.course.department.name,
		departmentCode: o.course.department.code,
		collegeName: o.course.department.college?.name ?? null,
		collegeAbbr: o.course.department.college?.abbreviation ?? null,
		registrationCount: o._count.registrations,
		type,
		isRegistered: !!registration,
		registrationId: registration?.id ?? null
	};
}

/**
 * Resolves the AcademicSemester row backing the "currently active" period,
 * per semester.ts's session/semester logic. Throws a clear, actionable error
 * if no row exists yet for that period — this can happen legitimately when
 * semester.ts is running on its date-derived fallback (fromDb: false) and
 * nobody has seeded/advanced the AcademicSemester table yet. CourseOffering
 * rows always need a real FK id, so silently guessing is worse than failing loud.
 */
async function resolveActiveSemesterRecord(prisma: Awaited<ReturnType<typeof getPrismaClient>>) {
	const active = await getActiveSemester();
	const row = await prisma.academicSemester.findUnique({
		where: { session_semester: { session: active.session, semester: active.semester } }
	});
	if (!row) {
		throw new Error(
			`No AcademicSemester row exists for ${active.label}. Seed one via the admin semester tools or call advanceSemesterIfDue() before resolving offerings.`
		);
	}
	return row;
}

/**
 * Resolves the set of CourseOfferings a student is eligible to register for
 * in the given (or currently active) academic semester, scoped to their OWN
 * level's curriculum (core, gst, borrowed, elective — whatever an admin has
 * attached to their department for that level+semester).
 */
export async function resolveEligibleOfferings(
	studentId: string,
	academicSemesterId?: number
): Promise<EligibleOffering[]> {
	const prisma = await getPrismaClient();

	const student = await prisma.user.findUniqueOrThrow({
		where: { id: studentId },
		select: { departmentId: true, levelId: true }
	});

	if (!student.departmentId || !student.levelId) {
		throw new Error('Student is missing department or level assignment');
	}

	const semester = academicSemesterId
		? await prisma.academicSemester.findUniqueOrThrow({ where: { id: academicSemesterId } })
		: await resolveActiveSemesterRecord(prisma);

	const curriculumEntries = await prisma.curriculum.findMany({
		where: {
			departmentId: student.departmentId,
			levelId: student.levelId,
			semester: semester.semester,
			isActive: true
		},
		select: { courseId: true, type: true }
	});

	if (curriculumEntries.length === 0) return [];

	const courseIds = curriculumEntries.map((c) => c.courseId);
	const typeByCourse = new Map(curriculumEntries.map((c) => [c.courseId, c.type]));

	const offerings = await prisma.courseOffering.findMany({
		where: {
			courseId: { in: courseIds },
			academicSemesterId: semester.id,
			levelId: student.levelId,
			status: CourseOfferingStatus.open,
			departments: { some: { departmentId: student.departmentId } }
		},
		include: {
			...offeringInclude,
			registrations: {
				where: { studentId, status: { not: RegistrationStatus.withdrawn } },
				select: { id: true }
			}
		}
	});

	return offerings.map((o) =>
		toEligibleOffering(
			o,
			semester.semester,
			typeByCourse.get(o.courseId) ?? CurriculumType.core,
			o.registrations[0]
		)
	);
}

/**
 * Lower-level courses in the student's own department, offered in the target
 * semester — the "carry-over" tab's actual source list. This is deliberately
 * NOT tied to ExamResult.finalPassed: the product lets a student queue any
 * prior-level course as a carry-over registration, matching the existing
 * registration page's behavior (an admin/lecturer approves the pending
 * registration afterward — see registrationType: 'carry_over', status: 'pending').
 * For a stricter "only courses you actually failed" list, see
 * resolveCarryOverOfferings below instead.
 */
export async function resolveLowerLevelOfferings(
	studentId: string,
	academicSemesterId?: number
): Promise<EligibleOffering[]> {
	const prisma = await getPrismaClient();

	const student = await prisma.user.findUniqueOrThrow({
		where: { id: studentId },
		select: { departmentId: true, levelId: true, level: { select: { level: true } } }
	});

	if (!student.departmentId || !student.levelId || !student.level) {
		throw new Error('Student is missing department or level assignment');
	}
	if (student.level.level <= 100) return []; // no level below 100L to carry over from

	const semester = academicSemesterId
		? await prisma.academicSemester.findUniqueOrThrow({ where: { id: academicSemesterId } })
		: await resolveActiveSemesterRecord(prisma);

	const lowerLevels = await prisma.level.findMany({
		where: { level: { lt: student.level.level } },
		select: { id: true }
	});
	const lowerLevelIds = lowerLevels.map((l) => l.id);
	if (lowerLevelIds.length === 0) return [];

	const curriculumEntries = await prisma.curriculum.findMany({
		where: {
			departmentId: student.departmentId,
			levelId: { in: lowerLevelIds },
			semester: semester.semester,
			isActive: true
		},
		select: { courseId: true }
	});
	if (curriculumEntries.length === 0) return [];

	const courseIds = curriculumEntries.map((c) => c.courseId);

	const offerings = await prisma.courseOffering.findMany({
		where: {
			courseId: { in: courseIds },
			academicSemesterId: semester.id,
			levelId: { in: lowerLevelIds },
			status: CourseOfferingStatus.open,
			departments: { some: { departmentId: student.departmentId } }
		},
		include: {
			...offeringInclude,
			registrations: {
				where: { studentId, status: { not: RegistrationStatus.withdrawn } },
				select: { id: true }
			}
		}
	});

	return offerings.map((o) =>
		toEligibleOffering(o, semester.semester, CurriculumType.core, o.registrations[0])
	);
}

/**
 * Strict carry-over: offerings for courses the student has actually FAILED
 * (finalPassed === false on a prior ExamResult), available for re-registration
 * in the target semester. Not currently wired into the registration page —
 * kept for a future "these are your outstanding failures" nudge, or for
 * validation layered on top of resolveLowerLevelOfferings if you decide to
 * tighten the product rule later.
 */
export async function resolveCarryOverOfferings(
	studentId: string,
	academicSemesterId?: number
): Promise<EligibleOffering[]> {
	const prisma = await getPrismaClient();

	const semester = academicSemesterId
		? await prisma.academicSemester.findUniqueOrThrow({ where: { id: academicSemesterId } })
		: await resolveActiveSemesterRecord(prisma);

	const failedResults = await prisma.examResult.findMany({
		where: {
			studentId,
			finalPassed: false,
			exam: { offeringId: { not: null } }
		},
		select: { exam: { select: { offering: { select: { courseId: true } } } } }
	});

	const failedCourseIds = [
		...new Set(
			failedResults.map((r) => r.exam.offering?.courseId).filter((id): id is string => !!id)
		)
	];
	if (failedCourseIds.length === 0) return [];

	const offerings = await prisma.courseOffering.findMany({
		where: {
			courseId: { in: failedCourseIds },
			academicSemesterId: semester.id,
			status: CourseOfferingStatus.open
		},
		include: offeringInclude
	});

	return offerings.map((o) => toEligibleOffering(o, semester.semester, CurriculumType.core, undefined));
}

export async function checkExamEligibility(
	studentId: string,
	examId: string
): Promise<{ eligible: boolean; reason?: string }> {
	const prisma = await getPrismaClient();

	const exam = await prisma.exam.findUnique({
		where: { id: examId },
		select: { id: true, status: true, offeringId: true, courseId: true, session: true, semester: true }
	});

	if (!exam) return { eligible: false, reason: 'Exam not found' };
	if (exam.status !== 'active' && exam.status !== 'scheduled') {
		return { eligible: false, reason: `Exam is ${exam.status}` };
	}

	const registration = exam.offeringId
		? await prisma.courseRegistration.findFirst({
				where: {
					studentId,
					offeringId: exam.offeringId,
					status: { in: [RegistrationStatus.approved, RegistrationStatus.pending] }
				}
			})
		: await prisma.courseRegistration.findFirst({
				where: {
					studentId,
					courseId: exam.courseId,
					session: exam.session,
					semester: exam.semester,
					status: { in: [RegistrationStatus.approved, RegistrationStatus.pending] }
				}
			});

	if (!registration) {
		return { eligible: false, reason: 'No registration found for this course' };
	}

	return { eligible: true };
}

export async function isOfferingInScope(
	offeringId: string,
	scope: { collegeId?: number; departmentId?: string; lecturerId?: string }
): Promise<boolean> {
	const prisma = await getPrismaClient();

	if (scope.lecturerId) {
		const assignment = await prisma.teachingAssignment.findUnique({
			where: { offeringId_lecturerId: { offeringId, lecturerId: scope.lecturerId } }
		});
		if (assignment) return true;
	}

	if (scope.departmentId) {
		const dept = await prisma.courseOfferingDepartment.findUnique({
			where: { offeringId_departmentId: { offeringId, departmentId: scope.departmentId } }
		});
		if (dept) return true;
	}

	if (scope.collegeId) {
		const match = await prisma.courseOfferingDepartment.findFirst({
			where: { offeringId, department: { collegeId: scope.collegeId } }
		});
		if (match) return true;
	}

	return false;
}