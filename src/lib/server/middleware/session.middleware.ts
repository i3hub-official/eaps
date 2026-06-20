// src/lib/server/middleware/session.middleware.ts

import type { RequestEvent } from '@sveltejs/kit';
import { getSessionToken, validateSession } from '$lib/server/auth/session.js';

export async function sessionMiddleware(event: RequestEvent): Promise<void> {
  const token = getSessionToken(event.cookies);

  if (!token) {
    event.locals.user = null;
    return;
  }

  try {
    event.locals.user = await validateSession(token);
  } catch (err) {
    console.error('[Auth] validateSession failed (treating as unauthenticated):', err);
    event.locals.user = null;
  }

  // Prevent authenticated pages from being served from bfcache.
  // Without this, hitting the back button after logout (or offline→online)
  // restores a cached dashboard from the browser without hitting the server.
  if (event.locals.user) {
    event.setHeaders({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma':        'no-cache',
    });
  }
}