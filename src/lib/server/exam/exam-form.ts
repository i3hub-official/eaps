// src/lib/server/exam/exam-form.ts

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

function num(formData: FormData, key: string, fallback: number): number {
  const raw = formData.get(key);
  if (raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function str(formData: FormData, key: string): string {
  return (formData.get(key) ?? '').toString().trim();
}

function dateOrNull(formData: FormData, key: string): Date | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseExamForm(formData: FormData): ExamFormResult {
  const errors: Record<string, string> = {};

  const courseId = str(formData, 'courseId');
  const title = str(formData, 'title');
  const instructions = str(formData, 'instructions') || null;
  const durationMinutes = num(formData, 'durationMinutes', 60);
  const totalMarks = num(formData, 'totalMarks', 100);
  const passMark = num(formData, 'passMark', 40);
  const session = str(formData, 'session');
  const semester = num(formData, 'semester', 1);
  const scheduledStart = dateOrNull(formData, 'scheduledStart');
  const scheduledEnd = dateOrNull(formData, 'scheduledEnd');
  const allowLateEntry = formData.get('allowLateEntry') === 'on';
  const lateEntryMinutes = num(formData, 'lateEntryMinutes', 10);
  const randomizeQuestions = formData.get('randomizeQuestions') === 'on';
  const randomizeOptions = formData.get('randomizeOptions') === 'on';
  const questionsToPresent = num(formData, 'questionsToPresent', 0);
  const showResultAfter = formData.get('showResultAfter') === 'on';
  const maxViolations = num(formData, 'maxViolations', 5);

  const levels = formData.getAll('levels').map((v) => Number(v)).filter((n) => Number.isFinite(n));
  const departments = formData.getAll('departments').map((v) => v.toString().trim()).filter(Boolean);
  const department = departments.length > 0 ? departments.join(', ') : null;

  if (!courseId) errors.courseId = 'Select a course';
  if (!title) errors.title = 'Title is required';
  if (!session) errors.session = 'Session is required (e.g. 2025/2026)';
  if (semester !== 1 && semester !== 2) errors.semester = 'Semester must be 1 or 2';
  if (durationMinutes <= 0) errors.durationMinutes = 'Duration must be greater than 0';
  if (totalMarks <= 0) errors.totalMarks = 'Total marks must be greater than 0';
  if (passMark < 0 || passMark > totalMarks) errors.passMark = 'Pass mark must be between 0 and total marks';
  if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
    errors.scheduledEnd = 'End time must be after start time';
  }
  if (maxViolations <= 0) errors.maxViolations = 'Max violations must be at least 1';
  if (questionsToPresent < 0) errors.questionsToPresent = 'Cannot be negative';

  return {
    values: {
      courseId, title, instructions, durationMinutes, totalMarks, passMark,
      session, semester, scheduledStart, scheduledEnd, allowLateEntry, lateEntryMinutes,
      randomizeQuestions, randomizeOptions, questionsToPresent, showResultAfter,
      maxViolations, levels, department,
    },
    errors,
  };
}

export function toDatetimeLocal(date: Date | null | undefined): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}