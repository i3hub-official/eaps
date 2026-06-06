-- prisma/migrations/manual_extras.sql
--
-- Run ONCE after `pnpm prisma migrate dev` or `pnpm prisma db push`:
--   psql $DATABASE_URL_UNPOOLED -f prisma/migrations/manual_extras.sql
--
-- Contains only things Prisma cannot express:
--   • PostgreSQL extensions
--   • CHECK constraints with conditions
--   • PostgreSQL functions and triggers
--
-- The following are now handled by Prisma and REMOVED from here:
--   • face_similarity table
--   • face_verification_logs table
--   • password_resets table
--   • All indexes (Prisma handles these via @@index)

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid() on older PG

-- ─── CHECK constraint for face_similarity (enforces a < b) ────────────────────
-- This cannot be expressed in Prisma, so we apply it manually after migration.
-- The table itself is created by Prisma.

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_order_check'
  ) THEN
    ALTER TABLE face_similarity ADD CONSTRAINT student_order_check CHECK (student_a_id < student_b_id);
  END IF;
END $$;

-- ─── updated_at trigger function ──────────────────────────────────────────────
-- Generic trigger used by tables that need auto-updated_at.
-- Prisma handles this for its own models via @updatedAt, but this function
-- is kept for any future manual tables.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── compute_exam_result() ────────────────────────────────────────────────────
-- Called after a session is submitted to calculate and upsert the exam_results row.
-- Usage: SELECT compute_exam_result('<session-uuid>');
-- Called from: src/lib/server/exam/submit.ts

CREATE OR REPLACE FUNCTION compute_exam_result(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_session     exam_sessions%ROWTYPE;
  v_exam        exams%ROWTYPE;
  v_total       INT;
  v_answered    INT;
  v_correct     INT;
  v_score       NUMERIC;
  v_percentage  NUMERIC;
  v_grade       CHAR(2);
BEGIN
  -- Get session
  SELECT * INTO v_session FROM exam_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam session % not found', p_session_id;
  END IF;

  -- Get exam
  SELECT * INTO v_exam FROM exams WHERE id = v_session.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam % not found', v_session.exam_id;
  END IF;

  -- Calculate statistics
  SELECT COUNT(*)                        INTO v_total    FROM questions      WHERE exam_id   = v_exam.id;
  SELECT COUNT(*)                        INTO v_answered FROM student_answers WHERE session_id = p_session_id;
  SELECT COUNT(*)                        INTO v_correct  FROM student_answers WHERE session_id = p_session_id AND is_correct = true;
  SELECT COALESCE(SUM(marks_earned), 0)  INTO v_score    FROM student_answers WHERE session_id = p_session_id;

  -- Calculate percentage
  v_percentage := CASE
    WHEN v_exam.total_marks > 0
    THEN ROUND((v_score / v_exam.total_marks) * 100, 2)
    ELSE 0
  END;

  -- Determine grade based on Nigerian university system
  v_grade := CASE
    WHEN v_percentage >= 90 THEN 'A'
    WHEN v_percentage >= 80 THEN 'B'
    WHEN v_percentage >= 65 THEN 'C'
    WHEN v_percentage >= 50 THEN 'D'
    WHEN v_percentage >= 40 THEN 'E'
    ELSE                          'F'
  END;

  -- Insert or update exam result
  INSERT INTO exam_results (
    session_id,        student_id,          exam_id,
    total_questions,   answered,            correct,
    score,             percentage,          passed,
    grade,             violation_count,     time_taken_secs,
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
    v_percentage >= v_exam.pass_mark,
    v_grade,
    v_session.violation_count,
    EXTRACT(EPOCH FROM (v_session.submitted_at - v_session.started_at))::INT,
    v_session.submitted_at
  )
  ON CONFLICT (session_id) DO UPDATE SET
    total_questions  = EXCLUDED.total_questions,
    answered         = EXCLUDED.answered,
    correct          = EXCLUDED.correct,
    score            = EXCLUDED.score,
    percentage       = EXCLUDED.percentage,
    passed           = EXCLUDED.passed,
    grade            = EXCLUDED.grade,
    violation_count  = EXCLUDED.violation_count,
    time_taken_secs  = EXCLUDED.time_taken_secs,
    submitted_at     = EXCLUDED.submitted_at;
END;
$$ LANGUAGE plpgsql;

-- ─── compute_face_similarity() ────────────────────────────────────────────────
-- Calculates answer pattern similarity between all pairs of students in an exam.
-- Usage: SELECT compute_face_similarity('<exam-uuid>');
-- Called from: src/lib/server/exam/similarity.ts

CREATE OR REPLACE FUNCTION compute_face_similarity(p_exam_id UUID)
RETURNS VOID AS $$
DECLARE
  v_students UUID[];
  v_student_a UUID;
  v_student_b UUID;
  v_total_questions INT;
BEGIN
  -- Get all students who took this exam
  SELECT ARRAY_AGG(student_id ORDER BY student_id)
  INTO v_students
  FROM exam_sessions
  WHERE exam_id = p_exam_id AND status = 'submitted';

  IF array_length(v_students, 1) < 2 THEN
    RETURN; -- Not enough students for comparison
  END IF;

  -- Get total questions count
  SELECT COUNT(*) INTO v_total_questions FROM questions WHERE exam_id = p_exam_id;

  -- Clear existing similarity records for this exam
  DELETE FROM face_similarity WHERE exam_id = p_exam_id;

  -- Calculate similarity for each pair
  FOR i IN 1..array_length(v_students, 1) LOOP
    v_student_a := v_students[i];
    
    FOR j IN i+1..array_length(v_students, 1) LOOP
      v_student_b := v_students[j];
      
      INSERT INTO face_similarity (
        exam_id,
        student_a_id,
        student_b_id,
        similarity_score,
        shared_answers,
        shared_wrong_answers,
        total_questions,
        risk_level
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
          WHEN shared_correct::NUMERIC / v_total_questions > 0.8 THEN 'critical'
          WHEN shared_correct::NUMERIC / v_total_questions > 0.6 THEN 'high'
          WHEN shared_correct::NUMERIC / v_total_questions > 0.4 THEN 'medium'
          ELSE 'low'
        END
      FROM (
        SELECT
          COUNT(*) FILTER (WHERE a.is_correct = true AND b.is_correct = true) as shared_correct,
          COUNT(*) FILTER (WHERE a.is_correct = false AND b.is_correct = false) as shared_wrong
        FROM student_answers a
        JOIN student_answers b ON a.question_id = b.question_id
        WHERE a.session_id IN (SELECT id FROM exam_sessions WHERE exam_id = p_exam_id AND student_id = v_student_a)
          AND b.session_id IN (SELECT id FROM exam_sessions WHERE exam_id = p_exam_id AND student_id = v_student_b)
          AND a.question_id = b.question_id
      ) stats;
      
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─── Optional: Create trigger for face_similarity updated_at (if needed) ──────
-- Uncomment if face_similarity gets an updated_at column in the future
-- 
-- CREATE TRIGGER trigger_face_similarity_updated_at
--   BEFORE UPDATE ON face_similarity
--   FOR EACH ROW
--   EXECUTE FUNCTION fn_set_updated_at();