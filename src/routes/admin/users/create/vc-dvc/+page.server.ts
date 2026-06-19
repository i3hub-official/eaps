// src/routes/admin/users/create/vc-dvc/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { parseBaseFields, checkEmailUnique } from '$lib/server/admin/create-user.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    await requireAdmin(locals.user);
    const prisma = await getPrismaClient();
    const fd     = await request.formData();

    const base = parseBaseFields(fd);
    if ('error' in base) return base.error;

    const emailErr = await checkEmailUnique(base.email);
    if (emailErr) return emailErr;

    const passwordHash = await hashPassword(base.password);

    const user = await prisma.user.create({
      data: {
        fullName:     base.fullName,
        email:        base.email,
        passwordHash,
        role:         'vc_dvc',
        phone:        base.phone,
        staffId:      base.staffId,
        isActive:     true,
      },
    });

    redirect(303, `/admin/users/${user.id}`);
  },
};