// src/routes/api/exam/[examId]/session-stream/+server.ts
//
// Server-Sent Events stream for kiosk → client real-time updates.
//
// The kiosk connects here on mount and stays connected for the exam duration.
// The server polls the session every 5 s and pushes any status change.
//
// Event shape:
//   event: status
//   data: { status, timeRemaining?, action? }
//
// Status values pushed:
//   in_progress   — session running (also sent on unpause)
//   paused        — invigilator paused this session
//   flagged       — session locked for review
//   submitted     — submitted by student
//   force_submitted — auto-submitted by server

import type { RequestHandler } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import {
  computeDeadline,
  secondsRemaining,
  UUID_RE,
  finalizeSession,
} from '$lib/server/exam/session-engine.js';

// How often to poll the DB (ms)
const POLL_INTERVAL_MS = 5_000;
// Kill the stream after this long regardless (prevents ghost connections)
const MAX_STREAM_MS = 4 * 60 * 60 * 1000; // 4 h

export const GET: RequestHandler = async ({ params, url, locals, request }) => {
  const user      = await requireStudent(locals.user);
  const examId    = params.examId;
  const sessionId = url.searchParams.get('sessionId');

  if (!examId || !UUID_RE.test(examId))    return new Response('Bad examId',    { status: 400 });
  if (!sessionId || !UUID_RE.test(sessionId)) return new Response('Bad sessionId', { status: 400 });

  const prisma = await getPrismaClient();

  // Validate ownership before opening the stream
  const session = await prisma.examSession.findUnique({
    where:  { id: sessionId },
    select: { studentId: true, examId: true, status: true },
  });

  if (!session)                        return new Response('Not found', { status: 404 });
  if (session.studentId !== user.id)   return new Response('Forbidden',  { status: 403 });
  if (session.examId    !== examId)    return new Response('Forbidden',  { status: 403 });

  // Helper: build an SSE message string
  function sseMsg(event: string, data: object): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc       = new TextEncoder();
      let   lastStatus = session.status;
      const startedAt  = Date.now();
      let   pollTimer: ReturnType<typeof setInterval> | null = null;
      let   closed = false;

      function send(msg: string) {
        if (closed) return;
        try { controller.enqueue(enc.encode(msg)); } catch { /* client gone */ }
      }

      function close() {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        try { controller.close(); } catch { /* already closed */ }
      }

      // Send a heartbeat comment every 20 s to keep the connection alive through
      // proxies that close idle connections.
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        send(': heartbeat\n\n');
      }, 20_000);

      // Max lifetime guard
      const maxTimer = setTimeout(() => { clearInterval(heartbeat); close(); }, MAX_STREAM_MS);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        clearTimeout(maxTimer);
        close();
      });

      // Send initial state immediately
      send(sseMsg('status', { status: lastStatus }));

      pollTimer = setInterval(async () => {
        if (closed) return;

        try {
          const current = await prisma.examSession.findUnique({
            where:  { id: sessionId },
            select: { status: true, startedAt: true },
          });

          if (!current) { close(); return; }

          // Auto-finalize expired sessions
          if (
            current.status === 'in_progress' &&
            current.startedAt
          ) {
            const exam = await prisma.exam.findUnique({
              where: { id: examId },
              select: { durationMinutes: true, scheduledEnd: true },
            });
            if (exam) {
              const deadline  = computeDeadline(exam as any, current.startedAt);
              const remaining = secondsRemaining(deadline);
              if (remaining <= 0) {
                await finalizeSession(sessionId, 'force_submitted');
                send(sseMsg('status', { status: 'force_submitted', timeRemaining: 0 }));
                clearInterval(heartbeat);
                clearTimeout(maxTimer);
                close();
                return;
              }

              // Push time correction + status
              if (current.status !== lastStatus) {
                lastStatus = current.status;
                send(sseMsg('status', { status: current.status, timeRemaining: remaining }));
              } else if (current.status === 'in_progress') {
                // Always push an in_progress heartbeat with current time
                // so the client can correct drift even if status hasn't changed.
                send(sseMsg('status', { status: 'in_progress', timeRemaining: remaining }));
              }
              return;
            }
          }

          // Status changed — push it
          if (current.status !== lastStatus) {
            lastStatus = current.status;
            send(sseMsg('status', { status: current.status }));

            // Terminal states — close stream after pushing
            if (
              current.status === 'submitted' ||
              current.status === 'force_submitted' ||
              current.status === 'flagged'
            ) {
              clearInterval(heartbeat);
              clearTimeout(maxTimer);
              close();
            }
          }
        } catch {
          /* DB blip — don't close, just wait for next poll */
        }
      }, POLL_INTERVAL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  });
};