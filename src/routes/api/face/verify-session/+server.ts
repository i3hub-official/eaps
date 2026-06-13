// src/routes/api/face/verify-session/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const POST: RequestHandler = async ({ request, locals, cookies, getClientAddress }) => {
  try {
    const user = await requireStudent(locals.user);
              const prisma = await getPrismaClient();
    
    const { verified, similarityScore, examId } = await request.json();

    if (!verified) {
      return json({ error: 'Face verification failed' }, { status: 400 });
    }

    // Set HTTP-only cookies for downstream guards (requireFaceVerified)
    const cookieOpts = {
      path:     '/',
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge:   60 * 5, // 5 minutes
    };

    cookies.set('face_verified',        'true',                         cookieOpts);
    cookies.set('face_verified_at',     Date.now().toString(),          cookieOpts);
    cookies.set('face_similarity_score',(similarityScore ?? 0).toString(), cookieOpts);

    // NOTE: logVerification is intentionally NOT called here.
    // The /api/face/verify endpoint already logged the verification event
    // with the actual similarity score and success flag. Calling it again
    // here would create a duplicate audit entry.

    // Write a separate audit log entry for exam access grant (not a verify log)
    if (examId) {
      await prisma.auditLog.create({
        data: {
          userId:   user.id,
          action:   'face_verification',
          entity:   'exam',
          entityId: examId,
          metadata: {
            similarityScore,
            verifiedAt: new Date().toISOString(),
            type:       'exam_access',
            ip:         getClientAddress(),
            ua:         request.headers.get('user-agent'),
          },
        },
      });
    }

    return json({ success: true });
  } catch (err) {
    console.error('Face verification session error:', err);
    return json({ error: 'Failed to create verification session' }, { status: 500 });
  }
};