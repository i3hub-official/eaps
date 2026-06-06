// src/lib/server/exam/similarity.ts
//
// Answer-pattern similarity analysis for academic integrity.
// This module is independent of the face library — it compares
// student answer choices, not face embeddings.
//
// Persists results to the `face_similarity` table (see Prisma schema).

import { prisma } from '$lib/server/db/index.js';
import { sql }    from '$lib/server/db/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimilarityPair {
  student_a_id:         string;
  student_a_name:       string;
  student_a_matric:     string;
  student_b_id:         string;
  student_b_name:       string;
  student_b_matric:     string;
  similarity_score:     number;        // 0.0 – 1.0  (Jaccard over common questions)
  shared_answers:       number;        // total matching answer keys
  shared_wrong_answers: number;        // matching WRONG answers — most incriminating
  total_questions:      number;
  risk_level:           'low' | 'medium' | 'high' | 'critical';
}

export interface SimilarityReport {
  exam_id:        string;
  exam_title:     string;
  course_code:    string;
  total_students: number;
  pairs_analysed: number;
  flagged_pairs:  SimilarityPair[];
  generated_at:   string;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
  low:      0.70,
  medium:   0.80,
  high:     0.90,
  critical: 0.95,
} as const;

function getRiskLevel(
  score: number,
  sharedWrong: number
): SimilarityPair['risk_level'] {
  if (score >= THRESHOLDS.critical || sharedWrong >= 4) return 'critical';
  if (score >= THRESHOLDS.high     || sharedWrong >= 3) return 'high';
  if (score >= THRESHOLDS.medium   || sharedWrong >= 2) return 'medium';
  if (score >= THRESHOLDS.low)                          return 'low';
  return 'low';
}

// ─── Main analysis ────────────────────────────────────────────────────────────

export async function analyseExamSimilarity(examId: string): Promise<SimilarityReport> {

  // 1. Exam metadata via Prisma
  const exam = await prisma.exam.findUnique({
    where:  { id: examId },
    select: { title: true, course: { select: { code: true } } },
  });

  if (!exam) throw new Error('Exam not found');

  // 2. Answer matrix — one row per (student, question)
  //    Using raw sql() for the COALESCE across MCQ + FITB answer types
  const answers = await sql<{
    session_id:   string;
    student_id:   string;
    student_name: string;
    matric_number: string;
    question_id:  string;
    answer_key:   string;           // option UUID for MCQ, lowercased text for FITB
    is_correct:   boolean | null;
  }>(
    `SELECT
       es.id            AS session_id,
       es.student_id,
       u.full_name      AS student_name,
       u.matric_number,
       sa.question_id,
       COALESCE(
         sa.selected_option::text,
         LOWER(TRIM(sa.text_answer))
       )                AS answer_key,
       sa.is_correct
     FROM exam_sessions  es
     JOIN users          u  ON u.id  = es.student_id
     JOIN student_answers sa ON sa.session_id = es.id
     WHERE es.exam_id = $1
       AND es.status IN ('submitted', 'force_submitted')
       AND (sa.selected_option IS NOT NULL OR sa.text_answer IS NOT NULL)`,
    [examId]
  );

  if (answers.length === 0) {
    return {
      exam_id:        examId,
      exam_title:     exam.title,
      course_code:    exam.course.code,
      total_students: 0,
      pairs_analysed: 0,
      flagged_pairs:  [],
      generated_at:   new Date().toISOString(),
    };
  }

  // 3. Group by student
  const studentMap = new Map<string, {
    id:      string;
    name:    string;
    matric:  string;
    answers: Map<string, { key: string; correct: boolean | null }>;
  }>();

  for (const row of answers) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        id:      row.student_id,
        name:    row.student_name,
        matric:  row.matric_number,
        answers: new Map(),
      });
    }
    studentMap.get(row.student_id)!.answers.set(row.question_id, {
      key:     row.answer_key,
      correct: row.is_correct,
    });
  }

  const students       = Array.from(studentMap.values());
  const totalStudents  = students.length;
  const flaggedPairs:  SimilarityPair[] = [];
  let   pairsAnalysed  = 0;

  // 4. O(n²) pairwise comparison
  //    Acceptable for typical exam cohort sizes (< 500).
  //    For larger cohorts push this to a background job / queue.
  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      pairsAnalysed++;
      const a = students[i];
      const b = students[j];

      const commonQuestions = [...a.answers.keys()].filter(qid => b.answers.has(qid));
      if (commonQuestions.length === 0) continue;

      let sharedAnswers = 0;
      let sharedWrong   = 0;

      for (const qid of commonQuestions) {
        const ansA = a.answers.get(qid)!;
        const ansB = b.answers.get(qid)!;
        if (ansA.key === ansB.key) {
          sharedAnswers++;
          if (ansA.correct === false && ansB.correct === false) sharedWrong++;
        }
      }

      // Jaccard: shared / total questions both answered
      const similarity = sharedAnswers / commonQuestions.length;

      if (similarity >= THRESHOLDS.low || sharedWrong >= 2) {
        flaggedPairs.push({
          student_a_id:         a.id,
          student_a_name:       a.name,
          student_a_matric:     a.matric,
          student_b_id:         b.id,
          student_b_name:       b.name,
          student_b_matric:     b.matric,
          similarity_score:     Math.round(similarity * 1000) / 1000,
          shared_answers:       sharedAnswers,
          shared_wrong_answers: sharedWrong,
          total_questions:      commonQuestions.length,
          risk_level:           getRiskLevel(similarity, sharedWrong),
        });
      }
    }
  }

  // Sort: risk desc → similarity desc
  const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 } as const;
  flaggedPairs.sort((a, b) => {
    const rd = riskOrder[b.risk_level] - riskOrder[a.risk_level];
    return rd !== 0 ? rd : b.similarity_score - a.similarity_score;
  });

  // 5. Persist to DB
  await persistSimilarityResults(examId, flaggedPairs);

  return {
    exam_id:        examId,
    exam_title:     exam.title,
    course_code:    exam.course.code,
    total_students: totalStudents,
    pairs_analysed: pairsAnalysed,
    flagged_pairs:  flaggedPairs,
    generated_at:   new Date().toISOString(),
  };
}

