-- prisma/migrations/manual_extras.sql
--
-- Run ONCE after `pnpm prisma migrate dev` or `pnpm prisma db push`:
--   psql $DATABASE_URL -f prisma/migrations/manual_extras.sql
--
-- Contains only things Prisma cannot express:
--   • Tables with non-standard constraints (face_similarity, face_verification_logs)
--   • PostgreSQL functions and triggers
--
-- face_descriptors is NOT here — it's in schema.prisma and handled by Prisma.

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid() on older PG

-- ─── Face similarity (academic integrity) ─────────────────────────────────────
-- Stores pairwise answer-pattern similarity between students in an exam.
-- Used by the invigilator dashboard to flag potential collusion.

CREATE TABLE IF NOT EXISTS password_resets (
  token       TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user    ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

CREATE TABLE IF NOT EXISTS face_similarity (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id              UUID         NOT NULL REFERENCES exams(id)  ON DELETE CASCADE,
  student_a_id         UUID         NOT NULL REFERENCES users(id),
  student_b_id         UUID         NOT NULL REFERENCES users(id),
  similarity_score     NUMERIC(5,3) NOT NULL,
  shared_answers       SMALLINT     NOT NULL DEFAULT 0,
  shared_wrong_answers SMALLINT     NOT NULL DEFAULT 0,
  total_questions      SMALLINT     NOT NULL DEFAULT 0,
  risk_level           TEXT         NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  generated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- always store pairs in a canonical order (a < b) to avoid duplicates
  CONSTRAINT student_order CHECK (student_a_id < student_b_id),
  UNIQUE (exam_id, student_a_id, student_b_id)
);

CREATE INDEX IF NOT EXISTS idx_face_similarity_exam     ON face_similarity(exam_id);
CREATE INDEX IF NOT EXISTS idx_face_similarity_risk     ON face_similarity(exam_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_face_similarity_score    ON face_similarity(exam_id, similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_face_similarity_students ON face_similarity(exam_id, student_a_id, student_b_id);

-- ─── Face verification logs ───────────────────────────────────────────────────
-- Audit trail of every verification attempt (pass or fail).
-- Useful for support investigations and replay attacks.

CREATE TABLE IF NOT EXISTS face_verification_logs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id          UUID         REFERENCES exams(id) ON DELETE SET NULL,  -- null = enrollment verify
  similarity_score NUMERIC(5,2),
  distance         NUMERIC(6,4), -- raw euclidean distance for debugging
  success          BOOLEAN      NOT NULL,
  ip_address       INET,
  user_agent       TEXT,
  verified_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_verify_logs_student ON face_verification_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_face_verify_logs_exam    ON face_verification_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_face_verify_logs_time    ON face_verification_logs(verified_at DESC);

-- ─── updated_at trigger function ──────────────────────────────────────────────
-- Generic trigger used by any table that needs auto-updated_at.
-- Prisma handles this for its own models via @updatedAt — this is for
-- the manual tables above if they ever get an updated_at column.

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
  SELECT * INTO v_session FROM exam_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam session % not found', p_session_id;
  END IF;

  SELECT * INTO v_exam FROM exams WHERE id = v_session.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam % not found', v_session.exam_id;
  END IF;

  SELECT COUNT(*)                        INTO v_total    FROM questions      WHERE exam_id   = v_exam.id;
  SELECT COUNT(*)                        INTO v_answered FROM student_answers WHERE session_id = p_session_id;
  SELECT COUNT(*)                        INTO v_correct  FROM student_answers WHERE session_id = p_session_id AND is_correct = true;
  SELECT COALESCE(SUM(marks_earned), 0)  INTO v_score    FROM student_answers WHERE session_id = p_session_id;

  v_percentage := CASE
    WHEN v_exam.total_marks > 0
    THEN ROUND((v_score / v_exam.total_marks) * 100, 2)
    ELSE 0
  END;

  v_grade := CASE
    WHEN v_percentage >= 90 THEN 'A'
    WHEN v_percentage >= 80 THEN 'B'
    WHEN v_percentage >= 65 THEN 'C'
    WHEN v_percentage >= 45 THEN 'D'
    WHEN v_percentage >= 25 THEN 'E'
    ELSE                          'F'
  END;

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