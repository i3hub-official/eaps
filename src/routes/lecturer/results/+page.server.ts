// src/routes/lecturer/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);

  const results = await sql(
    `SELECT
       e.id          AS exam_id,
       e.title       AS exam_title,
       c.code        AS course_code,
       c.title       AS course_title,
       e.semester,                    -- ← FIXED: was c.semester
       d.id          AS department_id,
       d.name        AS department_name,
       col.id        AS college_id,
       col.name      AS college_name,
       col.abbreviation AS college_abbr,
       e.status,
       e.scheduled_start,
       e.session,
       COALESCE(es.total_students, 0)  AS total_students,
       COALESCE(es.submitted, 0)       AS submitted,
       COALESCE(er.passed, 0)          AS passed,
       COALESCE(er.failed, 0)          AS failed,
       er.avg_score,
       ARRAY_AGG(DISTINCT l.level) FILTER (WHERE l.level IS NOT NULL) AS levels
     FROM exams e
     JOIN courses c ON c.id = e.course_id
     JOIN departments d ON d.id = c.department_id
     JOIN colleges col ON col.id = d.college_id
     LEFT JOIN exam_levels el ON el.exam_id = e.id
     LEFT JOIN levels l ON l.id = el.level_id
     LEFT JOIN (
       SELECT
         exam_id,
         COUNT(*)::int                                                          AS total_students,
         COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submitted
       FROM exam_sessions
       GROUP BY exam_id
     ) es ON es.exam_id = e.id
     LEFT JOIN (
       SELECT
         exam_id,
         COUNT(*) FILTER (WHERE passed = true)::int  AS passed,
         COUNT(*) FILTER (WHERE passed = false)::int AS failed,
         ROUND(AVG(percentage)::numeric, 1)          AS avg_score
       FROM exam_results
       GROUP BY exam_id
     ) er ON er.exam_id = e.id
     WHERE e.created_by = $1
       AND e.status IN ('active', 'completed')
     GROUP BY e.id, e.title, c.code, c.title, e.semester,  -- ← FIXED here too
              d.id, d.name, col.id, col.name, col.abbreviation,
              e.status, e.scheduled_start, e.session,
              es.total_students, es.submitted, er.passed, er.failed, er.avg_score
     ORDER BY e.scheduled_start DESC NULLS LAST`,
    [user.id]
  );

  // ── Group by College ────────────────────────────────────────────────────────
  const byCollege = results.reduce((acc, r) => {
    const key = r.college_id;
    if (!acc[key]) {
      acc[key] = {
        college_id: r.college_id,
        college_name: r.college_name,
        college_abbr: r.college_abbr,
        exams: [],
        total_students: 0,
        submitted: 0,
        passed: 0,
        failed: 0,
        avg_score_sum: 0,
        avg_score_count: 0,
      };
    }
    acc[key].exams.push(r);
    acc[key].total_students += r.total_students;
    acc[key].submitted += r.submitted;
    acc[key].passed += r.passed;
    acc[key].failed += r.failed;
    if (r.avg_score != null) {
      acc[key].avg_score_sum += r.avg_score;
      acc[key].avg_score_count += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  // ── Group by Department ───────────────────────────────────────────────────
  const byDepartment = results.reduce((acc, r) => {
    const key = r.department_id;
    if (!acc[key]) {
      acc[key] = {
        department_id: r.department_id,
        department_name: r.department_name,
        college_name: r.college_name,
        exams: [],
        total_students: 0,
        submitted: 0,
        passed: 0,
        failed: 0,
        avg_score_sum: 0,
        avg_score_count: 0,
      };
    }
    acc[key].exams.push(r);
    acc[key].total_students += r.total_students;
    acc[key].submitted += r.submitted;
    acc[key].passed += r.passed;
    acc[key].failed += r.failed;
    if (r.avg_score != null) {
      acc[key].avg_score_sum += r.avg_score;
      acc[key].avg_score_count += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  // ── Group by Semester ─────────────────────────────────────────────────────
  const bySemester = results.reduce((acc, r) => {
    const key = r.semester ?? 'Unspecified';
    const label = key === 1 ? 'First Semester' : key === 2 ? 'Second Semester' : `Semester ${key}`;
    if (!acc[key]) {
      acc[key] = {
        semester: key,
        semester_label: label,
        exams: [],
        total_students: 0,
        submitted: 0,
        passed: 0,
        failed: 0,
        avg_score_sum: 0,
        avg_score_count: 0,
      };
    }
    acc[key].exams.push(r);
    acc[key].total_students += r.total_students;
    acc[key].submitted += r.submitted;
    acc[key].passed += r.passed;
    acc[key].failed += r.failed;
    if (r.avg_score != null) {
      acc[key].avg_score_sum += r.avg_score;
      acc[key].avg_score_count += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  // ── Group by Level ────────────────────────────────────────────────────────
  // Flatten levels array first
  const levelGroups = new Map<string, any>();
  for (const r of results) {
    const levels = r.levels?.filter(Boolean) ?? ['Unspecified'];
    for (const level of levels) {
      const key = String(level);
      if (!levelGroups.has(key)) {
        levelGroups.set(key, {
          level: key,
          level_name: `${key} Level`,
          exams: [],
          total_students: 0,
          submitted: 0,
          passed: 0,
          failed: 0,
          avg_score_sum: 0,
          avg_score_count: 0,
        });
      }
      const group = levelGroups.get(key);
      // Avoid double-counting same exam in multiple levels
      if (!group.exams.find((e: any) => e.exam_id === r.exam_id)) {
        group.exams.push(r);
        group.total_students += r.total_students;
        group.submitted += r.submitted;
        group.passed += r.passed;
        group.failed += r.failed;
        if (r.avg_score != null) {
          group.avg_score_sum += r.avg_score;
          group.avg_score_count += 1;
        }
      }
    }
  }

  // Compute averages for all groups
  const computeAvg = (group: any) => ({
    ...group,
    avg_score: group.avg_score_count > 0 
      ? Math.round((group.avg_score_sum / group.avg_score_count) * 10) / 10 
      : null,
  });

  return {
    results,
    groupings: {
      byCollege: Object.values(byCollege).map(computeAvg),
      byDepartment: Object.values(byDepartment).map(computeAvg),
      bySemester: Object.values(bySemester).map(computeAvg),
      byLevel: Array.from(levelGroups.values())
        .map(computeAvg)
        .sort((a: any, b: any) => {
          const aNum = parseInt(a.level);
          const bNum = parseInt(b.level);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return String(a.level).localeCompare(String(b.level));
        }),
    },
  };
};