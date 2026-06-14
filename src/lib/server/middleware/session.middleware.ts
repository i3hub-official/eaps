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
    // DB is down or query timed out — degrade gracefully.
    console.error('[Auth] validateSession failed (treating as unauthenticated):', err);
    event.locals.user = null;
  }
}