import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireStudent } from '$lib/server/auth/guards.js';
import { saveFaceDescriptor, isFaceEnrolled } from '$lib/server/db/faces.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const EnrollSchema = z.object({
  descriptor: z
    .array(z.number().finite())
    .min(64,   'Descriptor too short — minimum 64 dimensions')
    .max(2048, 'Descriptor too long — maximum 2048 dimensions')
    .refine(arr => arr.every(v => !isNaN(v)), 'All descriptor values must be valid numbers'),
  photo: z
    .string()
    .startsWith('data:', 'Photo must be a base64 data URL')
    .optional(),
});

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user      = await requireStudent(locals.user);
    const prisma    = await getPrismaClient();
    const studentId = String(user.id);

    // Block dual enrollment
    const alreadyEnrolled = await isFaceEnrolled(studentId);
    if (alreadyEnrolled) {
      return json(
        { ok: false, error: 'Face already enrolled. Contact admin to reset.' },
        { status: 409 },
      );
    }

    const body   = await request.json().catch(() => null);
    const parsed = EnrollSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        { ok: false, error: 'Invalid enrollment data', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { descriptor, photo } = parsed.data;

    console.log('Received descriptor of dimension:', descriptor.length);

    await saveFaceDescriptor(studentId, descriptor, descriptor.length);

    if (photo) {
      await prisma.user.update({
        where: { id: studentId },
        data:  { photoUrl: photo },
      });
    }

    return json({
      ok:        true,
      message:   'Face enrolled successfully',
      dimension: descriptor.length,
    });

  } catch (err) {
    console.error('Face enrollment error:', err);
    error(500, err instanceof Error ? err.message : 'Enrollment failed');
  }
};