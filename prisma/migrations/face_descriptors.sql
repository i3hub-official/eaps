-- prisma/face_descriptors.sql

-- Run this separately after prisma db push
-- face_descriptors is intentionally outside Prisma (raw storage)

-- ============================================================
--  FUNCTIONS (outside Prisma schema)
-- ============================================================


CREATE TABLE IF NOT EXISTS face_descriptors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  descriptor  JSONB NOT NULL,           -- 128-float array from face-api.js
  enrolled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_descriptors_student ON face_descriptors(student_id);


CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-compute exam result after submission
CREATE OR REPLACE FUNCTION compute_exam_result(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_session exam_sessions%ROWTYPE;
  v_exam exams%ROWTYPE;
  v_total INT;
  v_answered INT;
  v_correct INT;
  v_score NUMERIC;
  v_percentage NUMERIC;
  v_grade CHAR(2);
BEGIN
  SELECT * INTO v_session FROM exam_sessions WHERE id = p_session_id;
  SELECT * INTO v_exam FROM exams WHERE id = v_session.exam_id;

  SELECT COUNT(*) INTO v_total FROM questions WHERE exam_id = v_exam.id;
  SELECT COUNT(*) INTO v_answered FROM student_answers WHERE session_id = p_session_id;
  SELECT COUNT(*) INTO v_correct FROM student_answers WHERE session_id = p_session_id AND is_correct = true;
  SELECT COALESCE(SUM(marks_earned), 0) INTO v_score FROM student_answers WHERE session_id = p_session_id;

  v_percentage := CASE WHEN v_exam.total_marks > 0 THEN (v_score / v_exam.total_marks) * 100 ELSE 0 END;

  v_grade := CASE
    WHEN v_percentage >= 90 THEN 'A'
    WHEN v_percentage >= 80 THEN 'B'
    WHEN v_percentage >= 65 THEN 'C'
    WHEN v_percentage >= 45 THEN 'D'
    WHEN v_percentage >= 25 THEN 'E'
    ELSE 'F'
  END;

  INSERT INTO exam_results (
    session_id, student_id, exam_id,
    total_questions, answered, correct,
    score, percentage, passed, grade,
    violation_count, time_taken_secs, submitted_at
  ) VALUES (
    p_session_id, v_session.student_id, v_session.exam_id,
    v_total, v_answered, v_correct,
    v_score, v_percentage, v_percentage >= v_exam.pass_mark, v_grade,
    v_session.violation_count,
    EXTRACT(EPOCH FROM (v_session.submitted_at - v_session.started_at))::INT,
    v_session.submitted_at
  )
  ON CONFLICT (session_id) DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    answered = EXCLUDED.answered,
    correct = EXCLUDED.correct,
    score = EXCLUDED.score,
    percentage = EXCLUDED.percentage,
    passed = EXCLUDED.passed,
    grade = EXCLUDED.grade,
    violation_count = EXCLUDED.violation_count,
    time_taken_secs = EXCLUDED.time_taken_secs,
    submitted_at = EXCLUDED.submitted_at;
END;
$$ LANGUAGE plpgsql;