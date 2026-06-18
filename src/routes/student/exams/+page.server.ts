import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getExamForSession, isStudentEligible } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent, getSessionAnswers, createExamSession } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import { computeDeadline, secondsRemaining, UUID_RE } from '$lib/server/exam/session-engine.js';
import { toClientExam, toClientSession, toClientQuestions, toSavedAnswers } from '$lib/server/exam/transform.js';

const FACE_REVALIDATION_MS = 5 * 60 * 1000;

function hasFreshFaceVerification(cookies: import('@sveltejs/kit').Cookies): boolean {
	const verified = cookies.get('face_verified');
	const verifiedAt = cookies.get('face_verified_at');
	return (
		verified === 'true' &&
		!!verifiedAt &&
		Date.now() - parseInt(verifiedAt, 10) < FACE_REVALIDATION_MS
	);
}

export type AvailableExam = {
	id: string;
	title: string;
	status: string;
	durationMinutes: number;
	scheduledStart: string | null;
	questionsToPresent: number;
	course: { code: string; title: string } | null;
	questionCount: number;
	alreadySubmitted: boolean;
};

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const user = await requireStudent(locals.user);
	const examId = url.searchParams.get('examId');
	const prisma = await getPrismaClient();

	// ── Face state ──────────────────────────────────────────────────────────
	const faceDescriptor = await prisma.faceDescriptor.findUnique({
		where: { studentId: user.id },
		select: { descriptor: true, embedding_dimension: true, enrolledAt: true }
	});

	const faceEnrolled = !!faceDescriptor;
	const faceVerified = hasFreshFaceVerification(cookies);

	// ── No examId → return exam list ─────────────────────────────────────────
	if (!examId || !UUID_RE.test(examId)) {
		const activeSemester = await prisma.academicSemester.findFirst({
			where: { isActive: true },
			select: { session: true, semester: true }
		});

		if (!activeSemester) {
			return {
				examId: null,
				availableExams: [] as AvailableExam[],
				faceEnrolled,
				faceVerified,
				needsReverify: false,
				exam: null,
				student: null,
				faceDescriptor: null,
				sessionStatus: 'no_exam_selected' as const,
				session: null,
				questions: [],
				savedAnswers: [],
				timeRemaining: 0
			};
		}

		const [exams, submittedIds] = await Promise.all([
			prisma.exam.findMany({
				where: {
					status: { in: ['active', 'scheduled'] },
					session: activeSemester.session,
					semester: activeSemester.semester,
					course: {
						registrations: {
							some: {
								studentId: user.id,
								session: activeSemester.session,
								semester: activeSemester.semester,
								status: { in: ['pending', 'approved'] }
							}
						}
					}
				},
				orderBy: [{ status: 'asc' }, { scheduledStart: 'asc' }],
				select: {
					id: true,
					title: true,
					status: true,
					durationMinutes: true,
					scheduledStart: true,
					questionsToPresent: true,
					course: { select: { code: true, title: true } },
					_count: { select: { questions: true } }
				}
			}),
			prisma.examSession.findMany({
				where: {
					studentId: user.id,
					status: { in: ['submitted', 'force_submitted'] }
				},
				select: { examId: true }
			})
		]);

		const submittedSet = new Set(submittedIds.map((s) => s.examId));

		const availableExams: AvailableExam[] = exams.map((e) => ({
			id: e.id,
			title: e.title,
			status: e.status,
			durationMinutes: e.durationMinutes,
			scheduledStart: e.scheduledStart?.toISOString() ?? null,
			questionsToPresent: e.questionsToPresent,
			course: e.course,
			questionCount: e._count.questions,
			alreadySubmitted: submittedSet.has(e.id)
		}));

		return {
			examId: null,
			availableExams,
			faceEnrolled,
			faceVerified,
			needsReverify: false,
			exam: null,
			student: null,
			faceDescriptor: null,
			sessionStatus: 'no_exam_selected' as const,
			session: null,
			questions: [],
			savedAnswers: [],
			timeRemaining: 0
		};
	}

	// ── examId present → full session load ───────────────────────────────────
	const exam = await getExamForSession(examId);
	if (!exam) throw error(404, 'Exam not found');

	const activeSemester = await prisma.academicSemester.findFirst({
		where: { isActive: true },
		select: { session: true, semester: true }
	});

	const registered = await prisma.courseRegistration.findFirst({
		where: {
			studentId: user.id,
			courseId: exam.courseId,
			session: activeSemester?.session,
			semester: activeSemester?.semester,
			status: { in: ['pending', 'approved'] }
		},
		select: { id: true }
	});

	if (!registered) throw error(403, 'You are not registered for this course.');

	const eligibility = isStudentEligible(exam, user);
	if (!eligibility.eligible) throw error(403, eligibility.reason ?? 'Not eligible.');

	const student = await prisma.user.findUnique({
		where: { id: user.id },
		select: {
			id: true,
			fullName: true,
			email: true,
			matricNumber: true,
			photoUrl: true,
			department: { select: { name: true, college: { select: { name: true } } } },
			level: { select: { level: true } },
			programme: { select: { name: true } }
		}
	});
	if (!student) throw error(404, 'Student record not found');

	const existingSession = await getSessionByExamAndStudent(examId, user.id);

	let sessionData = null;
	let questionsData: ReturnType<typeof toClientQuestions> = [];
	let savedAnswersData: ReturnType<typeof toSavedAnswers> = [];
	let timeRemaining = exam.durationMinutes * 60;
	let sessionStatus = existingSession?.status ?? 'not_started';

	if (existingSession && existingSession.startedAt) {
		const deadline = computeDeadline(exam, existingSession.startedAt);
		const remaining = secondsRemaining(deadline);

		if (remaining <= 0 && existingSession.status === 'in_progress') {
			const { finalizeSession } = await import('$lib/server/exam/session-engine.js');
			await finalizeSession(existingSession.id, 'force_submitted');
			sessionStatus = 'force_submitted';
		} else {
			timeRemaining = Math.max(0, remaining);
		}

		if (existingSession.status === 'in_progress' || existingSession.status === 'not_started') {
			const { getQuestionsByExam } = await import('$lib/server/db/exams.js');
			const allQuestions = await getQuestionsByExam(examId);
			const ordered = await buildStudentQuestionOrder(
				existingSession.id,
				allQuestions,
				exam.randomizeQuestions,
				exam.randomizeOptions,
				exam.questionsToPresent
			);
			const safe = sanitizeQuestionsForClient(ordered);
			const answers = await getSessionAnswers(existingSession.id);

			sessionData = toClientSession(existingSession, timeRemaining);
			questionsData = toClientQuestions(safe);
			savedAnswersData = toSavedAnswers(answers);
		}
	}

	return {
		examId,
		availableExams: [] as AvailableExam[],
		exam: toClientExam(exam),
		student: {
			id: student.id,
			name: student.fullName,
			email: student.email,
			matricNumber: student.matricNumber,
			photoUrl: student.photoUrl,
			department: student.department?.name ?? null,
			college: student.department?.college?.name ?? null,
			level: student.level?.level ? `${student.level.level} Level` : null,
			programme: student.programme?.name ?? null
		},
		faceEnrolled,
		faceVerified,
		needsReverify: faceEnrolled && !faceVerified,
		faceDescriptor: faceDescriptor ? (faceDescriptor.descriptor as number[]) : null,
		sessionStatus,
		session: sessionData,
		questions: questionsData,
		savedAnswers: savedAnswersData,
		timeRemaining
	};
};

