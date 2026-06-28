import type { Handle } from '@sveltejs/kit';
import { getWss }                from '$lib/server/ws/server.js';
import { tickExamScheduler }     from '$lib/server/exam/scheduler.js';
import { finalizeExpiredSessions } from '$jobs/finalize-expired-sessions.js';
import { expireApiKeys }         from '$jobs/expire-api-keys.js';
import { sessionMiddleware }     from '$lib/server/middleware/session.middleware.js';
import { faceExamMiddleware }    from '$lib/server/middleware/face-exam.middleware.js';
import { apiAuthMiddleware }     from '$lib/server/middleware/api-auth.middleware.js';
import { rateLimitMiddleware }   from '$lib/server/middleware/rate-limit.middleware.js';

// ─── Background services ──────────────────────────────────────────────────────

async function safeTick<T>(label: string, fn: () => Promise<T>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[${label}] Tick failed (non-fatal):`, err);
  }
}

try {
  getWss();
} catch (err) {
  console.error('[WS] Failed to initialise WebSocket server:', err);
}

setInterval(() => {
  finalizeExpiredSessions().catch((err) => console.error('[jobs] finalize-expired-sessions failed:', err));
}, 30_000); // exam deadlines need tighter polling than most jobs

console.log('[Cron] Exam scheduler starting');
safeTick('Scheduler', tickExamScheduler);
setInterval(() => safeTick('Scheduler', tickExamScheduler), 30_000);

console.log('[Cron] API key expiration job registered (every 5 min)');
safeTick('API Keys', expireApiKeys);
setInterval(() => safeTick('API Keys', expireApiKeys), 5 * 60_000);

// ─── Request handler ──────────────────────────────────────────────────────────

export const handle: Handle = async ({ event, resolve }) => {
  // 1. Rate limit before doing any DB work
  const rateLimitResponse = await rateLimitMiddleware(event);
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Populate event.locals.user from session cookie
  await sessionMiddleware(event);

  // 3. Block unauthenticated access to protected API routes
  const apiResponse = apiAuthMiddleware(event);
  if (apiResponse) return apiResponse;

  // 4. Enforce face verification on exam routes (may throw redirect)
  faceExamMiddleware(event);

  return resolve(event);
};