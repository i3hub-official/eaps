// src/lib/server/middleware/rate-limit.middleware.ts

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';

// ─── Route-specific limiters ──────────────────────────────────────────────────

const faceLimiter = new RetryAfterRateLimiter({
  IP:   [10, '15m'],
  IPUA: [5,  '15m'],
});

const examLimiter = new RetryAfterRateLimiter({
  IP:   [120, 'm'],
  IPUA: [120, 'm'],
});

const authLimiter = new RetryAfterRateLimiter({
  IP:   [10, '15m'],
  IPUA: [10, '15m'],
});

const generalApiLimiter = new RetryAfterRateLimiter({
  IP:   [60, 'm'],
  IPUA: [60, 'm'],
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
  if (dev) return null;

  const { pathname } = event.url;
  const isApiRoute = pathname.startsWith('/api/');

  const matched = LIMITERS.find(({ match }) => match(pathname));
  if (!matched) return null;

  const status = await matched.limiter.check(event);

  if (status.limited) {
    console.warn(
      `[RateLimit] ${matched.label} — IP ${event.getClientAddress()} blocked on ${pathname}. ` +
      `Retry after ${status.retryAfter}s`
    );

    // API routes get raw JSON (consumed by fetch callers, not the browser)
    if (isApiRoute) {
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

    // Page routes → throw SvelteKit error so +error.svelte renders it
    error(429, {
      message: 'Too many requests',
      retryAfter: status.retryAfter,
    } as any);
  }

  return null;
}