import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getUserById } from '$lib/server/db/users.js';

export const GET: RequestHandler = async ({ params, locals }) => {
  await requireAdmin(locals.user);
  
  const user = await getUserById(params.id);
  
  if (!user) {
    return json({ error: 'User not found' }, { status: 404 });
  }
  
  return json(user);
};