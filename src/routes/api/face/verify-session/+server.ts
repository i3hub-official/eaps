// src/routes/api/face/verify-session/+server.ts
//
// Sets HTTP-only cookies that downstream guards (requireFaceVerified) read
// to confirm face verification has occurred in this browser session.
//
// IMPORTANT — logVerification is intentionally NOT called here.
//   The /api/face/verify endpoint already logged the verification event
//   with the actual similarity score and success flag. Calling it again
//   here would create a duplicate audit entry for the same verification.
//   This endpoint only writes an AuditLog entry for the exam-access grant,
//   which is a distinct event from the biometric check itself.

import { json }             from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent }   from '$lib/server/auth/guards.js';
import { getPrismaClient }  from '$lib/server/db/index.js';
import { z }                from 'zod';

const SessionSchema = z.object({
  verified:        z.boolean(),
  similarityScore: z.number().min(0).max(1).optional().nullable(),
  examId:          z.string().uuid().optional().nullable(),
});

export const POST: RequestHandler = async ({ request, locals, cookies, getClientAddress }) => {
  try {
    const user = requireStudent(locals.user);

    const body   = await request.json().catch(() => null);
    const parsed = SessionSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        { error: 'Invalid request body', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { verified, similarityScore, examId } = parsed.data;

    if (!verified) {
      return json({ error: 'Face verification failed — cannot create session.' }, { status: 400 });
    }

    // ── Set HTTP-only session cookies ──────────────────────────────────────
    const cookieOpts = {
      path:     '/',
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax'  as const,
      maxAge:   60 * 60,   // 60 minutes
    };

    cookies.set('face_verified',         'true',                               cookieOpts);
    cookies.set('face_verified_at',      Date.now().toString(),                cookieOpts);
    cookies.set('face_similarity_score', ((similarityScore ?? 0)).toString(),  cookieOpts);

    // ── Exam-access audit log (separate from biometric verify log) ─────────
    if (examId) {
      const prisma = await getPrismaClient();

      await prisma.auditLog.create({
        data: {
          userId:   user.id,
          action:   'exam_access_granted',
          entity:   'exam',
          entityId: examId,
          metadata: {
            similarityScore: similarityScore ?? null,
            verifiedAt:      new Date().toISOString(),
            type:            'exam_access',
            ip:              getClientAddress(),
            ua:              request.headers.get('user-agent'),
          },
        },
      });
    }

    return json({ success: true });

  } catch (err) {
    console.error('[verify-session] error:', err);
    return json(
      { error: err instanceof Error ? err.message : 'Failed to create verification session' },
      { status: 500 },
    );
  }
};