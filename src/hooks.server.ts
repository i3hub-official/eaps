// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getSessionToken, validateSession } from '$lib/server/auth/session.js';
import { getWss } from '$lib/server/ws/server.js';
import { tickExamScheduler } from '$lib/server/exam/scheduler.js';

// Boot WebSocket server once
getWss();

// Tick exam scheduler every 60s
tickExamScheduler();
setInterval(tickExamScheduler, 60_000);

export const handle: Handle = async ({ event, resolve }) => {
  const token = getSessionToken(event.cookies);
  event.locals.user = token ? await validateSession(token) : null;
  return resolve(event);
};