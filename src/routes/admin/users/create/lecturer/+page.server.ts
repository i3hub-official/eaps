import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
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
    const fd = await request.formData();
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const base = parseBaseFields(fd);
    if ('error' in base) return base.error;

    const protectedErr = checkProtectedEmail(base.email);
    if (protectedErr) return protectedErr;

    const departmentId = get('department_id') || null;
    const courseIds    = fd.getAll('course_ids').map(String).filter(Boolean);

    if (!departmentId) return fail(400, { error: 'Department is required for lecturers.' });
    if (courseIds.length === 0) return fail(400, { error: 'Assign at least one course.' });

    const emailErr = await checkEmailUnique(base.email);
    if (emailErr) return emailErr;

    const collegeId    = await resolveCollegeId(departmentId, null);
    const passwordHash = await hashPassword(base.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName:     base.fullName,
          email:        base.email,
          passwordHash,
          role:         'lecturer',
          phone:        base.phone,
          staffId:      base.staffId,
          collegeId,
          departmentId,
          isActive:     true,
        },
      });

      const validCourses = await tx.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, departmentId: true },
      });
      if (validCourses.length !== courseIds.length) {
        throw new Error('One or more selected courses are invalid.');
      }

      await tx.lecturerCourse.createMany({
        data: validCourses.map(c => ({
          lecturerId:   newUser.id,
          courseId:     c.id,
          departmentId: c.departmentId,
          assignedById: locals.user!.id,
        })),
        skipDuplicates: true,
      });

      return newUser;
    });

    redirect(303, `/admin/users/${user.id}`);
  },
};