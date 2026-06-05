// src/routes/api/admin/users/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdminOrApiKey } from '$lib/server/auth/guards.js';  // ← changed
import { getUserById } from '$lib/server/db/users.js';

export const GET: RequestHandler = async ({ params, locals, request }) => {  // ← added request
  const auth = await requireAdminOrApiKey({ locals, request }, 'read_users', `/api/admin/users/${params.id}`);
  if (!auth.ok) return auth.response;

  const user = await getUserById(params.id);

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 });
  }

  return json(user);
};