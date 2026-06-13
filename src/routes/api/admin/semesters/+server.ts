// src/routes/api/admin/semesters/+server.ts
//
// GET  /api/admin/semesters        — list all semesters
// POST /api/admin/semesters        — create a new semester
// PATCH /api/admin/semesters/[id]  — update (activate, toggle regOpen, change dates)
//
// Also handles auto-advance: POST /api/admin/semesters/advance

import { json }         from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma }        from '$lib/server/db/index.js';
import { requireAdmin }  from '$lib/server/auth/guards.js';

// ── GET — list ────────────────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ locals }) => {
  requireAdmin(locals.user);

  const semesters = await prisma.academicSemester.findMany({
    orderBy: [{ session: 'desc' }, { semester: 'desc' }],
    include: { createdBy: { select: { fullName: true } } },
  });

  return json(semesters);
};

// ── POST — create ─────────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ request, locals }) => {
  requireAdmin(locals.user);
  const body = await request.json();

  const { session, semester, startDate, endDate, label, activate } = body as {
    session:   string;
    semester:  number;
    startDate: string;
    endDate:   string;
    label?:    string;
    activate?: boolean;
  };

  if (!session || ![1, 2].includes(semester) || !startDate || !endDate) {
    return json({ error: 'session, semester (1|2), startDate and endDate are required.' }, { status: 400 });
  }

  // If activating this new one, deactivate all others first
  if (activate) {
    await prisma.academicSemester.updateMany({
      where: { isActive: true },
      data:  { isActive: false },
    });
  }

  const row = await prisma.academicSemester.upsert({
    where:  { session_semester: { session, semester } },
    update: {
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      label:     label ?? undefined,
      isActive:  activate ?? false,
      createdById: locals.user!.id,
    },
    create: {
      session, semester,
      label:     label ?? `${semester === 1 ? 'First' : 'Second'} Semester ${session}`,
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      isActive:  activate ?? false,
      regOpen:   true,
      createdById: locals.user!.id,
    },
  });

  return json(row, { status: 201 });
};