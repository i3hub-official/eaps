import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth/password.js';
import {
  loadCreatePageData,
  parseBaseFields,
  resolveCollegeId,
  checkEmailUnique,
  checkProtectedEmail,
} from '$lib/server/admin/create-user.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);
  return loadCreatePageData();
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    await requireAdmin(locals.user);
    const prisma = await getPrismaClient();
    const fd     = await request.formData();
    const get    = (k: string) => String(fd.get(k) ?? '').trim();

    const base = parseBaseFields(fd);
    if ('error' in base) return base.error;

    const protectedErr = checkProtectedEmail(base.email);
    if (protectedErr) return protectedErr;

    const departmentId = get('department_id') || null;
    const collegeIdRaw = get('college_id') || null;

    const emailErr = await checkEmailUnique(base.email);
    if (emailErr) return emailErr;

    const collegeId    = await resolveCollegeId(departmentId, collegeIdRaw);
    const passwordHash = await hashPassword(base.password);

    const user = await prisma.user.create({
      data: {
        fullName:     base.fullName,
        email:        base.email,
        passwordHash,
        role:         'invigilator',
        phone:        base.phone,
        staffId:      base.staffId,
        collegeId,
        departmentId,
        isActive:     true,
      },
    });

    redirect(303, `/admin/users/${user.id}`);
  },
};