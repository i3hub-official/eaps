// src/routes/admin/+layout.server.ts
import type { LayoutServerLoad } from './$types'; // was './'
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = await requireAdmin(locals.user);
  return { user };
};