// src/lib/server/academic/semester.ts
//
// Single source of truth for the active academic semester.
//
// Priority:
//   1. AcademicSemester row with isActive = true  (admin-controlled)
//   2. Date-based fallback  (so the app works before the first row is seeded)
//
// The fallback matches MOUAU's calendar:
//   Sep – Jan  → Semester 1
//   Feb – Jul  → Semester 2
//   Session    → Sep–Aug academic year boundary

import { prisma } from '$lib/server/db/index.js';

export interface ActiveSemester {
  session:  string;   // e.g. "2025/2026"
  semester: number;   // 1 or 2
  label:    string;   // e.g. "First Semester 2025/2026"
  regOpen:  boolean;  // whether student registration is globally open
  /** true when the value came from the DB, false when it's the date fallback */
  fromDb:   boolean;
}

// ─── DB lookup ────────────────────────────────────────────────────────────────

export async function getActiveSemester(): Promise<ActiveSemester> {
  const row = await prisma.academicSemester.findFirst({
    where: { isActive: true },
    select: { session: true, semester: true, label: true, regOpen: true },
  });

  if (row) {
    return {
      session:  row.session,
      semester: row.semester,
      label:    row.label ?? semesterLabel(row.session, row.semester),
      regOpen:  row.regOpen,
      fromDb:   true,
    };
  }

  // Fallback — derive from current date
  const session  = deriveSession();
  const semester = deriveSemester();
  return {
    session,
    semester,
    label:   semesterLabel(session, semester),
    regOpen: true,   // assume open when not configured
    fromDb:  false,
  };
}

// ─── Auto-advance (call from a cron route or admin action) ────────────────────
//
// Deactivates the current active semester and activates the next one IF its
// startDate has been reached.  Creates the next row automatically when needed.
//
// Call: await advanceSemesterIfDue()
// Safe to call repeatedly — idempotent.

export async function advanceSemesterIfDue(): Promise<{ advanced: boolean; current: ActiveSemester }> {
  const now = new Date();

  // Find the active row
  const active = await prisma.academicSemester.findFirst({
    where: { isActive: true },
  });

  if (!active) {
    // Nothing configured — seed the first row from date logic
    const session  = deriveSession();
    const semester = deriveSemester();
    const { start, end } = semesterDateRange(session, semester);
    await prisma.academicSemester.upsert({
      where:  { session_semester: { session, semester } },
      update: { isActive: true, regOpen: true },
      create: {
        session, semester,
        label:     semesterLabel(session, semester),
        startDate: start,
        endDate:   end,
        isActive:  true,
        regOpen:   true,
      },
    });
    return { advanced: false, current: await getActiveSemester() };
  }

  // Has the active semester ended?
  if (now < active.endDate) {
    return { advanced: false, current: await getActiveSemester() };
  }

  // Compute next semester
  const { session: nextSession, semester: nextSemester } = nextPeriod(active.session, active.semester);
  const { start, end } = semesterDateRange(nextSession, nextSemester);

  await prisma.$transaction([
    // Close current
    prisma.academicSemester.update({
      where:  { id: active.id },
      data:   { isActive: false },
    }),
    // Open next (create if missing)
    prisma.academicSemester.upsert({
      where:  { session_semester: { session: nextSession, semester: nextSemester } },
      update: { isActive: true, startDate: start, endDate: end },
      create: {
        session:   nextSession,
        semester:  nextSemester,
        label:     semesterLabel(nextSession, nextSemester),
        startDate: start,
        endDate:   end,
        isActive:  true,
        regOpen:   true,
      },
    }),
  ]);

  return { advanced: true, current: await getActiveSemester() };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function semesterLabel(session: string, semester: number): string {
  const ordinal = semester === 1 ? 'First' : 'Second';
  return `${ordinal} Semester ${session}`;
}

/** Sep–Jan → Sem 1, Feb–Aug → Sem 2 */
function deriveSemester(): number {
  const m = new Date().getMonth() + 1; // 1-indexed
  return m >= 9 || m <= 1 ? 1 : 2;
}

/** Sep of year N starts session "N/N+1" */
function deriveSession(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  // Sep–Dec: current year starts the session
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function nextPeriod(session: string, semester: number): { session: string; semester: number } {
  if (semester === 1) return { session, semester: 2 };
  // semester 2 ends → new session
  const startYear = parseInt(session.split('/')[0], 10);
  const nextYear  = startYear + 1;
  return { session: `${nextYear}/${nextYear + 1}`, semester: 1 };
}

/**
 * Default date ranges for a semester.
 * Sem 1: 1 Sep – 31 Jan (next calendar year)
 * Sem 2: 1 Feb – 31 Jul
 */
function semesterDateRange(session: string, semester: number): { start: Date; end: Date } {
  const startYear = parseInt(session.split('/')[0], 10);
  if (semester === 1) {
    return {
      start: new Date(`${startYear}-09-01T00:00:00Z`),
      end:   new Date(`${startYear + 1}-01-31T23:59:59Z`),
    };
  }
  return {
    start: new Date(`${startYear + 1}-02-01T00:00:00Z`),
    end:   new Date(`${startYear + 1}-07-31T23:59:59Z`),
  };
}