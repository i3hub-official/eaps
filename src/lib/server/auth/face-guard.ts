// src/lib/server/auth/face-guard.ts
import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';

export async function requireFaceVerified(cookies: Cookies, examId?: string, returnTo?: string) {
  const faceVerified = cookies.get('face_verified');
  const faceVerifiedAt = cookies.get('face_verified_at');
  
  if (!faceVerified || faceVerified !== 'true') {
    const redirectUrl = examId 
      ? `/verify?examId=${examId}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`
      : '/verify';
    throw redirect(302, redirectUrl);
  }
  
  // Check if verification is still valid (5 min timeout)
  if (faceVerifiedAt) {
    const verifiedTime = parseInt(faceVerifiedAt, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - verifiedTime > fiveMinutes) {
      throw redirect(302, `/verify?examId=${examId}&expired=true`);
    }
  }
  
  return true;
}

export function clearFaceVerification(cookies: Cookies) {
  cookies.delete('face_verified', { path: '/' });
  cookies.delete('face_verified_at', { path: '/' });
  cookies.delete('face_similarity_score', { path: '/' });
}