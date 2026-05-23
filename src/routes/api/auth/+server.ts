// src/routes/api/auth/+server.ts
// Session validation endpoint — used by external clients or health checks
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ authenticated: false }, { status: 401 });
  const { passwordHash: _, ...safeUser } = locals.user;
  return json({ authenticated: true, user: safeUser });
};