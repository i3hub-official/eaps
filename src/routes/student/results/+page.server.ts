// src/routes/student/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { GROQ_API_KEY }        from '$env/static/private';
import Groq                    from 'groq-sdk';
import { percentageToGrade, gradeToPoints, computeGPA } from '$lib/server/exam/grader.js';

const groq  = new Groq({ apiKey: GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

export const load: PageServerLoad = async ({ locals }) => {
  const user   = await requireStudent(locals.user);
  const prisma = await getPrismaClient();

  const [results, aggregate, registrations] = await Promise.all([
    prisma.examResult.findMany({
      where:   { studentId: user.id },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true, score: true, percentage: true, passed: true,
        grade: true, correct: true, answered: true, totalQuestions: true,
        violationCount: true, timeTakenSecs: true, submittedAt: true, generatedAt: true,
        exam: {
          select: {
            id: true, title: true, totalMarks: true, passMark: true,
            durationMinutes: true, session: true, semester: true,
            scheduledStart: true, scheduledEnd: true,
            course: { select: { id: true, code: true, title: true, creditUnits: true } },
          },
        },
        session: {
          select: { startedAt: true, submittedAt: true, violationCount: true },
        },
      },
    }),

    prisma.examResult.aggregate({
      where: { studentId: user.id },
      _avg:   { percentage: true },
      _max:   { percentage: true },
      _min:   { percentage: true },
      _count: { id: true },
    }),

    prisma.courseRegistration.findMany({
      where:   { studentId: user.id },
      include: { course: true },
      orderBy: [{ session: 'desc' }, { semester: 'asc' }],
    }),
  ]);

  // ── Map courseId → result ─────────────────────────────────────────────────
  const resultByCourseId = new Map(
    results.map(r => [r.exam?.course?.id, r]).filter(([id]) => id)
  );

  // ── Semester buckets ──────────────────────────────────────────────────────
  interface CourseRow {
    courseId:    string;
    code:        string;
    title:       string;
    creditUnits: number;
    score:       number | null;
    percentage:  number | null;
    grade:       string | null;
    gradePoints: number | null;
    passed:      boolean | null;
    resultId:    string | null;
    examTitle:   string | null;
  }

  interface SemesterBucket {
    session:  string;
    semester: number;
    label:    string;
    courses:  CourseRow[];
    gpa:      number;
  }

  const buckets = new Map<string, SemesterBucket>();

  for (const reg of registrations) {
    const key   = `${reg.session}-${reg.semester}`;
    const label = `${reg.session} — Semester ${reg.semester}`;
    if (!buckets.has(key)) {
      buckets.set(key, { session: reg.session, semester: reg.semester, label, courses: [], gpa: 0 });
    }

    const result = resultByCourseId.get(reg.courseId);
    const pct    = result?.percentage != null ? Number(result.percentage) : null;
    const grade  = pct != null ? percentageToGrade(pct) : null;
    const pts    = grade ? gradeToPoints(grade) : null;

    buckets.get(key)!.courses.push({
      courseId:    reg.courseId,
      code:        reg.course.code,
      title:       reg.course.title,
      creditUnits: reg.course.creditUnits,
      score:       result?.score       != null ? Number(result.score) : null,
      percentage:  pct,
      grade,
      gradePoints: pts,
      passed:      result?.passed      ?? null,
      resultId:    result?.id          ?? null,
      examTitle:   result?.exam?.title ?? null,
    });
  }

  const semesters: SemesterBucket[] = [];
  for (const bucket of buckets.values()) {
    const graded = bucket.courses.filter(c => c.gradePoints !== null);
    bucket.gpa = computeGPA(graded.map(c => ({ creditUnits: c.creditUnits, gradePoints: c.gradePoints! })));
    semesters.push(bucket);
  }
  semesters.sort((a, b) =>
    a.session !== b.session ? b.session.localeCompare(a.session) : a.semester - b.semester
  );

  // ── CGPA ──────────────────────────────────────────────────────────────────
  const allGraded = semesters.flatMap(s =>
    s.courses.filter(c => c.gradePoints !== null).map(c => ({
      creditUnits: c.creditUnits, gradePoints: c.gradePoints!,
    }))
  );
  const cgpa = computeGPA(allGraded);

  // ── Groq recommendations ──────────────────────────────────────────────────
  let recommendations = '';
  try {
    const failed = semesters.flatMap(s => s.courses.filter(c => c.grade === 'F'));
    const low    = semesters.flatMap(s => s.courses.filter(c => c.grade === 'D' || c.grade === 'E'));
    const strong = semesters.flatMap(s => s.courses.filter(c => c.grade === 'A'));

    const res = await groq.chat.completions.create({
      model: MODEL, max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are a warm, knowledgeable academic advisor at a Nigerian university.' },
        {
          role: 'user', content: `
You are an academic advisor at MOUAU (Michael Okpara University of Agriculture, Umudike).
CGPA: ${cgpa.toFixed(2)} / 5.00
Failed courses: ${failed.map(c => `${c.code} (${c.title})`).join(', ') || 'None'}
Low-scoring (D/E): ${low.map(c => `${c.code} (${c.title})`).join(', ') || 'None'}
Strong (A): ${strong.map(c => `${c.code} (${c.title})`).join(', ') || 'None'}
Semesters completed: ${semesters.length}

Provide personalised, actionable study recommendations:
1. Overall assessment (2-3 sentences)
2. Priority areas to improve (bullet points)
3. Study strategies for weak areas (bullet points)
4. Encouragement and next steps (2-3 sentences)
Address the student directly. Be warm and specific.`.trim(),
        },
      ],
    });
    recommendations = res.choices[0].message.content ?? '';
  } catch (err) {
    console.error('[Groq] recommendation failed:', err);
    recommendations = '';
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed  = results.filter(r => r.passed).length;
  const failed2 = results.filter(r => !r.passed && r.passed !== null).length;

  return {
    results: results.map(r => ({
      ...r,
      score:      r.score      != null ? Number(r.score)      : null,
      percentage: r.percentage != null ? Number(r.percentage) : null,
      exam: r.exam ? {
        ...r.exam,
        totalMarks: r.exam.totalMarks ?? null,
        passMark:   r.exam.passMark   ?? null,
      } : null,
    })),
    summary: {
      total:    aggregate._count.id,
      passed,
      failed:   failed2,
      avgPct:   Math.round(Number(aggregate._avg.percentage ?? 0)),
      bestPct:  Math.round(Number(aggregate._max.percentage ?? 0)),
      worstPct: Math.round(Number(aggregate._min.percentage ?? 0)),
    },
    semesters,
    cgpa,
    recommendations,
  };
};