-- prisma/migrations/manual_extras.sql
--
-- Run ONCE after `pnpm prisma migrate dev` or `pnpm prisma db push`:
--   psql $DATABASE_URL_UNPOOLED -f prisma/migrations/manual_extras.sql
--
-- Contains only things Prisma cannot express:
--   • PostgreSQL extensions
--   • CHECK constraints
--   • PostgreSQL functions and triggers

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── CHECK constraint for face_similarity (enforces a < b) ────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_order_check'
  ) THEN
    ALTER TABLE face_similarity
      ADD CONSTRAINT student_order_check CHECK (student_a_id < student_b_id);
  END IF;
END $$;

-- ─── updated_at trigger function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── compute_exam_result() ────────────────────────────────────────────────────
--
-- Called after a session is submitted to calculate and upsert the exam_results row.
-- Usage:  SELECT compute_exam_result('<session-uuid>');
-- Caller: src/lib/server/exam/grader.ts
--
-- Fixes vs the original version:
--   1. v_total  counts session_question_order (questions presented to THIS student),
--              not all questions in the exam bank.
--   2. v_percentage divides by the sum of marks on the student's actual question
--              set, not exam.total_marks — these differ whenever questionsToPresent
--              is used or when question mark values are not uniform.
--   3. v_passed uses percentage >= 40 (MOUAU minimum pass threshold).
--              The old version compared v_percentage to exam.pass_mark directly,
--              which is wrong because pass_mark is stored as raw marks (e.g. 40
--              out of 100) while v_percentage is already a 0–100 percentage.
--   4. Grade CASE now includes ELSE 'F' so failing students get a grade instead
--              of NULL.
--   5. Time taken is null-safe — no crash when started_at or submitted_at is NULL.

CREATE OR REPLACE FUNCTION public.compute_exam_result(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_session     exam_sessions%ROWTYPE;
  v_exam        exams%ROWTYPE;
  v_total       INT;
  v_answered    INT;
  v_correct     INT;
  v_score       NUMERIC;
  v_percentage  NUMERIC;
  v_grade       CHAR(2);
  v_passed      BOOLEAN;
  v_time_taken  INT;
BEGIN
  -- ── 1. Fetch session ────────────────────────────────────────────────────────
  SELECT * INTO v_session FROM exam_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam session % not found', p_session_id;
  END IF;

  -- ── 2. Fetch exam ───────────────────────────────────────────────────────────
  SELECT * INTO v_exam FROM exams WHERE id = v_session.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam % not found', v_session.exam_id;
  END IF;

  -- ── 3. Total questions presented to THIS student ────────────────────────────
  --
  --  IMPORTANT: use session_question_order, NOT questions WHERE exam_id = ...
  --  When questionsToPresent < total questions in the bank, each student gets
  --  a different subset. Dividing by the full bank size deflates everyone's score.
  SELECT COUNT(*)
    INTO v_total
    FROM session_question_order
   WHERE session_id = p_session_id;

  -- ── 4. Answered and correct counts ─────────────────────────────────────────
  SELECT COUNT(*)
    INTO v_answered
    FROM student_answers
   WHERE session_id = p_session_id;

  SELECT COUNT(*)
    INTO v_correct
    FROM student_answers
   WHERE session_id = p_session_id
     AND is_correct = true;

  -- ── 5. Raw score (sum of marks_earned) ─────────────────────────────────────
  SELECT COALESCE(SUM(marks_earned), 0)
    INTO v_score
    FROM student_answers
   WHERE session_id = p_session_id;

  -- ── 6. Percentage ───────────────────────────────────────────────────────────
  --
  --  Divide by the total achievable marks for the student's specific question set,
  --  not by exam.total_marks. These are identical only when every student gets
  --  every question AND all questions carry equal marks.
  SELECT ROUND(
    CASE
      WHEN COALESCE(SUM(q.marks), 0) > 0
        THEN (v_score / SUM(q.marks)) * 100
      ELSE 0
    END,
    2
  )
    INTO v_percentage
    FROM session_question_order sqo
    JOIN questions q ON q.id = sqo.question_id
   WHERE sqo.session_id = p_session_id;

  -- ── 7. MOUAU grade scale ────────────────────────────────────────────────────
  v_grade := CASE
    WHEN v_percentage >= 70 THEN 'A'
    WHEN v_percentage >= 60 THEN 'B'
    WHEN v_percentage >= 50 THEN 'C'
    WHEN v_percentage >= 45 THEN 'D'
    WHEN v_percentage >= 40 THEN 'E'
    ELSE 'F'   -- ← was missing; NULL grade for failing students in old version
  END;

  -- ── 8. Pass threshold ───────────────────────────────────────────────────────
  --
  --  MOUAU minimum pass = 40% of the student's presented marks.
  --  DO NOT use exam.pass_mark directly — it is stored as raw marks (e.g. 40),
  --  not as a percentage, so comparing it to v_percentage is wrong whenever
  --  total_marks ≠ 100.
  v_passed := v_percentage >= 40;

  -- ── 9. Time taken (null-safe) ───────────────────────────────────────────────
  v_time_taken := CASE
    WHEN v_session.started_at   IS NOT NULL
     AND v_session.submitted_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (v_session.submitted_at - v_session.started_at))::INT
    ELSE NULL
  END;

  -- ── 10. Upsert exam_results ─────────────────────────────────────────────────
  INSERT INTO exam_results (
    session_id,
    student_id,
    exam_id,
    total_questions,
    answered,
    correct,
    score,
    percentage,
    passed,
    grade,
    violation_count,
    time_taken_secs,
    submitted_at
  ) VALUES (
    p_session_id,
    v_session.student_id,
    v_session.exam_id,
    v_total,
    v_answered,
    v_correct,
    v_score,
    v_percentage,
    v_passed,
    v_grade,
    v_session.violation_count,
    v_time_taken,
    v_session.submitted_at
  )
  ON CONFLICT (session_id) DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    answered        = EXCLUDED.answered,
    correct         = EXCLUDED.correct,
    score           = EXCLUDED.score,
    percentage      = EXCLUDED.percentage,
    passed          = EXCLUDED.passed,
    grade           = EXCLUDED.grade,
    violation_count = EXCLUDED.violation_count,
    time_taken_secs = EXCLUDED.time_taken_secs,
    submitted_at    = EXCLUDED.submitted_at;
