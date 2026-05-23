// src/routes/(admin)/+layout.server.ts
import type { LayoutServerLoad } from './';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = requireAdmin(locals.user);
  return { user };
};