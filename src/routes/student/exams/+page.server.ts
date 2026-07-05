// src/routes/student/exams/+page.server.ts

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { resolveEffectiveExam } from '$lib/server/academic/resolve-effective-exam.js';
import { getExamForSession } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent, getSessionAnswers, getOrCreateSession } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import { computeDeadline, secondsRemaining, UUID_RE } from '$lib/server/exam/session-engine.js';
import { toClientExam, toClientSession, toClientQuestions, toSavedAnswers } from '$lib/server/exam/transform.js';
import { resolveEffectiveExam } from '$lib/server/academic/resolve-effective-exam.js';


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
  isEligible?: boolean;
  isRegistered?: boolean;
  isCarryOver?: boolean;
  ineligibilityReasons?: string[];
  sessionStatus?: string | null;
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

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [exams, submittedSessions, regs] = await Promise.all([

      prisma.exam.findMany({
        where: {
          status: { in: ['active', 'scheduled'] },
          session: activeSemester.session,
          semester: activeSemester.semester,
          // Only include exams for courses the student has ANY registration for
          // (including carry_over). Eligibility details are checked below.
          course: {
            registrations: {
              some: {
                studentId: user.id,
                session: activeSemester.session,
                semester: activeSemester.semester,
                status: { notIn: ['rejected', 'withdrawn'] },
              },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { scheduledStart: 'asc' }],
        select: {
          id: true,
          title: true,
          status: true,
          durationMinutes: true,
          scheduledStart: true,
          questionsToPresent: true,
          courseId: true,
          offeringId: true,          // ← added: needed to resolve exam authority below
          session: true,
          semester: true,
          department: true,
          course: {
            select: {
              code: true,
              title: true,
              level: true
            }
          },
          // Include levels so we can check eligibility
          levels: { select: { level: true } },
          _count: { select: { questions: true } },
        },
      }),

      prisma.examSession.findMany({
        where: {
          studentId: user.id,
          status: { in: ['submitted', 'force_submitted'] },
        },
        select: { examId: true },
      }),

      // Fetch all the student's registrations for this semester in one query.
      prisma.courseRegistration.findMany({
        where: {
          studentId: user.id,
          session: activeSemester.session,
          semester: activeSemester.semester,
          status: { notIn: ['rejected', 'withdrawn'] },
        },
        select: {
          courseId: true,
          status: true,
          registrationType: true,
          levelId: true,
        },
      }),
    ]);

    // ── Filter to only the authoritative exam per offering ────────────────
    // Multiple lecturers can each create their own Exam under `lecturer` scope,
    // so without this, a student would see every lecturer's exam for a shared
    // course. This keeps only the one exam that resolveEffectiveExam picks for
    // this specific student. Exams with no offeringId (pre-dating this feature)
    // pass through unfiltered.
    const offeringIds = [...new Set(exams.map(e => e.offeringId).filter(Boolean))] as string[];

    const effectiveExamIds = new Set<string>();
    await Promise.all(
      offeringIds.map(async (offeringId) => {
        try {
          const effectiveExam = await resolveEffectiveExam(offeringId, user.id);
          effectiveExamIds.add(effectiveExam.id);
        } catch {
          // No resolvable exam for this offering yet (e.g. college_coordinator
          // scope active but the coordinator hasn't created their exam yet) —
          // the student correctly sees nothing for it.
        }
      })
    );

    const visibleExams = exams.filter(e => !e.offeringId || effectiveExamIds.has(e.id));

    // ── Fetch in-progress sessions ──────────────────────────────────────────
    const inProgressSessions = await prisma.examSession.findMany({
      where: { studentId: user.id, status: 'in_progress' },
      select: { examId: true },
    });

    const submittedSet = new Set(submittedSessions.map(s => s.examId));
    const inProgressSet = new Set(inProgressSessions.map(s => s.examId));
    // Map courseId → registration row for O(1) lookup
    const regByCourse = new Map(regs.map(r => [r.courseId, r]));

    // Student record for eligibility (needs level only - department is not checked at exam level)
    const studentForElig = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        level: { select: { level: true } },
      },
    });

    // ── Build available exams with eligibility info ────────────────────────
    const availableExams: AvailableExam[] = visibleExams.map(e => {
      const reg = regByCourse.get(e.courseId) ?? null;

      // Check eligibility manually - don't check department
      let isEligible = true;
      const ineligibilityReasons: string[] = [];

      // 1. Check if exam is active
      if (e.status !== 'active') {
        isEligible = false;
        ineligibilityReasons.push(`Exam is ${e.status}`);
      }

      // 2. Check level eligibility through exam levels
      if (e.levels && e.levels.length > 0) {
        const allowedLevels = e.levels.map(l => l.level);
        if (studentForElig?.level?.level && !allowedLevels.includes(studentForElig.level.level)) {
          isEligible = false;
          ineligibilityReasons.push(`Requires one of these levels: ${allowedLevels.join(', ')} (you are level ${studentForElig.level.level})`);
        }
      }

      // 3. Check if already submitted
      if (submittedSet.has(e.id)) {
        isEligible = false;
        ineligibilityReasons.push('You have already submitted this exam');
      }

      // 4. Check if student is registered (already handled by the query, but double-check)
      if (!reg) {
        isEligible = false;
        ineligibilityReasons.push('You are not registered for this course');
      }

      // 5. IMPORTANT: Do NOT check department - registration already validates this
      // The student is registered for the course, so they are eligible regardless of department

      // If no specific reasons found but not eligible, add generic message
      if (!isEligible && ineligibilityReasons.length === 0) {
        ineligibilityReasons.push('You are not eligible for this exam');
      }

      return {
        id: e.id,
        title: e.title,
        status: e.status,
        durationMinutes: e.durationMinutes,
        scheduledStart: e.scheduledStart?.toISOString() ?? null,
        questionsToPresent: e.questionsToPresent,
        course: e.course,
        questionCount: e._count.questions,
        alreadySubmitted: submittedSet.has(e.id),
        sessionStatus: inProgressSet.has(e.id) ? 'in_progress' : null,
        isEligible: isEligible,
        isRegistered: reg !== null,
        isCarryOver: reg?.registrationType === 'carry_over',
        ineligibilityReasons: ineligibilityReasons,
      };
    });

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

  // Get the student's registration for this course (including carry_over)
  const registration = await prisma.courseRegistration.findFirst({
    where: {
      studentId: user.id,
      courseId: exam.courseId,
      session: activeSemester?.session,
      semester: activeSemester?.semester,
      status: { notIn: ['rejected', 'withdrawn'] }
    },
    select: {
      id: true,
      registrationType: true,
      levelId: true
    }
  });

  if (!registration) throw error(403, 'You are not registered for this course.');

  // Check eligibility manually - don't check department
  const studentForElig = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      level: { select: { level: true } },
    },
  });

  let isEligible = true;
  let eligibilityReason = '';

  // Check level eligibility
  if (exam.levels && exam.levels.length > 0) {
    const allowedLevels = exam.levels.map(l => l.level);
    if (studentForElig?.level?.level && !allowedLevels.includes(studentForElig.level.level)) {
      isEligible = false;
      eligibilityReason = `Requires one of these levels: ${allowedLevels.join(', ')} (you are level ${studentForElig.level.level})`;
    }
  }

  // Check if already submitted
  const existingSubmission = await prisma.examSession.findFirst({
    where: {
      studentId: user.id,
      examId: exam.id,
      status: { in: ['submitted', 'force_submitted'] }
    },
    select: { id: true }
  });

  if (existingSubmission) {
    isEligible = false;
    eligibilityReason = 'You have already submitted this exam';
  }

  // IMPORTANT: Do NOT check department - registration already validates this

  if (!isEligible) throw error(403, eligibilityReason || 'Not eligible.');

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
    const prisma = await getPrismaClient();
    const faceDescriptor = await prisma.faceDescriptor.findUnique({
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

    // Get active semester and registration
    const activeSemester = await prisma.academicSemester.findFirst({
      where: { isActive: true },
      select: { session: true, semester: true }
    });

    const registration = await prisma.courseRegistration.findFirst({
      where: {
        studentId: user.id,
        courseId: exam.courseId,
        session: activeSemester?.session,
        semester: activeSemester?.semester,
        status: { notIn: ['rejected', 'withdrawn'] }
      },
      select: {
        id: true,
        registrationType: true,
        levelId: true
      }
    });

    if (!registration) {
      return fail(403, { message: 'You are not registered for this course.' });
    }

    // Check eligibility manually - don't check department
    const studentForElig = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        level: { select: { level: true } },
      },
    });

    let isEligible = true;
    let eligibilityReason = '';

    // Check level eligibility
    if (exam.levels && exam.levels.length > 0) {
      const allowedLevels = exam.levels.map(l => l.level);
      if (studentForElig?.level?.level && !allowedLevels.includes(studentForElig.level.level)) {
        isEligible = false;
        eligibilityReason = `Requires one of these levels: ${allowedLevels.join(', ')} (you are level ${studentForElig.level.level})`;
      }
    }

    // Check if already submitted
    const existingSubmission = await prisma.examSession.findFirst({
      where: {
        studentId: user.id,
        examId: exam.id,
        status: { in: ['submitted', 'force_submitted'] }
      },
      select: { id: true }
    });

    if (existingSubmission) {
      isEligible = false;
      eligibilityReason = 'You have already submitted this exam';
    }

    // IMPORTANT: Do NOT check department - registration already validates this

    if (!isEligible) {
      return fail(403, { message: eligibilityReason || 'Not eligible to start this exam.' });
    }

    const existingSession = await getSessionByExamAndStudent(examId, user.id);

    if (existingSession?.status === 'submitted' || existingSession?.status === 'force_submitted') {
      return fail(403, { message: 'You have already submitted this exam.' });
    }

    if (existingSession?.status === 'in_progress') {
      return fail(400, { message: 'Exam already in progress.' });
    }

    // Create and start session
    const session = await getOrCreateSession({
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

    const prisma = await getPrismaClient();
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, studentId: user.id, status: 'in_progress' },
      select: { id: true, examId: true }
    });

    if (!session) {
      return fail(403, { message: 'Invalid or expired session' });
    }

    // Save the answer
    if (answer !== undefined) {
      await prisma.examAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId: questionId,
          },
        },
        update: {
          answer: answer,
          updatedAt: new Date(),
        },
        create: {
          sessionId: session.id,
          questionId: questionId,
          answer: answer,
        },
      });
    }

    return { success: true };
  },

  submitExam: async ({ request, locals }) => {
    const user = await requireStudent(locals.user);
    const formData = await request.formData();
    const sessionId = formData.get('sessionId')?.toString();

    if (!sessionId) {
      return fail(400, { message: 'Session ID required' });
    }

    const prisma = await getPrismaClient();
    const session = await prisma.examSession.findFirst({
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