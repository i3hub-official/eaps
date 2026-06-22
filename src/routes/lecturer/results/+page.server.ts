// src/routes/lecturer/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  // FIX: Add await here
  const user = await requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // ── Filters from query params ──────────────────────────────────
  const filterSemester = url.searchParams.get('semester') ?? 'all';   // "all" | "2024/2025-1" | etc.
  const filterCourse   = url.searchParams.get('course')   ?? 'all';
  const filterCollege  = url.searchParams.get('college')  ?? 'all';
  const filterDept     = url.searchParams.get('dept')     ?? 'all';
  const filterGrade    = url.searchParams.get('grade')    ?? 'all';
  const search         = url.searchParams.get('q')        ?? '';

  // ── Fetch all exams this lecturer created ─────────────────────
  const exams = await prisma.exam.findMany({
    where: { createdBy: user.id },
    include: {
      course: { select: { id: true, code: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (exams.length === 0) {
    return {
      user,
      results: [],
      exams: [],
      semesters: [],
      courses: [],
      colleges: [],
      departments: [],
      summary: { total: 0, passed: 0, failed: 0, avgPct: 0, passRate: 0 },
      gradeDistribution: [],
      filters: { filterSemester, filterCourse, filterCollege, filterDept, filterGrade, search },
    };
  }

  const examIds = exams.map((e) => e.id);

  // ── Build semester list from exams ────────────────────────────
  const semesterSet = new Map<string, string>();
  for (const e of exams) {
    const key = `${e.session}-${e.semester}`;
    semesterSet.set(key, `${e.session} — Semester ${e.semester}`);
  }
  const semesters = Array.from(semesterSet.entries()).map(([value, label]) => ({ value, label }));

  // ── Courses (distinct from this lecturer's exams) ─────────────
  const courses = Array.from(
    new Map(exams.map((e) => [e.course.id, e.course])).values()
  );

  // ── Build WHERE filters ───────────────────────────────────────
  const examIdFilter: string[] = (() => {
    let ids = examIds;
    if (filterSemester !== 'all') {
      const [session, sem] = filterSemester.split('-');
      ids = exams
        .filter((e) => e.session === session && String(e.semester) === sem)
        .map((e) => e.id);
    }
    if (filterCourse !== 'all') {
      ids = ids.filter((id) => {
        const ex = exams.find((e) => e.id === id);
        return ex?.course.id === filterCourse;
      });
    }
    return ids;
  })();

  // ── Fetch results with full joins ─────────────────────────────
  const rawResults = await prisma.examResult.findMany({
    where: {
      examId: { in: examIdFilter.length > 0 ? examIdFilter : ['__none__'] },
      ...(filterGrade !== 'all' ? { grade: filterGrade } : {}),
      student: {
        ...(filterCollege !== 'all' ? { collegeId: Number(filterCollege) } : {}),
        ...(filterDept !== 'all' ? { departmentId: filterDept } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { matricNumber: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          matricNumber: true,
          college: { select: { id: true, name: true, abbreviation: true } },
          department: { select: { id: true, name: true } },
          level: { select: { level: true } },
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          session: true,
          semester: true,
          passMark: true,
          totalMarks: true,
          course: { select: { id: true, code: true, title: true } },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  // ── Colleges & departments from result set ────────────────────
  const collegeMap = new Map<number, { id: number; name: string; abbreviation: string | null }>();
  const deptMap    = new Map<string, { id: string; name: string }>();

  for (const r of rawResults) {
    if (r.student.college) {
      collegeMap.set(r.student.college.id, r.student.college);
    }
    if (r.student.department) {
      deptMap.set(r.student.department.id, r.student.department);
    }
  }

  const colleges    = Array.from(collegeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const departments = Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // ── Summary stats ─────────────────────────────────────────────
  const total    = rawResults.length;
  const passed   = rawResults.filter((r) => r.passed).length;
  const failed   = total - passed;
  const avgPct   = total
    ? Math.round(rawResults.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / total * 10) / 10
    : 0;
  const passRate = total ? Math.round((passed / total) * 100) : 0;

  // ── Grade distribution ────────────────────────────────────────
  const gradeCount = new Map<string, number>();
  for (const r of rawResults) {
    const g = r.grade ?? 'N/A';
    gradeCount.set(g, (gradeCount.get(g) ?? 0) + 1);
  }
  const gradeDistribution = Array.from(gradeCount.entries())
    .map(([grade, count]) => ({ grade, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => a.grade.localeCompare(b.grade));

  // ── Serialise (Decimal → number) ─────────────────────────────
  const results = rawResults.map((r) => ({
    id:            r.id,
    studentId:     r.studentId,
    examId:        r.examId,
    totalQuestions: r.totalQuestions,
    answered:      r.answered,
    correct:       r.correct,
    score:         Number(r.score ?? 0),
    percentage:    Number(r.percentage ?? 0),
    passed:        r.passed,
    grade:         r.grade,
    violationCount: r.violationCount,
    timeTakenSecs: r.timeTakenSecs,
    submittedAt:   r.submittedAt?.toISOString() ?? null,
    student: {
      id:           r.student.id,
      fullName:     r.student.fullName,
      matricNumber: r.student.matricNumber,
      college:      r.student.college,
      department:   r.student.department,
      level:        r.student.level,
    },
    exam: {
      id:         r.exam.id,
      title:      r.exam.title,
      session:    r.exam.session,
      semester:   r.exam.semester,
      passMark:   r.exam.passMark,
      totalMarks: r.exam.totalMarks,
      course:     r.exam.course,
    },
  }));

  return {
    user,
    results,
    exams: exams.map((e) => ({
      id: e.id, title: e.title, session: e.session, semester: e.semester,
      course: e.course, status: e.status,
    })),
    semesters,
    courses,
    colleges,
    departments,
    summary: { total, passed, failed, avgPct, passRate },
    gradeDistribution,
    filters: { filterSemester, filterCourse, filterCollege, filterDept, filterGrade, search },
  };
};