// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
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

// ─── Request handler ──────────────────────────────────────────────────────────

export const handle: Handle = async ({ event, resolve }) => {
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

  return resolve(event);
};