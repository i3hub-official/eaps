// src/lib/types/exam.ts

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type SessionStatus = 'not_started' | 'in_progress' | 'submitted' | 'flagged' | 'force_submitted';
import type { QuestionType } from '@prisma/client';
export type FlagType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'devtools_open'
  | 'screenshot_attempt'
  | 'multiple_faces'
  | 'no_face_detected'
  | 'invigilator_manual';

export type ViolationAction = 'warning' | 'invigilator_alerted' | 'exam_paused' | 'auto_submitted';

export interface Exam {
  id: string;
  course_id: string;
  course_code?: string;
  course_title?: string;
  created_by: string;
  title: string;
  instructions: string | null;
  duration_minutes: number;
  total_marks: number;
  pass_mark: number;
  status: ExamStatus;
  scheduled_start: Date | null;
  scheduled_end: Date | null;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_result_after: boolean;
  max_violations: number;
  session: string;
  semester: number;
  created_at: Date;
}


export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean;         // only visible server-side
  display_index?: number;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  status: SessionStatus;
  started_at: Date | null;
  submitted_at: Date | null;
  time_remaining_secs: number | null;
  violation_count: number;
  score: number | null;
}

export interface Violation {
  id: string;
  session_id: string;
  flag_type: FlagType;
  action_taken: ViolationAction | null;
  note: string | null;
  flagged_at: Date;
}

// What the student sees during exam (no correct answers)
export interface ExamPayload {
  exam: Exam;
  session: ExamSession;
  questions: Question[];
  saved_answers: Record<string, SavedAnswer>;
}

export interface ClientOption {
  id: string;
  option_text: string;
  display_index: number;
}
 
export interface ClientQuestion {
  id: string;
  exam_id: string;
  type: QuestionType;
  body: string;
  image_url: string | null;
  marks: number;
  display_index: number;
  options: ClientOption[];
}
 
export interface SavedAnswer {
  questionId: string;
  selectedOption: string | null;
  textAnswer: string | null;
}
 


// ── Question (what the server sends) ────────────────────────────────────────
export interface QuestionOption {
  id: string;
  optionText: string;
}

export interface FitbAnswer {
  id: string;
  acceptedAnswer: string;
  isPrimary: boolean;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  body: string;
  topic: string | null;
  imageUrl: string | null;
  marks: number;
  orderIndex: number | null;
  options: QuestionOption[];
  fitbAnswers: FitbAnswer[];
}

// ── Exam config ─────────────────────────────────────────────────────────────
export interface ExamConfig {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  passMark: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questionsToPresent: number;
  showResultAfter: boolean;
  maxViolations: number;
}

// ── Session state ───────────────────────────────────────────────────────────
export interface ExamSessionState {
  id: string;
  timeRemainingSecs: number;
  currentQuestionIndex: number;
}

// ── Student answer (what we collect) ────────────────────────────────────────
export interface StudentAnswerInput {
  questionId: string;
  selectedOption?: string | null;
  textAnswer?: string | null;
}

// ── Timer state ─────────────────────────────────────────────────────────────
export interface TimerState {
  total: number;
  remaining: number;
  warning: boolean;
  critical: boolean;
}

// ── Exam page data ──────────────────────────────────────────────────────────
export interface ExamPageData {
  examId: string;
  config: ExamConfig;
  session: ExamSessionState | null;
  questions: Question[];
  answers: StudentAnswerInput[];
  faceVerified: boolean;
  needsStart: boolean;
}

// ── View mode for questions ─────────────────────────────────────────────────
export type QuestionViewMode = 'single' | 'overview' | 'review';