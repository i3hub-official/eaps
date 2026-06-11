// src/routes/api/admin/semesters/advance/+server.ts
//
// POST /api/admin/semesters/advance
//
// Call this from:
//   • A cron job (e.g. node-cron, Vercel cron, or a daily GitHub Action)
//   • Manually from the admin panel
//
// It will:
//   1. Check if the current active semester's endDate has passed
//   2. If yes — close it, open the next one (creating the row if needed)
//   3. Return { advanced, current }

import { json }              from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { requireAdmin }       from '$lib/server/auth/guards.js';
import { advanceSemesterIfDue } from '$lib/server/academic/semester.js';

export const POST: RequestHandler = async ({ locals }) => {
  requireAdmin(locals.user);
  const result = await advanceSemesterIfDue();
  return json(result);
};