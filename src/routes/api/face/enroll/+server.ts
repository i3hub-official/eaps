// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { saveFaceDescriptor, isFaceEnrolled } from '$lib/server/db/faces.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  
  try {
    const user = await requireStudent(locals.user);
              const prisma = await getPrismaClient();
    
              
    const studentId = String(user.id);

    // BLOCK: No dual enrollment
    const alreadyEnrolled = await isFaceEnrolled(studentId);
    if (alreadyEnrolled) {
      return json(
        { ok: false, error: 'Face already enrolled. Contact admin to reset.' },
        { status: 409 }
      );
    }

    const { descriptor, photo, } = await request.json();

    // Human embeddings are typically 512 or 1024 dimensions, not 128
    if (!Array.isArray(descriptor) || descriptor.length === 0) {
      error(400, 'Invalid descriptor — must be a non-empty float array');
    }

    console.log('Received descriptor of dimension:', descriptor.length);
    
    // Accept any reasonable embedding dimension (128, 512, 1024, etc.)
    if (descriptor.length < 64 || descriptor.length > 2048) {
      error(400, `Invalid descriptor dimension: ${descriptor.length}. Expected between 64-2048.`);
    }

    const isValid = descriptor.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (!isValid) {
      error(400, 'Invalid descriptor — all values must be valid finite numbers');
    }

    // Save face descriptor with dimension info
    await saveFaceDescriptor(studentId, descriptor, descriptor.length);

    // Save compressed photo to user profile if provided
    if (photo && typeof photo === 'string' && photo.startsWith('data:')) {
      await prisma.user.update({
        where: { id: studentId },
        data: { photoUrl: photo },
      });
    }

    return json({ ok: true, message: 'Face enrolled successfully', dimension: descriptor.length });

  } catch (err) {
    console.error('Face enrollment error:', err);
    error(500, err instanceof Error ? err.message : 'Enrollment failed');
  }
};