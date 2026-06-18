import { redirect } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';
import type { Cookies } from '@sveltejs/kit';

const VERIFICATION_WINDOW_MS = 60 * 5 * 1000; // 5 minutes
const maxAgeSeconds = 5 * 60; // 60 minutes


export async function requireFaceVerified(locals: App.Locals, cookies: Cookies, examId?: string) {
  const prisma = await getPrismaClient();

  const user = locals.user;
  if (!user) {
    throw redirect(302, '/login');  // ← FIXED
  }

  const verified = cookies.get('face_verified');
  const verifiedAt = cookies.get('face_verified_at');

  if (verified === 'true' && verifiedAt) {
    const timestamp = parseInt(verifiedAt, 10);
    const age = Date.now() - timestamp;

    if (age < VERIFICATION_WINDOW_MS) {
      const enrolled = await prisma.faceDescriptor.findUnique({
        where: { studentId: user.id },
      });
      if (!enrolled) {
        cookies.delete('face_verified', { path: '/' });
        cookies.delete('face_verified_at', { path: '/' });
        throw redirect(302, examId ? `/student?enroll=required&exam=${examId}` : '/student?enroll=required');  // ← FIXED
      }
      return { verified: true, source: 'cookie' as const };
    }

    cookies.delete('face_verified', { path: '/' });
    cookies.delete('face_verified_at', { path: '/' });
    cookies.delete('face_similarity_score', { path: '/' });
  }

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
    cookies.set('face_verified', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
    });
    cookies.set('face_verified_at', Date.now().toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
    });
    return { verified: true, source: 'database' as const };
  }

  const dest = examId ? `/student?verify=required&exam=${examId}` : '/student?verify=required';
  throw redirect(302, dest);  // ← FIXED
}