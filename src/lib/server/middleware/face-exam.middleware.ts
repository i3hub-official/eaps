// src/lib/server/middleware/face-exam.middleware.ts

import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const VERIFY_PATH = '/verify';
const FACE_REVALIDATION_MS = 5 * 60 * 1000; // 5 minutes

function isProtectedExamPath(pathname: string): boolean {
  return pathname.startsWith('/exam/') && !pathname.includes('/complete');
}

function isFaceSessionValid(cookies: RequestEvent['cookies']): boolean {
  const faceVerified = cookies.get('face_verified');
  const verifiedAt   = cookies.get('face_verified_at');

  return (
    faceVerified === 'true' &&
    !!verifiedAt &&
    Date.now() - parseInt(verifiedAt, 10) < FACE_REVALIDATION_MS
  );
}

export function faceExamMiddleware(event: RequestEvent): void {
  const { pathname } = event.url;

  // ── Guard: exam routes require a recent face verification ──────────────────
  if (event.locals.user && isProtectedExamPath(pathname)) {
    if (!isFaceSessionValid(event.cookies)) {
      const examId   = pathname.split('/')[2];
      const returnUrl = `${pathname}${event.url.search}`;

      console.log(`[Face] Verification required for exam ${examId}`);
      throw redirect(302, `/verify?examId=${examId}&returnTo=${encodeURIComponent(returnUrl)}`);
    }
  }

  // ── Guard: skip /verify if already verified recently ───────────────────────
  if (
    event.locals.user &&
    pathname === VERIFY_PATH &&
    !event.url.searchParams.has('force') &&
    isFaceSessionValid(event.cookies)
  ) {
    const returnTo = event.url.searchParams.get('returnTo');
    throw redirect(302, returnTo ?? '/student');
  }
}