END;
$$;

-- ─── compute_face_similarity() ────────────────────────────────────────────────
--
-- Calculates answer-pattern similarity between all pairs of students in an exam.
-- Usage:  SELECT compute_face_similarity('<exam-uuid>');
-- Caller: src/lib/server/exam/similarity.ts
--
-- Note: "face_similarity" is the Prisma model name for this table.
--       The content is answer-pattern data, not biometric data.

CREATE OR REPLACE FUNCTION compute_face_similarity(p_exam_id UUID)
RETURNS VOID AS $$
DECLARE
  v_students        UUID[];
  v_student_a       UUID;
  v_student_b       UUID;
  v_total_questions INT;
BEGIN
  SELECT ARRAY_AGG(student_id ORDER BY student_id)
    INTO v_students
    FROM exam_sessions
   WHERE exam_id = p_exam_id
     AND status IN ('submitted', 'force_submitted');

  IF array_length(v_students, 1) < 2 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_total_questions FROM questions WHERE exam_id = p_exam_id;

  DELETE FROM face_similarity WHERE exam_id = p_exam_id;

  FOR i IN 1..array_length(v_students, 1) LOOP
    v_student_a := v_students[i];
    FOR j IN (i + 1)..array_length(v_students, 1) LOOP
      v_student_b := v_students[j];

      INSERT INTO face_similarity (
        exam_id, student_a_id, student_b_id,
        similarity_score, shared_answers, shared_wrong_answers,
        total_questions, risk_level
      )
      SELECT
        p_exam_id,
        v_student_a,
        v_student_b,
        shared_correct::NUMERIC / NULLIF(v_total_questions, 0),
        shared_correct,
        shared_wrong,
        v_total_questions,
        CASE
          WHEN shared_correct::NUMERIC / NULLIF(v_total_questions, 0) > 0.8 THEN 'critical'
          WHEN shared_correct::NUMERIC / NULLIF(v_total_questions, 0) > 0.6 THEN 'high'
          WHEN shared_correct::NUMERIC / NULLIF(v_total_questions, 0) > 0.4 THEN 'medium'
          ELSE 'low'
        END
      FROM (
        SELECT
          COUNT(*) FILTER (WHERE a.is_correct = true  AND b.is_correct = true)  AS shared_correct,
          COUNT(*) FILTER (WHERE a.is_correct = false AND b.is_correct = false)  AS shared_wrong
        FROM student_answers a
        JOIN student_answers b ON a.question_id = b.question_id
        WHERE a.session_id IN (
          SELECT id FROM exam_sessions WHERE exam_id = p_exam_id AND student_id = v_student_a
        )
          AND b.session_id IN (
          SELECT id FROM exam_sessions WHERE exam_id = p_exam_id AND student_id = v_student_b
        )
      ) stats;

    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RE-GRADE ALL ALREADY-SUBMITTED SESSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Run this block ONCE after replacing the function above.
-- It re-scores every already-submitted session so results reflect the fixes.
--
-- WARNING: overwrites existing exam_results rows.
-- Wrapped in a transaction — ROLLBACK if anything looks wrong.
--
-- To run just this block separately:
--   psql $DATABASE_URL_UNPOOLED -f regrade.sql
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

  -- Step 1: Reset answer-level grading so stale is_correct / marks_earned
  --         values from any previous (broken) grading run don't pollute the
  --         new calculation. The TypeScript grader sets these on next call,
  --         or compute_exam_result re-derives them from marks_earned directly.
  UPDATE student_answers sa
     SET is_correct   = NULL,
         marks_earned = 0
    FROM exam_sessions es
   WHERE sa.session_id = es.id
     AND es.status IN ('submitted', 'force_submitted');

  -- Step 2: Re-grade every submitted session via the fixed DB function.
  --         Errors are caught per-session so one bad row doesn't abort the rest.
  DO $$
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN
      SELECT id FROM exam_sessions
       WHERE status IN ('submitted', 'force_submitted')
       ORDER BY id
    LOOP
      BEGIN
        PERFORM compute_exam_result(r.id);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'compute_exam_result failed for session %: %', r.id, SQLERRM;
      END;
    END LOOP;
  END;
  $$;

  -- Step 3: Mark sessions as graded so the TypeScript grader skips them
  --         on the next scheduled run.
  UPDATE exam_sessions
     SET is_graded = true
   WHERE status IN ('submitted', 'force_submitted');

COMMIT;