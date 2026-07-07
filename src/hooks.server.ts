// src/hooks.server.ts
// Mounts the invigilator WebSocket server on HTTP upgrade requests.
// SvelteKit does not handle WS natively — we intercept the upgrade event
// from the underlying Node HTTP server.
// Also redirects the root landing page straight to /login.

import { redirect, type Handle } from '@sveltejs/kit'
import { createInvigilatorWSS } from '$lib/server/invigilator/websocket'

let wss: any = null

// Attach upgrade handler once to the Node HTTP server
// This runs once at startup (not per request)
if (typeof globalThis.__wsAttached === 'undefined') {
  globalThis.__wsAttached = false
}

declare global {
  var __wsAttached: boolean
}

export const handle: Handle = async ({ event, resolve }) => {
  // No more landing page — send root straight to login
  if (event.url.pathname === '/') {
    redirect(307, '/login')
  }

  // Attach WS upgrade handler to the Node server on first request
  if (!globalThis.__wsAttached) {
    if (!wss) {
      wss = await createInvigilatorWSS()
    }
    const server = (event.platform as any)?.server
      ?? (globalThis as any).__sveltekitDevServer

    if (server) {
      server.on('upgrade', (req: any, socket: any, head: any) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname.startsWith('/ws/invigilator')) {
          wss.handleUpgrade(req, socket, head, (ws: any) => {
            wss.emit('connection', ws, req)
          })
        } else {
          socket.destroy()
        }
      })
      globalThis.__wsAttached = true
    }
  }

  return resolve(event)
}