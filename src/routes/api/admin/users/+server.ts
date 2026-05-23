// src/routes/api/admin/users/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { updateUser, deactivateUser, updatePasswordHash } from '$lib/server/db/users.js';
import { hashPassword } from '$lib/server/auth/password.js';

// PATCH — update user fields or reset password
export const PATCH: RequestHandler = async ({ request, locals }) => {
  requireAdmin(locals.user);
  const { userId, password, ...updates } = await request.json();
  if (!userId) error(400, 'userId required');

  if (password) {
    const hash = await hashPassword(password);
    await updatePasswordHash(userId, hash);
  }

  if (Object.keys(updates).length > 0) {
    await updateUser(userId, updates);
  }

  return json({ ok: true });
};

// DELETE — deactivate user
export const DELETE: RequestHandler = async ({ request, locals }) => {
  requireAdmin(locals.user);
  const { userId } = await request.json();
  if (!userId) error(400, 'userId required');
  await deactivateUser(userId);
  return json({ ok: true });
};