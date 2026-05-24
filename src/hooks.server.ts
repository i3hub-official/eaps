// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionToken, validateSession } from '$lib/server/auth/session.js';
import { getWss } from '$lib/server/ws/server.js';
import { tickExamScheduler } from '$lib/server/exam/scheduler.js';

// ─── WebSocket server ─────────────────────────────────────────────────────────
//
// Wrapped in try/catch so a WS initialisation failure (e.g. port conflict)
// logs clearly but does not prevent the HTTP server from starting.

try {
  getWss();
} catch (err) {
  console.error('[WS] Failed to initialise WebSocket server:', err);
}

// ─── Exam scheduler ───────────────────────────────────────────────────────────
//
// Each tick is fire-and-forget. Wrapping in an async IIFE that swallows
// errors means a DB hiccup during one tick doesn't affect subsequent ticks
// or the request handler.

async function safeTick() {
  try {
    await tickExamScheduler();
  } catch (err) {
    // Log and continue — the next tick will retry.
    console.error('[Scheduler] Tick failed (non-fatal):', err);
  }
}

// Fire immediately on startup, then every 60s.
safeTick();
setInterval(safeTick, 60_000);

// ─── Face verification paths that require protection ─────────────────────────
const PROTECTED_EXAM_PATHS = ['/exam/'];
const VERIFY_PATH = '/verify';
const ENROLL_PATH = '/enroll';
const API_FACE_PATHS = ['/api/face/'];

function isProtectedExamPath(pathname: string): boolean {
  // Protect /exam/[examId] routes but NOT /exam/[examId]/complete
  if (pathname.startsWith('/exam/') && !pathname.includes('/complete')) {
    return true;
  }
  return false;
}

function isApiFacePath(pathname: string): boolean {
  return API_FACE_PATHS.some(prefix => pathname.startsWith(prefix));
}

// ─── Request handler ──────────────────────────────────────────────────────────

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  
  // Session validation hits the DB. If the DB is temporarily unreachable we
  // treat the user as unauthenticated rather than crashing the request.
  // The route's own load function / action can decide whether to redirect.
  const token = getSessionToken(event.cookies);

  if (token) {
    try {
      event.locals.user = await validateSession(token);
    } catch (err) {
      // DB is down or query timed out — degrade gracefully.
      console.error('[Auth] validateSession failed (treating as unauthenticated):', err);
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  // ─── Face verification protection for exam routes ─────────────────────────
  // Only apply to authenticated users accessing exam routes
  if (event.locals.user && isProtectedExamPath(pathname)) {
    // Get verification status from cookies or session
    // Using cookies for server-side verification (more secure)
    const faceVerified = event.cookies.get('face_verified');
    const verifiedAt = event.cookies.get('face_verified_at');
    const fiveMinutes = 5 * 60 * 1000; // Re-verify every 5 minutes
    
    const isValidSession = faceVerified === 'true' && 
                          verifiedAt && 
                          (Date.now() - parseInt(verifiedAt, 10)) < fiveMinutes;
    
    if (!isValidSession) {
      // Extract exam ID from path: /exam/[examId]
      const examId = pathname.split('/')[2];
      console.log(`[Auth] Face verification required for exam ${examId}, redirecting to /verify`);
      
      // Store the return URL to redirect back after verification
      const returnUrl = `${pathname}${event.url.search}`;
      throw redirect(302, `/verify?examId=${examId}&returnTo=${encodeURIComponent(returnUrl)}`);
    }
  }
  
  // ─── Prevent access to verify/enroll if already verified ───────────────────
  // Skip verification page if already verified recently
  if (event.locals.user && pathname === VERIFY_PATH && !event.url.searchParams.has('force')) {
    const faceVerified = event.cookies.get('face_verified');
    const verifiedAt = event.cookies.get('face_verified_at');
    const fiveMinutes = 5 * 60 * 1000;
    
    const isValidSession = faceVerified === 'true' && 
                          verifiedAt && 
                          (Date.now() - parseInt(verifiedAt, 10)) < fiveMinutes;
    
    if (isValidSession) {
      // Already verified, redirect to return URL or student dashboard
      const returnTo = event.url.searchParams.get('returnTo');
      if (returnTo) {
        throw redirect(302, returnTo);
      }
      throw redirect(302, '/student');
    }
  }
  
  // ─── API face routes protection ───────────────────────────────────────────
  // Ensure API face routes require authentication
  if (isApiFacePath(pathname) && !event.locals.user) {
    // Return 401 for API requests
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return resolve(event);
};