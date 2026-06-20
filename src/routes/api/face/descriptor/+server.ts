// src/routes/api/face/descriptor/+server.ts
//
// Returns the student's own decrypted face descriptor + enrollment metadata.
// Only the enrolling student can fetch their own descriptor — no cross-student
// access. Used by the kiosk face-verify flow to avoid a re-enrollment prompt.

import { json, error }      from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent }   from '$lib/server/auth/guards.js';
import { getFaceDescriptorWithMeta } from '$lib/server/db/faces.js';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user      = requireStudent(locals.user);
    const studentId = String(user.id);

    // getFaceDescriptorWithMeta() decrypts the stored GCM ciphertext and
    // handles the legacy raw-JSON fallback transparently via safeDecrypt().
    const faceData = await getFaceDescriptorWithMeta(studentId);

    if (!faceData) {
      throw error(404, 'No face descriptor found — please enroll first.');
    }

    return json({
      descriptor: faceData.descriptor,   // plaintext float array
      dimension:  faceData.dimension,
      enrolledAt: faceData.enrolledAt,
      updatedAt:  faceData.updatedAt,
    });

  } catch (err) {
    // Re-throw SvelteKit HttpError (404, 403, etc.)
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error('[descriptor] unexpected error:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to retrieve face descriptor');
  }
};