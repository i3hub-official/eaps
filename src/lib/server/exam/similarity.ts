// src/lib/server/exam/similarity.ts
// Post-exam answer similarity detection
// Uses raw SQL for performance across large student sets
// Algorithm: Jaccard similarity on answer vectors + identical wrong answer detection

import { sql } from '$lib/server/db/index.js';

export interface SimilarityPair {
  student_a_id: string;
  student_a_name: string;
  student_a_matric: string;
  student_b_id: string;
  student_b_name: string;
  student_b_matric: string;
  similarity_score: number;       // 0.0 – 1.0
  shared_answers: number;         // total matching answers
  shared_wrong_answers: number;   // matching WRONG answers (most incriminating)
  total_questions: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface SimilarityReport {
  exam_id: string;
  exam_title: string;
  course_code: string;
  total_students: number;
  pairs_analysed: number;
  flagged_pairs: SimilarityPair[];
  generated_at: string;
}

// Thresholds
const THRESHOLDS = {
  low:      0.70,   // 70% similarity
  medium:   0.80,   // 80%
  high:     0.90,   // 90%
  critical: 0.95,   // 95% — almost certainly copied
};

function getRiskLevel(score: number, sharedWrong: number): SimilarityPair['risk_level'] {
  // Matching wrong answers are more incriminating than matching right ones
  if (score >= THRESHOLDS.critical || sharedWrong >= 4) return 'critical';
  if (score >= THRESHOLDS.high     || sharedWrong >= 3) return 'high';
  if (score >= THRESHOLDS.medium   || sharedWrong >= 2) return 'medium';
  if (score >= THRESHOLDS.low)                          return 'low';
  return 'low';
}

// ─── Main analysis function ───────────────────────────────────────────────────

export async function analyseExamSimilarity(examId: string): Promise<SimilarityReport> {

  // 1. Get exam metadata
  const [examMeta] = await sql<{
    exam_title: string; course_code: string;
  }>(
    `SELECT e.title AS exam_title, c.code AS course_code
     FROM exams e JOIN courses c ON c.id = e.course_id
     WHERE e.id = $1`,
    [examId]
  );

  if (!examMeta) throw new Error('Exam not found');

  // 2. Build answer matrix — one row per student per question
  //    We use COALESCE so MCQ and FITB answers are in one column
  const answers = await sql<{
    session_id: string;
    student_id: string;
    student_name: string;
    matric_number: string;
    question_id: string;
    answer_key: string;          // option_id for MCQ, lowercased text for FITB
    is_correct: boolean | null;
  }>(
    `SELECT
       es.id AS session_id,
       es.student_id,
       u.full_name AS student_name,
       u.matric_number,
       sa.question_id,
       COALESCE(
         sa.selected_option::text,
         LOWER(TRIM(sa.text_answer))
       ) AS answer_key,
       sa.is_correct
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     JOIN student_answers sa ON sa.session_id = es.id
     WHERE es.exam_id = $1
       AND es.status IN ('submitted', 'force_submitted')
       AND (sa.selected_option IS NOT NULL OR sa.text_answer IS NOT NULL)`,
    [examId]
  );

  if (answers.length === 0) {
    return {
      exam_id: examId,
      exam_title: examMeta.exam_title,
      course_code: examMeta.course_code,
      total_students: 0,
      pairs_analysed: 0,
      flagged_pairs: [],
      generated_at: new Date().toISOString(),
    };
  }

  // 3. Group answers by student
  const studentMap = new Map<string, {
    id: string; name: string; matric: string;
    answers: Map<string, { key: string; correct: boolean | null }>;
  }>();

  for (const row of answers) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        id: row.student_id,
        name: row.student_name,
        matric: row.matric_number,
        answers: new Map(),
      });
    }
    studentMap.get(row.student_id)!.answers.set(row.question_id, {
      key: row.answer_key,
      correct: row.is_correct,
    });
  }

  const students = Array.from(studentMap.values());
  const totalStudents = students.length;

  // 4. Pairwise comparison — O(n²) but fast enough for typical exam sizes
  //    For 3k students, we'd push this to a background job
  const flaggedPairs: SimilarityPair[] = [];
  let pairsAnalysed = 0;

  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      pairsAnalysed++;
      const a = students[i];
      const b = students[j];

      // Find all questions both answered
      const commonQuestions = new Set(
        [...a.answers.keys()].filter(qid => b.answers.has(qid))
      );

      if (commonQuestions.size === 0) continue;

      let sharedAnswers = 0;
      let sharedWrong = 0;

      for (const qid of commonQuestions) {
        const ansA = a.answers.get(qid)!;
        const ansB = b.answers.get(qid)!;

        if (ansA.key === ansB.key) {
          sharedAnswers++;
          // Matching wrong answers — very suspicious
          if (ansA.correct === false && ansB.correct === false) {
            sharedWrong++;
          }
        }
      }

      // Jaccard-style similarity: shared / total unique answers considered
      const unionSize = commonQuestions.size;
      const similarity = sharedAnswers / unionSize;

      if (similarity >= THRESHOLDS.low || sharedWrong >= 2) {
        const riskLevel = getRiskLevel(similarity, sharedWrong);
        flaggedPairs.push({
          student_a_id: a.id,
          student_a_name: a.name,
          student_a_matric: a.matric,
          student_b_id: b.id,
          student_b_name: b.name,
          student_b_matric: b.matric,
          similarity_score: Math.round(similarity * 1000) / 1000,
          shared_answers: sharedAnswers,
          shared_wrong_answers: sharedWrong,
          total_questions: unionSize,
          risk_level: riskLevel,
        });
      }
    }
  }

  // Sort by risk desc, then similarity desc
  const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  flaggedPairs.sort((a, b) => {
    const riskDiff = riskOrder[b.risk_level] - riskOrder[a.risk_level];
    if (riskDiff !== 0) return riskDiff;
    return b.similarity_score - a.similarity_score;
  });

  // 5. Persist results to DB for later review
  await persistSimilarityResults(examId, flaggedPairs);

  return {
    exam_id: examId,
    exam_title: examMeta.exam_title,
    course_code: examMeta.course_code,
    total_students: totalStudents,
    pairs_analysed: pairsAnalysed,
    flagged_pairs: flaggedPairs,
    generated_at: new Date().toISOString(),
  };
}

