// src/routes/(student)/+layout.server.ts
import { requireStudent } from '$lib/server/auth/guards.js';
import type { LayoutServerLoad } from './$types';


export const load: LayoutServerLoad = ({ locals }) => {
  const user = requireStudent(locals.user);
  return { user };
};
