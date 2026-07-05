import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth/password.js';
import {
  loadCreatePageData,
  parseBaseFields,
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

    const collegeIdRaw = get('college_id') || null;
    if (!collegeIdRaw) return fail(400, { error: 'College / Faculty is required for an Exam Officer.' });

    const emailErr = await checkEmailUnique(base.email);
    if (emailErr) return emailErr;

    const passwordHash = await hashPassword(base.password);

    const user = await prisma.user.create({
      data: {
        fullName:     base.fullName,
        email:        base.email,
        passwordHash,
        role:         'exam_officer',
        phone:        base.phone,
        staffId:      base.staffId,
        collegeId:    Number(collegeIdRaw),
        isActive:     true,
      },
    });

    redirect(303, `/admin/users/${user.id}`);
  },
};