// ─── Persist to DB ────────────────────────────────────────────────────────────

async function persistSimilarityResults(
  examId: string,
  pairs: SimilarityPair[]
): Promise<void> {
  if (pairs.length === 0) return;

  // Upsert into similarity_flags table (must exist in DB)
  await sql(
    `DELETE FROM similarity_flags WHERE exam_id = $1`,
    [examId]
  );

  if (pairs.length === 0) return;

  // Bulk insert
  const values = pairs.map((p, i) => {
    const base = i * 8;
    return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8})`;
  }).join(',');

  const params: unknown[] = [];
  for (const p of pairs) {
    params.push(
      examId,
      p.student_a_id, p.student_b_id,
      p.similarity_score,
      p.shared_answers, p.shared_wrong_answers,
      p.total_questions,
      p.risk_level
    );
  }

  await sql(
    `INSERT INTO similarity_flags
       (exam_id, student_a_id, student_b_id, similarity_score,
        shared_answers, shared_wrong_answers, total_questions, risk_level)
     VALUES ${values}`,
    params
  );
}

// ─── Fetch persisted results ──────────────────────────────────────────────────

export async function getSimilarityReport(examId: string): Promise<SimilarityPair[]> {
  return sql<SimilarityPair>(
    `SELECT
       sf.student_a_id, ua.full_name AS student_a_name, ua.matric_number AS student_a_matric,
       sf.student_b_id, ub.full_name AS student_b_name, ub.matric_number AS student_b_matric,
       sf.similarity_score, sf.shared_answers, sf.shared_wrong_answers,
       sf.total_questions, sf.risk_level
     FROM similarity_flags sf
     JOIN users ua ON ua.id = sf.student_a_id
     JOIN users ub ON ub.id = sf.student_b_id
     WHERE sf.exam_id = $1
     ORDER BY
       CASE sf.risk_level
         WHEN 'critical' THEN 4 WHEN 'high' THEN 3
         WHEN 'medium' THEN 2 ELSE 1
       END DESC,
       sf.similarity_score DESC`,
    [examId]
  );
}