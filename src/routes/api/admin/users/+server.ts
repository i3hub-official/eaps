// src/routes/api/admin/users/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdminOrApiKey } from '$lib/server/auth/guards.js';
import { updateUser, deactivateUser, updatePasswordHash, listUsers } from '$lib/server/db/users.js';
import { hashPassword } from '$lib/server/auth/password.js';

// GET — list users (admin session OR api key)
export const GET: RequestHandler = async ({ request, locals }) => {
  const auth = await requireAdminOrApiKey({ locals, request }, 'read_users', '/api/admin/users');
  if (!auth.ok) return auth.response;

  const users = await listUsers();
  return json({ users });
};

// PATCH — update user (admin session OR api key)
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const auth = await requireAdminOrApiKey({ locals, request }, 'write_users', '/api/admin/users');
  if (!auth.ok) return auth.response;

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

// DELETE — deactivate user (admin session OR api key)
export const DELETE: RequestHandler = async ({ request, locals }) => {
  const auth = await requireAdminOrApiKey({ locals, request }, 'write_users', '/api/admin/users');
  if (!auth.ok) return auth.response;

  const { userId } = await request.json();
  if (!userId) error(400, 'userId required');
  await deactivateUser(userId);
  return json({ ok: true });
};