// src/routes/api/face/enroll/+server.ts
//
// Security model:
//   1. A student cannot re-enroll (already blocked — 409 if descriptor exists).
//   2. A face cannot be enrolled under MORE THAN ONE student account.
//      This prevents: sit at Computer A as Student X, enroll face, then sit at
//      Computer B as Student Y and enroll the same face again.
//   3. The duplicate check uses the same cosine similarity threshold as
//      face verification (FACE_THRESHOLDS.match = 0.72) so the bar is
//      consistent across the whole system.

import { json, error }    from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z }              from 'zod';
import { requireStudent } from '$lib/server/auth/guards.js';
import {
  saveFaceDescriptor,
  isFaceEnrolled,
  cosineSimilarity,
  FACE_THRESHOLDS,
} from '$lib/server/db/faces.js';
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

// ─── Duplicate-face scan ──────────────────────────────────────────────────────
//
// Loads every enrolled descriptor and computes cosine similarity against the
// incoming one. Returns the conflicting studentId if found, null otherwise.
//
// Complexity: O(N × D) where N = enrolled students, D = descriptor dimension.
// At 5 000 students × 512-d: ~20 MB memory, ~3–10 ms CPU — acceptable for an
// enrollment endpoint that fires at most once per student per exam period.

async function findDuplicateFace(
  incomingDescriptor: number[],
  excludeStudentId:   string,           // don't flag the same student's existing row
): Promise<{ studentId: string; similarity: number } | null> {
  const prisma = await getPrismaClient();

  // Pull all existing descriptors except the enrolling student's own row
  // (which wouldn't exist yet anyway, but be explicit for re-enrollment safety).
  const rows = await prisma.faceDescriptor.findMany({
    where:  { studentId: { not: excludeStudentId } },
    select: { studentId: true, descriptor: true },
  });

  for (const row of rows) {
    const stored: number[] = Array.isArray(row.descriptor)
      ? (row.descriptor as number[])
      : JSON.parse(row.descriptor as string);

    // Skip dimension mismatch — can't compare embeddings from different models
    if (stored.length !== incomingDescriptor.length) continue;

    const similarity = cosineSimilarity(incomingDescriptor, stored);

    if (similarity >= FACE_THRESHOLDS.match) {
      return { studentId: row.studentId, similarity };
    }
  }

  return null;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user      = await requireStudent(locals.user);
    const prisma    = await getPrismaClient();
    const studentId = String(user.id);

    // ── 1. Block re-enrollment for this student ──────────────────────────────
    const alreadyEnrolled = await isFaceEnrolled(studentId);
    if (alreadyEnrolled) {
      return json(
        { ok: false, error: 'Face already enrolled. Contact admin to reset.' },
        { status: 409 },
      );
    }

    // ── 2. Parse + validate body ─────────────────────────────────────────────
    const body   = await request.json().catch(() => null);
    const parsed = EnrollSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        { ok: false, error: 'Invalid enrollment data', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { descriptor, photo } = parsed.data;

    console.log(`[enroll] student=${studentId} descriptor_dim=${descriptor.length}`);

    // ── 3. Cross-student duplicate face check ────────────────────────────────
    //
    // This is the critical security gate the original code was missing.
    // If another account already has a face this similar, reject immediately.
    // We do NOT tell the student which account it matched — that would be a
    // privacy leak. A generic error is sufficient.

    const duplicate = await findDuplicateFace(descriptor, studentId);

    if (duplicate) {
      console.warn(
        `[enroll] DUPLICATE FACE — student=${studentId} ` +
        `matches existing student=${duplicate.studentId} ` +
        `similarity=${duplicate.similarity.toFixed(4)}`
      );

      return json(
        {
          ok:    false,
          error: 'Face enrollment failed: this face has already been registered to another account. ' +
                 'If you believe this is an error, contact the exams office.',
          code:  'FACE_ALREADY_REGISTERED',
        },
        { status: 409 },
      );
    }

    // ── 4. Save descriptor ───────────────────────────────────────────────────
    await saveFaceDescriptor(studentId, descriptor, descriptor.length);

    // ── 5. Save photo (optional) ─────────────────────────────────────────────
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