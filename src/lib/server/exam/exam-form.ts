// src/lib/server/exam/exam-form.ts
import type { ExamFormResult } from '$lib/types/exam.js';

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

// Calculate marks per question based on total exam marks (always 70)
function calculateMarksPerQuestion(totalMarks: number, questionsToPresent: number): number {
  if (questionsToPresent <= 0) return 0;
  return totalMarks / questionsToPresent;
}

export function parseExamForm(formData: FormData): ExamFormResult {
  const errors: Record<string, string> = {};

  const courseId          = str(formData, 'courseId');
  const title             = str(formData, 'title');
  const instructions      = str(formData, 'instructions') || null;
  const durationMinutes   = num(formData, 'durationMinutes', 60);
  
  // FIXED: Exam is ALWAYS 70 marks at MOUAU
  const totalMarks        = 70; // Hardcoded - not from form
  const passMark          = num(formData, 'passMark', 28); // 40% of 70 = 28
  
  const session           = str(formData, 'session');
  const semester          = num(formData, 'semester', 1);
  const scheduledStart    = dateOrNull(formData, 'scheduledStart');
  const scheduledEnd      = dateOrNull(formData, 'scheduledEnd');
  const allowLateEntry    = formData.get('allowLateEntry')    === 'on';
  const lateEntryMinutes  = num(formData, 'lateEntryMinutes', 30);
  const randomizeQuestions = formData.get('randomizeQuestions') === 'on';
  const randomizeOptions  = formData.get('randomizeOptions')  === 'on';
  const questionsToPresent = num(formData, 'questionsToPresent', 35);
  const showResultAfter   = formData.get('showResultAfter')   === 'on';
  const maxViolations     = num(formData, 'maxViolations', 5);

  // Calculate marks per question (distribute 70 marks across all questions)
  const marksPerQuestion = calculateMarksPerQuestion(totalMarks, questionsToPresent);

  const levels = formData
    .getAll('levels')
    .map(v => Number(v))
    .filter(n => Number.isFinite(n));

  const departments = formData
    .getAll('departments')
    .map(v => v.toString().trim())
    .filter(Boolean);

  const department = departments.length > 0 ? departments.join(', ') : null;

  // ── Validation ────────────────────────────────────────────────────────────

  if (!courseId) errors.courseId = 'Select a course';
  if (!title)    errors.title    = 'Title is required';
  if (!session)  errors.session  = 'Session is required (e.g. 2025/2026)';

  if (semester !== 1 && semester !== 2) {
    errors.semester = 'Semester must be 1 or 2';
  }

  if (durationMinutes <= 0) {
    errors.durationMinutes = 'Duration must be greater than 0';
  }

  if (passMark < 0 || passMark > totalMarks) {
    errors.passMark = `Pass mark must be between 0 and ${totalMarks}`;
  }

  if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
    errors.scheduledEnd = 'End time must be after start time';
  }

  if (maxViolations <= 0) {
    errors.maxViolations = 'Max violations must be at least 1';
  }

  if (questionsToPresent < 0) {
    errors.questionsToPresent = 'Cannot be negative';
  }

  return {
    values: {
      courseId, title, instructions, durationMinutes, totalMarks, passMark,
      session, semester, scheduledStart, scheduledEnd, allowLateEntry,
      lateEntryMinutes, randomizeQuestions, randomizeOptions,
      questionsToPresent, showResultAfter, maxViolations, levels, department,
      marksPerQuestion,
    },
    errors,
  };
}