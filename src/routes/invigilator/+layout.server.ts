// src/routes/(invigilator)/+layout.server.ts
import type { LayoutServerLoad } from './';
import { requireInvigilator } from '$lib/server/auth/guards.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = requireInvigilator(locals.user);
  return { user };
};