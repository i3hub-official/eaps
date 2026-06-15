// src/lib/types/exam.ts

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type SessionStatus = 'not_started' | 'in_progress' | 'submitted' | 'flagged' | 'force_submitted';
export type QuestionType = 'mcq' | 'fill_in_the_blank' | 'essay' | 'true_false';
export type FlagType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'devtools_open'
  | 'screenshot_attempt'
  | 'multiple_faces'
  | 'no_face_detected'
  | 'face_mismatch'
  | 'invigilator_manual';

export type ViolationAction = 'warning' | 'invigilator_alerted' | 'exam_paused' | 'auto_submitted';

// ─── Questions (client-facing — no correct answers during a live exam) ───────

export interface QuestionOption {
  id: string;
  optionText: string;
  displayIndex: number;
}

export interface FitbAnswerClient {
  acceptedAnswer: string;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  body: string;
  topic: string | null;
  imageUrl: string | null;
  marks: number;
  displayIndex: number;
  options: QuestionOption[];
  /** Empty during a live exam — only populated on post-result review pages. */
  fitbAnswers: FitbAnswerClient[];
}

// ─── Student answers ──────────────────────────────────────────────────────────

export interface StudentAnswerInput {
  questionId?: string;
  selectedOption: string | null;
  textAnswer: string | null;
}

// ─── Exam config (client view of an Exam) ──────────────────────────────────────

export interface ExamConfig {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  totalMarks: number;
  passMark: number;
  status: ExamStatus;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  showResultAfter: boolean;
  maxViolations: number;
}

// ─── Session state ───────────────────────────────────────────────────────────

export interface ExamSessionState {
  id: string;
  examId: string;
  studentId: string;
  status: SessionStatus;
  startedAt: Date | null;
  submittedAt: Date | null;
  timeRemainingSecs: number;
  violationCount: number;
  score: number | null;
  currentQuestionIndex?: number;
}

// ─── Violations ──────────────────────────────────────────────────────────────

export interface Violation {
  id: string;
  sessionId: string;
  flagType: FlagType;
  actionTaken: ViolationAction | null;
  note: string | null;
  flaggedAt: Date;
}

// ─── Full payload sent from the server to the exam page ───────────────────────

export interface ExamPayload {
  exam: ExamConfig;
  session: ExamSessionState;
  questions: Question[];
  savedAnswers: StudentAnswerInput[];
  serverTime: Date;
  watermarkText: string;
    /** The student's enrolled face descriptor, for FaceMonitor's live comparison. */
  enrolledFaceDescriptor: number[] | null;
}

export interface ExamFormValues {
  courseId: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  totalMarks: number;
  passMark: number;
  session: string;
  semester: number;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  allowLateEntry: boolean;
  lateEntryMinutes: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questionsToPresent: number;
  showResultAfter: boolean;
  maxViolations: number;
  levels: number[];
  department: string | null;
}

export interface ExamFormResult {
  values: ExamFormValues;
  errors: Record<string, string>;
}