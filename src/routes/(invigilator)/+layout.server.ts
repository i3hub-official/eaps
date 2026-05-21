import { requireInvigilator } from '$lib/server/auth/guards.js';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await requireInvigilator(cookies);
  return { user };
};
