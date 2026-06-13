// src/routes/admin/exams/create/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  await requireAdmin(locals.user);

  const emulateLecturerId = url.searchParams.get('emulate');


  // Run independent queries that don't depend on each other
  const courses = await prisma.course.findMany({
    orderBy: { code: 'asc' },
    include: { department: { include: { college: true } } },
  });

  const lecturers = await prisma.user.findMany({
    where: { role: 'lecturer', isActive: true },
    select: { id: true, fullName: true, staffId: true, departmentId: true, collegeId: true, levelId: true },
    orderBy: { fullName: 'asc' },
  });

  const levels = await prisma.level.findMany({ orderBy: { level: 'asc' } });

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      collegeId: true,
      college: { select: { name: true } },
    },
  });

  // Only query if emulate param exists and is valid UUID
  let emulateLecturer = null;
  if (emulateLecturerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emulateLecturerId)) {
    emulateLecturer = await prisma.user.findUnique({
      where: { id: emulateLecturerId, role: 'lecturer', isActive: true },
      include: { department: true, college: true, level: true },
    });
  }

  return {
    courses,
    lecturers,
    levels,
    departments,
    emulateLecturer,
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);

    const fd = await request.formData();
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const getNum = (k: string, fallback = 0) => {
      const v = Number(get(k));
      return isNaN(v) ? fallback : v;
    };

    const title = get('title');
    const courseId = get('courseId');
    const createdBy = get('createdBy');
    const session = get('session');
    const semester = getNum('semester');
    const durationMinutes = getNum('durationMinutes', 60);
    const totalMarks = getNum('totalMarks', 100);
    const passMark = getNum('passMark', 40);
    const maxViolations = getNum('maxViolations', 5);
    const questionsToPresent = getNum('questionsToPresent', 0); 
    const scheduledStart = get('scheduledStart') || null;
    const scheduledEnd = get('scheduledEnd') || null;
    const instructions = get('instructions') || null;

    const levelsRaw = fd.getAll('levels').map(Number).filter(n => !isNaN(n) && n > 0);
    const deptRaw = get('department');
    const department = deptRaw || null;

    if (!title) return fail(400, { error: 'Title is required' });
    if (!courseId) return fail(400, { error: 'Course is required' });
    if (!createdBy) return fail(400, { error: 'Lecturer in charge is required' });
    if (!session) return fail(400, { error: 'Session is required' });
    if (!semester) return fail(400, { error: 'Semester is required' });

    if (scheduledStart && scheduledEnd) {
      const start = new Date(scheduledStart);
      const end = new Date(scheduledEnd);
      if (isNaN(start.getTime())) return fail(400, { error: 'Invalid start date' });
      if (isNaN(end.getTime())) return fail(400, { error: 'Invalid end date' });
      if (end <= start) return fail(400, { error: 'End time must be after start time' });
    }

    const [course, lecturer] = await prisma.$transaction([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.user.findFirst({
        where: { id: createdBy, role: 'lecturer', isActive: true },
        include: { department: true },
      }),
    ]);

    if (!course) return fail(400, { error: 'Selected course does not exist' });
    if (!lecturer) return fail(400, { error: 'Selected lecturer is not valid or inactive' });

    const exam = await prisma.exam.create({
      data: {
        title,
        courseId,
        createdBy,
        session,
        semester,
        durationMinutes,
        totalMarks,
        passMark,
        maxViolations,
        instructions,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        randomizeQuestions: fd.get('randomizeQuestions') === 'on',
        randomizeOptions: fd.get('randomizeOptions') === 'on',
        showResultAfter: fd.get('showResultAfter') === 'on',
        allowLateEntry: fd.get('allowLateEntry') === 'on',
        status: 'draft',
        department,
        examLevels: levelsRaw.length > 0
          ? { create: levelsRaw.map(lvl => ({ level: { connect: { level: lvl } } })) }
          : undefined,
      },
    });

    redirect(303, `/admin/exams/${exam.id}/questions`);
  },
};