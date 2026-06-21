-- ============================================================
--  MOUAU eTEST PLATFORM — PostgreSQL Database Schema
--  Stack: SvelteKit + Node.js + PostgreSQL
--  Auth: Custom (no library)
-- ============================================================

-- ============================================================
--  ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'lecturer', 'invigilator', 'student');
CREATE TYPE exam_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE session_status AS ENUM ('not_started', 'in_progress', 'submitted', 'flagged', 'force_submitted');
CREATE TYPE question_type AS ENUM ('mcq', 'fill_in_the_blank');
CREATE TYPE flag_type AS ENUM (
  'tab_switch', 
  'window_blur', 
  'fullscreen_exit', 
  'copy_attempt', 
  'devtools_open',
  'screenshot_attempt',
  'multiple_faces',
  'no_face_detected',
  'invigilator_manual'
);
CREATE TYPE violation_action AS ENUM ('warning', 'invigilator_alerted', 'exam_paused', 'auto_submitted');

-- ============================================================
--  FACULTIES & DEPARTMENTS
-- ============================================================

CREATE TABLE faculties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id  UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  USERS (All roles in one table)
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matric_number   TEXT UNIQUE,                        -- students only
  staff_id        TEXT UNIQUE,                        -- staff only
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL,
  department_id   UUID REFERENCES departments(id),
  level           SMALLINT CHECK (level IN (100,200,300,400,500)), -- students
  photo_url       TEXT,                               -- for face verification
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);

-- ============================================================
--  AUTH SESSIONS (Custom auth)
-- ============================================================

CREATE TABLE auth_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  ip_address    INET,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

-- ============================================================
--  COURSES
-- ============================================================

CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID NOT NULL REFERENCES departments(id),
  code            TEXT NOT NULL UNIQUE,               -- e.g. PHY101
  title           TEXT NOT NULL,
  credit_units    SMALLINT DEFAULT 2,
  level           SMALLINT CHECK (level IN (100,200,300,400,500)),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Students registered for courses
CREATE TABLE course_registrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session     TEXT NOT NULL,                          -- e.g. "2024/2025"
  semester    SMALLINT CHECK (semester IN (1, 2)),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, course_id, session, semester)
);

-- ============================================================
--  EXAMS
-- ============================================================

CREATE TABLE exams (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id),
  created_by          UUID NOT NULL REFERENCES users(id),          -- lecturer
  title               TEXT NOT NULL,
  instructions        TEXT,
  duration_minutes    SMALLINT NOT NULL DEFAULT 60,
  total_marks         SMALLINT NOT NULL DEFAULT 100,
  pass_mark           SMALLINT DEFAULT 40,
  status              exam_status DEFAULT 'draft',
  scheduled_start     TIMESTAMPTZ,
  scheduled_end       TIMESTAMPTZ,
  allow_late_entry    BOOLEAN DEFAULT false,
  late_entry_minutes  SMALLINT DEFAULT 10,           -- grace period
  randomize_questions BOOLEAN DEFAULT true,
  randomize_options   BOOLEAN DEFAULT true,
  show_result_after   BOOLEAN DEFAULT false,         -- show score after submit
  max_violations      SMALLINT DEFAULT 5,            -- before auto-submit
  session             TEXT NOT NULL,                 -- "2024/2025"
  semester            SMALLINT CHECK (semester IN (1, 2)),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exams_course ON exams(course_id);
CREATE INDEX idx_exams_status ON exams(status);

-- ============================================================
--  QUESTION BANK
-- ============================================================

CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  type          question_type NOT NULL,
  body          TEXT NOT NULL,                       -- question text
  image_url     TEXT,                                -- optional image
  marks         SMALLINT DEFAULT 1,
  order_index   SMALLINT,                            -- default order
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_exam ON questions(exam_id);

-- MCQ Options (4 per question typically)
CREATE TABLE question_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text   TEXT NOT NULL,
  is_correct    BOOLEAN DEFAULT false,
  order_index   SMALLINT
);

-- Fill in the blank answers (can have multiple accepted answers)
CREATE TABLE fitb_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  accepted_answer TEXT NOT NULL,                     -- case-insensitive match
  is_primary    BOOLEAN DEFAULT false
);

-- ============================================================
--  EXAM SESSIONS (Per student attempt)
-- ============================================================

