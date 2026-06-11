// src/routes/api/admin/semesters/[id]/+server.ts
//
// PATCH /api/admin/semesters/[id]
//   Body (all optional):
//     { isActive, regOpen, startDate, endDate, label }
//
//   Setting isActive: true deactivates all others first (only one active at a time).

import { json }              from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma }             from '$lib/server/db/index.js';
import { requireAdmin }       from '$lib/server/auth/guards.js';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  requireAdmin(locals.user);

  const id   = parseInt(params.id ?? '', 10);
  if (isNaN(id)) return json({ error: 'Invalid id.' }, { status: 400 });

  const body = await request.json() as {
    isActive?:  boolean;
    regOpen?:   boolean;
    startDate?: string;
    endDate?:   string;
    label?:     string;
  };

  // Activating this row → deactivate all others
  if (body.isActive === true) {
    await prisma.academicSemester.updateMany({
      where: { isActive: true, NOT: { id } },
      data:  { isActive: false },
    });
  }

  const updated = await prisma.academicSemester.update({
    where: { id },
    data: {
      ...(body.isActive  !== undefined && { isActive:  body.isActive }),
      ...(body.regOpen   !== undefined && { regOpen:   body.regOpen }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate   !== undefined && { endDate:   new Date(body.endDate) }),
      ...(body.label     !== undefined && { label:     body.label }),
    },
  });

  return json(updated);
};

// ── DELETE ─────────────────────────────────────────────────────────────────────
export const DELETE: RequestHandler = async ({ params, locals }) => {
  requireAdmin(locals.user);
  const id = parseInt(params.id ?? '', 10);
  if (isNaN(id)) return json({ error: 'Invalid id.' }, { status: 400 });

  // Don't delete the active semester
  const row = await prisma.academicSemester.findUnique({ where: { id } });
  if (row?.isActive) {
    return json({ error: 'Cannot delete the active semester. Activate another one first.' }, { status: 409 });
  }

  await prisma.academicSemester.delete({ where: { id } });
  return json({ deleted: true });
};