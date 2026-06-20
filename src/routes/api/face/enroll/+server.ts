// src/routes/api/face/enroll/+server.ts
//
// Security model:
//   1. A student cannot re-enroll (409 if descriptor exists).
//   2. A face cannot be enrolled under more than one account — cross-student
//      duplicate check runs before save (FACE_THRESHOLDS.match = 0.72).
//   3. Enrolled descriptors are stored AES-256-GCM encrypted.
//      getAllDescriptorsExcept() in faces.ts handles decryption transparently,
//      including the legacy raw-JSON fallback for pre-migration rows.
//   4. Dimension mismatch during duplicate scan is skipped (different models
//      cannot be compared). A warning is logged but enrollment proceeds.

import { json, error }      from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z }                from 'zod';
import { requireStudent }   from '$lib/server/auth/guards.js';
import {
  saveFaceDescriptor,
  isFaceEnrolled,
  getAllDescriptorsExcept,
  cosineSimilarity,
  FACE_THRESHOLDS,
} from '$lib/server/db/faces.js';
import { getPrismaClient }  from '$lib/server/db/index.js';

const EnrollSchema = z.object({
  descriptor: z
    .array(z.number().finite())
    .min(64,   'Descriptor too short — minimum 64 dimensions')
    .max(2048, 'Descriptor too long — maximum 2048 dimensions')
    .refine(
      arr => arr.every(v => !isNaN(v)),
      'All descriptor values must be valid numbers',
    ),
  photo: z
    .string()
    .startsWith('data:', 'Photo must be a base64 data URL')
    .optional(),
});

// ─── Duplicate-face scan ──────────────────────────────────────────────────────
//
// Uses getAllDescriptorsExcept() which decrypts every enrolled descriptor
// via safeDecrypt() in faces.ts. We never touch the raw DB column here.
//
// Complexity: O(N × D) — acceptable for enrollment (fires once per student).

async function findDuplicateFace(
  incomingDescriptor: number[],
  excludeStudentId:   string,
): Promise<{ studentId: string; similarity: number } | null> {
  const rows = await getAllDescriptorsExcept(excludeStudentId);

  for (const row of rows) {
    // Skip descriptors from a different model (dimension mismatch)
    if (row.descriptor.length !== incomingDescriptor.length) {
      console.warn(
        `[enroll] dimension mismatch during duplicate scan — ` +
        `existing student=${row.studentId} ` +
        `enrolled=${row.descriptor.length}d incoming=${incomingDescriptor.length}d — skipped`,
      );
      continue;
    }

    const similarity = cosineSimilarity(incomingDescriptor, row.descriptor);

    if (similarity >= FACE_THRESHOLDS.match) {
      return { studentId: row.studentId, similarity };
    }
  }

  return null;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user      = requireStudent(locals.user);
    const prisma    = await getPrismaClient();
    const studentId = String(user.id);

    // ── 1. Block re-enrollment ─────────────────────────────────────────────
    const alreadyEnrolled = await isFaceEnrolled(studentId);
    if (alreadyEnrolled) {
      return json(
        { ok: false, error: 'Face already enrolled. Contact admin to reset.' },
        { status: 409 },
      );
    }

    // ── 2. Parse + validate body ───────────────────────────────────────────
    const body   = await request.json().catch(() => null);
    const parsed = EnrollSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        {
          ok:     false,
          error:  'Invalid enrollment data',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { descriptor, photo } = parsed.data;

    console.log(`[enroll] student=${studentId} descriptor_dim=${descriptor.length}`);

    // ── 3. Cross-student duplicate face check ──────────────────────────────
    //
    // getAllDescriptorsExcept() decrypts each stored descriptor before
    // returning it. The raw DB column is never accessed here directly.
    const duplicate = await findDuplicateFace(descriptor, studentId);

    if (duplicate) {
      console.warn(
        `[enroll] DUPLICATE FACE — student=${studentId} ` +
        `matches existing student=${duplicate.studentId} ` +
        `similarity=${duplicate.similarity.toFixed(4)}`,
      );

      return json(
        {
          ok:    false,
          error: 'Face enrollment failed: this face has already been registered ' +
                 'to another account. If you believe this is an error, contact the exams office.',
          code:  'FACE_ALREADY_REGISTERED',
        },
        { status: 409 },
      );
    }

    // ── 4. Encrypt + save descriptor ───────────────────────────────────────
    //
    // saveFaceDescriptor() encrypts with AES-256-GCM before writing.
    await saveFaceDescriptor(studentId, descriptor, descriptor.length);

    // ── 5. Save photo (optional) ───────────────────────────────────────────
    if (photo) {
      await prisma.user.update({
        where: { id: studentId },
        data:  { photoUrl: photo },
      });
    }

    console.log(`[enroll] success student=${studentId}`);

    return json({
      ok:        true,
      message:   'Face enrolled successfully',
      dimension: descriptor.length,
    });

  } catch (err) {
    console.error('[enroll] error:', err);
    error(500, err instanceof Error ? err.message : 'Enrollment failed');
  }
};