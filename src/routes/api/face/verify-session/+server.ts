// src/routes/api/face/verify-session/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  try {
    const user = await requireStudent(locals.user);
    const { verified, similarityScore, examId } = await request.json();
    
    if (!verified) {
      return json({ error: 'Face verification failed' }, { status: 400 });
    }
    
    // Set HTTP-only cookies for verification
    cookies.set('face_verified', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5 // 5 minutes
    });
    
    cookies.set('face_verified_at', Date.now().toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    });
    
    cookies.set('face_similarity_score', (similarityScore || 0).toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    });
    
    // Log verification in audit trail
    if (examId) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'face_verification',
          entity: 'exam',
          entityId: examId,
          metadata: { 
            similarityScore,
            verifiedAt: new Date().toISOString(),
            type: 'exam_access'
          }
        }
      });
    }
    
    return json({ success: true });
    
  } catch (error) {
    console.error('Face verification session error:', error);
    return json({ error: 'Failed to create verification session' }, { status: 500 });
  }
};