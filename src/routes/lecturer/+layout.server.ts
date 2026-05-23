// src/routes/(lecturer)/+layout.server.ts
import type { LayoutServerLoad } from './';
import { requireLecturer } from '$lib/server/auth/guards.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  return { user };
};