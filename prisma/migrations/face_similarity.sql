-- prisma/migrations/face_similarity.sql
-- Run this manually: psql $DATABASE_URL -f prisma/migrations/manual_face_similarity.sql
-- These tables are NOT in Prisma schema (raw SQL only)

-- ── Face descriptors ──────────────────────────────────────────────────────────
-- Stores face-api.js 128-float descriptor as JSONB for fast retrieval
CREATE TABLE IF NOT EXISTS face_descriptors (
   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  descriptor   JSONB       NOT NULL,               -- float32[128] stored as JSON array
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_descriptors_student ON face_descriptors(student_id);

-- ── Similarity flags ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS face_similarity (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id             UUID        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_a_id        UUID        NOT NULL REFERENCES users(id),
  student_b_id        UUID        NOT NULL REFERENCES users(id),
  similarity_score    NUMERIC(5,3) NOT NULL,
  shared_answers      SMALLINT    NOT NULL DEFAULT 0,
  shared_wrong_answers SMALLINT   NOT NULL DEFAULT 0,
  total_questions     SMALLINT    NOT NULL DEFAULT 0,
  risk_level          TEXT        NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (exam_id, student_a_id, student_b_id)
);

CREATE TABLE IF NOT EXISTS face_verification_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) REFERENCES students(id),
    similarity_score DECIMAL(5,2),
    verification_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    success BOOLEAN,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_face_similarity_exam     ON face_similarity(exam_id);
CREATE INDEX IF NOT EXISTS idx_face_similarity_risk     ON face_similarity(exam_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_face_similarity_score    ON face_similarity(exam_id, similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_face_similarity_students ON face_similarity(exam_id, student_a_id, student_b_id);
CREATE INDEX IF NOT EXISTS idx_face_verification_logs_student ON face_verification_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_face_verification_logs_time ON face_verification_logs(verification_time);