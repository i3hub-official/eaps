import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    const dest: Record<string, string> = {
      student: '/dashboard',
      lecturer: '/lecturer/dashboard',
      invigilator: '/invigilator/dashboard',
      admin: '/admin/dashboard',
    };
    redirect(302, dest[locals.user.role] ?? '/login');
  }
  redirect(302, '/login');
};
