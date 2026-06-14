// src/routes/student/exam/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);
            const prisma = await getPrismaClient();
  const activeSemester = await prisma.academicSemester.findFirst({
    where: { isActive: true },
    select: { session: true, semester: true },
  });

  const [availableExams, mySessionMap] = await Promise.all([
    // All exams relevant to this student's level + department
    prisma.exam.findMany({
      where: {
        status: { in: ['active', 'scheduled', 'completed'] },
        OR: [
          { examLevels:      { some: { levelId: user.levelId ?? -1 } } },
          { levels:          { some: { id: user.levelId ?? -1 } } },
          { examDepartments: { some: { departmentId: user.departmentId ?? '' } } },
          { course:          { departmentId: user.departmentId ?? '' } },
        ],
      },
      orderBy: [{ status: 'asc' }, { scheduledStart: 'asc' }],
      select: {
        id: true, title: true, status: true,
        durationMinutes: true, scheduledStart: true, scheduledEnd: true,
        questionsToPresent: true, totalMarks: true, passMark: true,
        randomizeQuestions: true, allowLateEntry: true, lateEntryMinutes: true,
        session: true, semester: true,
        course: { select: { code: true, title: true, creditUnits: true } },
        _count: { select: { questions: true, examSessions: true } },
      },
    }),

    // My sessions: know which exams I've sat / started
    prisma.examSession.findMany({
      where: { studentId: user.id },
      select: {
        examId: true, status: true, score: true,
        startedAt: true, submittedAt: true,
        examResult: { select: { percentage: true, passed: true, grade: true } },
      },
    }).then(rows => new Map(rows.map(r => [r.examId, r]))),
  ]);

  // Annotate each exam with the student's session state
  const exams = availableExams.map(exam => ({
    ...exam,
    mySession: mySessionMap.get(exam.id) ?? null,
  }));

  const active    = exams.filter(e => e.status === 'active');
  const scheduled = exams.filter(e => e.status === 'scheduled');
  const completed = exams.filter(e => e.status === 'completed');

  return { exams, active, scheduled, completed, activeSemester };
};