CREATE TABLE exam_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id             UUID NOT NULL REFERENCES exams(id),
  student_id          UUID NOT NULL REFERENCES users(id),
  invigilator_id      UUID REFERENCES users(id),
  status              session_status DEFAULT 'not_started',
  started_at          TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  time_remaining_secs INT,                           -- saved on disconnect
  ip_address          INET,
  device_info         TEXT,
  score               NUMERIC(5,2),
  is_graded           BOOLEAN DEFAULT false,
  violation_count     SMALLINT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

CREATE INDEX idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);

-- Per-student randomized question order
CREATE TABLE session_question_order (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  display_index   SMALLINT NOT NULL,                 -- the order shown to this student
  UNIQUE(session_id, question_id)
);

-- Per-student randomized option order (for MCQ)
CREATE TABLE session_option_order (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  option_id       UUID NOT NULL REFERENCES question_options(id),
  display_index   SMALLINT NOT NULL,
  UNIQUE(session_id, option_id)
);

-- ============================================================
--  STUDENT ANSWERS
-- ============================================================

CREATE TABLE student_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  selected_option UUID REFERENCES question_options(id),  -- MCQ
  text_answer     TEXT,                                   -- FITB
  is_correct      BOOLEAN,
  marks_earned    NUMERIC(4,2) DEFAULT 0,
  time_spent_secs INT,                                    -- time on this question
  answered_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, question_id)
);

CREATE INDEX idx_student_answers_session ON student_answers(session_id);

-- ============================================================
--  VIOLATIONS & FLAGS
-- ============================================================

CREATE TABLE violations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  flag_type       flag_type NOT NULL,
  action_taken    violation_action,
  note            TEXT,                              -- invigilator note
  flagged_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_violations_session ON violations(session_id);
CREATE INDEX idx_violations_type ON violations(flag_type);

-- ============================================================
--  INVIGILATOR ASSIGNMENTS
-- ============================================================

CREATE TABLE exam_invigilators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  invigilator_id  UUID NOT NULL REFERENCES users(id),
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, invigilator_id)
);

-- ============================================================
--  EXAM RESULTS & ANALYTICS
-- ============================================================

CREATE TABLE exam_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL UNIQUE REFERENCES exam_sessions(id),
  student_id          UUID NOT NULL REFERENCES users(id),
  exam_id             UUID NOT NULL REFERENCES exams(id),
  total_questions     SMALLINT,
  answered            SMALLINT,
  correct             SMALLINT,
  score               NUMERIC(5,2),
  percentage          NUMERIC(5,2),
  passed              BOOLEAN,
  grade               CHAR(2),                       -- A, B, C, D, F
  violation_count     SMALLINT DEFAULT 0,
  time_taken_secs     INT,
  submitted_at        TIMESTAMPTZ,
  generated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);

-- ============================================================
--  AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT,                                  -- e.g. "exam", "user"
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);

-- ============================================================
--  NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================
--  USEFUL VIEWS
-- ============================================================

-- Live exam dashboard view
CREATE VIEW live_exam_dashboard AS
SELECT
  es.id AS session_id,
  e.title AS exam_title,
  c.code AS course_code,
  u.full_name AS student_name,
  u.matric_number,
  d.name AS department,
  es.status,
  es.violation_count,
  es.started_at,
  es.time_remaining_secs,
  COUNT(v.id) AS total_flags
FROM exam_sessions es
JOIN exams e ON e.id = es.exam_id
JOIN courses c ON c.id = e.course_id
JOIN users u ON u.id = es.student_id
JOIN departments d ON d.id = u.department_id
LEFT JOIN violations v ON v.session_id = es.id
GROUP BY es.id, e.title, c.code, u.full_name, u.matric_number, d.name;

-- ============================================================
--  FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

SELECT COUNT(*) INTO v_total FROM session_question_order WHERE session_id = p_session_id;
  SELECT COUNT(*) INTO v_answered FROM student_answers WHERE session_id = p_session_id;
  SELECT COUNT(*) INTO v_correct FROM student_answers WHERE session_id = p_session_id AND is_correct = true;
  SELECT SUM(marks_earned) INTO v_score FROM student_answers WHERE session_id = p_session_id;

  v_percentage := (v_score / v_exam.total_marks) * 100;

  v_grade := CASE
    WHEN v_percentage >= 70 THEN 'A'
    WHEN v_percentage >= 60 THEN 'B'
    WHEN v_percentage >= 50 THEN 'C'
    WHEN v_percentage >= 45 THEN 'D'
    WHEN v_percentage >= 40 THEN 'E'
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
    score = EXCLUDED.score,
    percentage = EXCLUDED.percentage,
    passed = EXCLUDED.passed,
    grade = EXCLUDED.grade;
END;
$$ LANGUAGE plpgsql;
