// src/routes/(student)/+layout.server.ts
import { requireStudent } from '$lib/server/auth/guards.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await requireStudent(cookies);
  return { user };
};
