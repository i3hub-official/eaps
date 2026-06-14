// src/lib/server/middleware/api-auth.middleware.ts

import type { RequestEvent } from '@sveltejs/kit';

const PROTECTED_API_PREFIXES = ['/api/face/'];

function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function apiAuthMiddleware(event: RequestEvent): Response | null {
  if (isProtectedApiPath(event.url.pathname) && !event.locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // null = no interception, continue to next middleware
  return null;
}