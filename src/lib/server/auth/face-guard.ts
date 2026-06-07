import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/index.js';
import type { Cookies } from '@sveltejs/kit';

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function requireFaceVerified(locals: App.Locals, cookies: Cookies, examId?: string) {
  const user = locals.user;
  if (!user) redirect(302, '/login');

  // Check cookie-based verification first
  const verified = cookies.get('face_verified');
  const verifiedAt = cookies.get('face_verified_at');

  if (verified === 'true' && verifiedAt) {
    const timestamp = parseInt(verifiedAt, 10);
    const age = Date.now() - timestamp;
    
    if (age < VERIFICATION_WINDOW_MS) {
      // Cookie valid, but double-check enrollment still exists
      const enrolled = await prisma.faceDescriptor.findUnique({
        where: { studentId: user.id },
      });
      if (!enrolled) {
        cookies.delete('face_verified', { path: '/' });
        cookies.delete('face_verified_at', { path: '/' });
        redirect(302, examId ? `/student?enroll=required&exam=${examId}` : '/student?enroll=required');
      }
      return { verified: true, source: 'cookie' as const };
    }
    
    // Expired — clear cookies
    cookies.delete('face_verified', { path: '/' });
    cookies.delete('face_verified_at', { path: '/' });
    cookies.delete('face_similarity_score', { path: '/' });
  }

  // Fallback: check database for recent verification
  const since = new Date(Date.now() - VERIFICATION_WINDOW_MS);
  const recent = await prisma.faceVerificationLog.findFirst({
    where: {
      studentId: user.id,
      success: true,
      verifiedAt: { gte: since },
    },
    orderBy: { verifiedAt: 'desc' },
  });

  if (recent) {
    // Refresh cookies
    cookies.set('face_verified', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    });
    cookies.set('face_verified_at', Date.now().toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    });
    return { verified: true, source: 'database' as const };
  }

  // Not verified
  const dest = examId ? `/student?verify=required&exam=${examId}` : '/student?verify=required';
  redirect(302, dest);
}