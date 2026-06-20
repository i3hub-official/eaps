// src/routes/api/face/verify/+server.ts
//
// Security model:
//   1. Enrolled descriptor is stored as AES-256-GCM encrypted string.
//      Must be decrypted via getFaceDescriptor() — never cast directly.
//   2. Descriptor dimensions must match exactly. Truncation-based comparison
//      produces meaningless similarity scores and is rejected outright.
//   3. Both hard-fail (< soft threshold) and soft-pass (soft ≤ sim < match)
//      are logged. The soft-pass warning is surfaced to the client only.
//   4. logVerification is called here (the canonical place). verify-session
//      intentionally does NOT call it again to avoid duplicate audit rows.

import { json, error }      from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z }                from 'zod';
import { requireStudent }   from '$lib/server/auth/guards.js';
import {
  getFaceDescriptor,
  cosineSimilarity,
  FACE_THRESHOLDS,
  logVerification,
} from '$lib/server/db/faces.js';

const VerifySchema = z.object({
  descriptor: z
    .array(z.number().finite())
    .min(64,   'Descriptor too short — minimum 64 dimensions')
    .max(2048, 'Descriptor too long — maximum 2048 dimensions'),
  examId: z.string().uuid().optional().nullable(),
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  try {
    const user = requireStudent(locals.user);

    // ── 1. Parse + validate body ───────────────────────────────────────────
    const body   = await request.json().catch(() => null);
    const parsed = VerifySchema.safeParse(body);

    if (!parsed.success) {
      return json(
        {
          success: false,
          error:   'Invalid request',
          issues:  parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { descriptor, examId } = parsed.data;

    // ── 2. Load + decrypt enrolled descriptor ──────────────────────────────
    //
    // getFaceDescriptor() handles decryption (AES-256-GCM) and the
    // legacy raw-JSON fallback. Never bypass it with a direct DB cast.
    const enrolled = await getFaceDescriptor(user.id);

    if (!enrolled) {
      throw error(403, 'Face not enrolled. Complete enrollment first.');
    }

    // ── 3. Reject dimension mismatch ───────────────────────────────────────
    //
    // Comparing descriptors from different model sizes (e.g. 128-d vs 512-d)
    // after truncation yields a meaningless similarity score that could
    // accidentally clear the threshold. Hard-reject instead.
    if (enrolled.length !== descriptor.length) {
      console.warn(
        `[verify] dimension mismatch — student=${user.id} ` +
        `enrolled=${enrolled.length}d incoming=${descriptor.length}d`,
      );

      await logVerification({
        studentId:       user.id,
        examId:          examId ?? null,
        similarityScore: 0,
        success:         false,
        ipAddress:       getClientAddress(),
        userAgent:       request.headers.get('user-agent'),
      });

      return json(
        {
          success: false,
          error:   'Face model mismatch — please re-enroll or contact the exams office.',
          code:    'DIMENSION_MISMATCH',
        },
        { status: 400 },
      );
    }

    // ── 4. Cosine similarity ───────────────────────────────────────────────
    const similarity = cosineSimilarity(enrolled, descriptor);
    const success    = similarity >= FACE_THRESHOLDS.match;
    const softPass   = !success && similarity >= FACE_THRESHOLDS.soft;

    // ── 5. Audit log ───────────────────────────────────────────────────────
    await logVerification({
      studentId:       user.id,
      examId:          examId ?? null,
      similarityScore: similarity,
      success:         success || softPass,
      ipAddress:       getClientAddress(),
      userAgent:       request.headers.get('user-agent'),
    });

    // ── 6. Hard fail ───────────────────────────────────────────────────────
    if (!success && !softPass) {
      return json(
        {
          success:   false,
          similarity,
          threshold: FACE_THRESHOLDS.match,
          message:   `Face verification failed (${Math.round(similarity * 100)}% match). ` +
                     'Ensure good lighting, remove glasses if worn, and center your face.',
        },
        { status: 403 },
      );
    }

    // ── 7. Pass (hard or soft) ─────────────────────────────────────────────
    return json({
      success:   true,
      similarity,
      threshold: FACE_THRESHOLDS.match,
      warning:   softPass
        ? `Low-confidence match (${Math.round(similarity * 100)}%). ` +
          'Ensure proper lighting and center your face in the frame.'
        : undefined,
      examId: examId ?? null,
    });

  } catch (err) {
    // Re-throw SvelteKit HttpError (403 face-not-enrolled, etc.)
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error('[verify] unexpected error:', err);
    throw error(500, err instanceof Error ? err.message : 'Verification failed');
  }
};