export const actions: Actions = {
	startExam: async ({ request, locals, cookies }) => {
		const user = await requireStudent(locals.user);
		const formData = await request.formData();
		const examId = formData.get('examId')?.toString();

		if (!examId || !UUID_RE.test(examId)) {
			return fail(400, { message: 'Invalid exam ID' });
		}

		// ── STRICT face check ONLY at start ─────────────────────────────────────
		const faceDescriptor = await (await getPrismaClient()).faceDescriptor.findUnique({
			where: { studentId: user.id },
			select: { id: true }
		});

		if (!faceDescriptor) {
			return fail(403, { message: 'Face not enrolled. Please enroll your face first.' });
		}

		if (!hasFreshFaceVerification(cookies)) {
			return fail(403, { message: 'Face verification expired. Please verify your face again.' });
		}

		const exam = await getExamForSession(examId);
		if (!exam) return fail(404, { message: 'Exam not found' });

		const eligibility = isStudentEligible(exam, user);
		if (!eligibility.eligible) {
			return fail(403, { message: eligibility.reason ?? 'Not eligible to start this exam.' });
		}

		const existingSession = await getSessionByExamAndStudent(examId, user.id);

		if (existingSession?.status === 'submitted' || existingSession?.status === 'force_submitted') {
			return fail(403, { message: 'You have already submitted this exam.' });
		}

		if (existingSession?.status === 'in_progress') {
			return fail(400, { message: 'Exam already in progress.' });
		}

		// Create and start session
		const session = await createExamSession({
			examId,
			studentId: user.id,
			status: 'in_progress',
			startedAt: new Date()
		});

		return { success: true, sessionId: session.id };
	},

	saveAnswer: async ({ request, locals }) => {
		const user = await requireStudent(locals.user);
		const formData = await request.formData();
		const sessionId = formData.get('sessionId')?.toString();
		const questionId = formData.get('questionId')?.toString();
		const answer = formData.get('answer')?.toString();

		if (!sessionId || !questionId) {
			return fail(400, { message: 'Missing required fields' });
		}

		// Verify session belongs to student and is in progress
		const session = await (await getPrismaClient()).examSession.findFirst({
			where: { id: sessionId, studentId: user.id, status: 'in_progress' },
			select: { id: true, examId: true }
		});

		if (!session) {
			return fail(403, { message: 'Invalid or expired session' });
		}

		// Save answer logic here...
		// await saveSessionAnswer(sessionId, questionId, answer);

		return { success: true };
	},

	submitExam: async ({ request, locals }) => {
		const user = await requireStudent(locals.user);
		const formData = await request.formData();
		const sessionId = formData.get('sessionId')?.toString();

		if (!sessionId) {
			return fail(400, { message: 'Session ID required' });
		}

		const session = await (await getPrismaClient()).examSession.findFirst({
			where: { id: sessionId, studentId: user.id, status: 'in_progress' },
			select: { id: true, examId: true, startedAt: true }
		});

		if (!session) {
			return fail(403, { message: 'Invalid or expired session' });
		}

		const { finalizeSession } = await import('$lib/server/exam/session-engine.js');
		await finalizeSession(session.id, 'submitted');

		return { success: true };
	}
};