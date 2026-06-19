// src/routes/admin/users/create/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);
  return {};
};