// ─── Persist ──────────────────────────────────────────────────────────────────
// Writes to the `face_similarity` table (Prisma model: FaceSimilarity).
// Note: this table stores ANSWER similarity — the "face" prefix is the
// Prisma model name from the schema; the content is answer-pattern data.

async function persistSimilarityResults(
  examId: string,
  pairs: SimilarityPair[]
): Promise<void> {
  // Wipe previous run for this exam
  await prisma.faceSimilarity.deleteMany({ where: { examId } });

  if (pairs.length === 0) return;

  await prisma.faceSimilarity.createMany({
    data: pairs.map(p => ({
      examId:             examId,
      studentAId:         p.student_a_id,
      studentBId:         p.student_b_id,
      similarityScore:    p.similarity_score,
      sharedAnswers:      p.shared_answers,
      sharedWrongAnswers: p.shared_wrong_answers,
      totalQuestions:     p.total_questions,
      riskLevel:          p.risk_level,
    })),
    skipDuplicates: true,
  });
}

// ─── Fetch persisted results ──────────────────────────────────────────────────

export async function getSimilarityReport(examId: string): Promise<SimilarityPair[]> {
  const rows = await prisma.faceSimilarity.findMany({
    where:   { examId },
    include: {
      studentA: { select: { fullName: true, matricNumber: true } },
      studentB: { select: { fullName: true, matricNumber: true } },
    },
    orderBy: [
      { riskLevel: 'desc' },
      { similarityScore: 'desc' },
    ],
  });

  return rows.map(r => ({
    student_a_id:         r.studentAId,
    student_a_name:       r.studentA.fullName,
    student_a_matric:     r.studentA.matricNumber ?? '',
    student_b_id:         r.studentBId,
    student_b_name:       r.studentB.fullName,
    student_b_matric:     r.studentB.matricNumber ?? '',
    similarity_score:     Number(r.similarityScore),
    shared_answers:       r.sharedAnswers,
    shared_wrong_answers: r.sharedWrongAnswers,
    total_questions:      r.totalQuestions,
    risk_level:           r.riskLevel as SimilarityPair['risk_level'],
  }));
}