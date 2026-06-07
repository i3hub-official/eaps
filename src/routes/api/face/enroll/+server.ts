// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { saveFaceDescriptor, isFaceEnrolled } from '$lib/server/db/faces.js';
import { prisma } from '$lib/server/db/index.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireStudent(locals.user);
    const studentId = String(user.id);

    // BLOCK: No dual enrollment
    const alreadyEnrolled = await isFaceEnrolled(studentId);
    if (alreadyEnrolled) {
      return json(
        { ok: false, error: 'Face already enrolled. Contact admin to reset.' },
        { status: 409 }
      );
    }

    const { descriptor, photo } = await request.json();

    if (!Array.isArray(descriptor) || descriptor.length === 0) {
      error(400, 'Invalid descriptor — must be a non-empty float array');
    }

    const isValid = descriptor.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (!isValid) {
      error(400, 'Invalid descriptor — all values must be valid finite numbers');
    }

    // Save face descriptor
    await saveFaceDescriptor(studentId, descriptor);

    // Save compressed photo to user profile if provided
    if (photo && typeof photo === 'string' && photo.startsWith('data:')) {
      await prisma.user.update({
        where: { id: studentId },
        data: { photoUrl: photo },
      });
    }

    return json({ ok: true, message: 'Face enrolled successfully' });

  } catch (err) {
    console.error('Face enrollment error:', err);
    error(500, err instanceof Error ? err.message : 'Enrollment failed');
  }
};