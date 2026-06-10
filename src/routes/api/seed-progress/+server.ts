// src/routes/api/seed-progress/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { progressBroadcaster } from '$lib/server/progress-broadcaster';

export const GET: RequestHandler = async () => {
  let controller: ReadableStreamDefaultController;
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      
      // Add connection to broadcaster
      progressBroadcaster.addConnection(controller);
      
      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(pingInterval);
          progressBroadcaster.removeConnection(controller);
        }
      }, 30000);
      
      // Clean up on close
      const cleanup = () => {
        clearInterval(pingInterval);
        progressBroadcaster.removeConnection(controller);
      };
      
      // Handle client disconnect
      if (controller.desiredSize !== null) {
        // @ts-ignore
        controller.onClose = cleanup;
      }
    },
    cancel() {
      progressBroadcaster.removeConnection(controller);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};