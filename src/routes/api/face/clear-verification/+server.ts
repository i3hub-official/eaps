// src/routes/api/face/clear-verification/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const POST: RequestHandler = async ({ locals, cookies }) => {
  const user = await requireStudent(locals.user);
          const prisma = await getPrismaClient();

  // Invalidate recent verification logs (soft delete approach)
  await prisma.faceVerificationLog.updateMany({
    where: { 
      studentId: user.id, 
      success: true,
      verifiedAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000) // last 10 min
      }
    },
    data: { success: false },
  });

  // Clear face verification cookies
  cookies.delete('face_verified', { path: '/' });
  cookies.delete('face_verified_at', { path: '/' });
  cookies.delete('face_similarity_score', { path: '/' });
  
  return json({ success: true, cleared: true });
};