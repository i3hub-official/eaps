import { getSessionToken, validateSession } from '$lib/server/auth/session.js';
import { getWss } from '$lib/server/ws/server.js';
import type { Handle } from '@sveltejs/kit';

// Boot the WebSocket server once when SvelteKit starts
getWss();

export const handle: Handle = async ({ event, resolve }) => {
  const token = getSessionToken(event.cookies);
  event.locals.user = token ? await validateSession(token) : null;

  return resolve(event);
};