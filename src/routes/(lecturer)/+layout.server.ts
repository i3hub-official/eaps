import { requireLecturer } from '$lib/server/auth/guards.js';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await requireLecturer(cookies);
  return { user };
};
