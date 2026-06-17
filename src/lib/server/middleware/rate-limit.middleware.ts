// src/lib/server/middleware/rate-limit.middleware.ts

import type { RequestEvent } from '@sveltejs/kit';
import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';

// ─── Route-specific limiters ──────────────────────────────────────────────────
// Each limiter is a singleton — they hold the in-memory TTL cache.
// Rates are defined as [number, unit] where unit is:
// 's' | 'm' | 'h' | 'd' | 'w' | 'month' | '15m' | '30m' | '60m' | '6h' | '12h'

/** Face verification/enroll — tight limit, high-value target for brute force */
const faceLimiter = new RetryAfterRateLimiter({
  IP:   [1000, '15m'],  // 10 attempts per IP per 15 minutes
  IPUA: [1000,  '15m'],  // 5 attempts per IP+UserAgent per 15 minutes
});

/** Exam actions: answer, start, submit — prevent answer-flooding */
const examLimiter = new RetryAfterRateLimiter({
  IP:   [1000, 'm'],   // 120 req/min per IP  (2/sec headroom for rapid MCQ clicks)
  IPUA: [1000, 'm'],
});

/** Auth routes: login, register, forgot, reset */
const authLimiter = new RetryAfterRateLimiter({
  IP:   [1000, '15m'],  // 10 attempts per IP per 15 min
  IPUA: [1000,  '15m'],
});

/** General API catch-all — anything under /api/ not matched above */
const generalApiLimiter = new RetryAfterRateLimiter({
  IP:   [1000, 'm'],    // 60 req/min per IP
  IPUA: [1000, 'm'],
});

// ─── Path matchers ────────────────────────────────────────────────────────────

const LIMITERS: Array<{
  match: (path: string) => boolean;
  limiter: RetryAfterRateLimiter;
  label: string;
}> = [
  {
    label: 'face',
    match: (p) => p.startsWith('/api/face/'),
    limiter: faceLimiter,
  },
  {
    label: 'exam',
    match: (p) =>
      p.startsWith('/api/exam/') &&
      (p.endsWith('/answer') || p.endsWith('/start') || p.endsWith('/submit')),
    limiter: examLimiter,
  },
  {
    label: 'auth',
    match: (p) =>
      ['/login', '/register', '/forgot', '/reset', '/verify'].some((route) =>
        p.startsWith(route)
      ),
    limiter: authLimiter,
  },
  {
    label: 'api',
    match: (p) => p.startsWith('/api/'),
    limiter: generalApiLimiter,
  },
];

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function rateLimitMiddleware(
  event: RequestEvent
): Promise<Response | null> {
  const { pathname } = event.url;

  const matched = LIMITERS.find(({ match }) => match(pathname));
  if (!matched) return null; // No limiter for this path — pass through

  const status = await matched.limiter.check(event);

  if (status.limited) {
    console.warn(
      `[RateLimit] ${matched.label} — IP ${event.getClientAddress()} blocked on ${pathname}. ` +
      `Retry after ${status.retryAfter}s`
    );

    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: status.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(status.retryAfter),
        },
      }
    );
  }

  return null; // Not limited — continue
}