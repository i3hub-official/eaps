// src/lib/server/ws/server.ts

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

export type WsMessage =
  | { type: 'violation'; session_id: string; flag_type: string; action: string; count: number }
  | { type: 'student_status'; session_id: string; status: string }
  | { type: 'time_sync'; session_id: string; remaining_secs: number }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'join_exam'; exam_id: string; role: 'invigilator' | 'student' }
  | { type: 'pause_session'; session_id: string }
  | { type: 'resume_session'; session_id: string }
  | { type: 'force_submit'; session_id: string };

// exam_id → invigilator sockets
const examRooms = new Map<string, Set<WebSocket>>();

// session_id → student socket
const studentSockets = new Map<string, WebSocket>();

let wss: WebSocketServer | null = null;

export function getWss(): WebSocketServer {
  if (wss) return wss;

  const port = Number(process.env.WS_PORT ?? 3001);
  wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    let joinedExamId: string | null = null;
    let joinedSessionId: string | null = null;
    let joinedRole: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (msg.type === 'join_exam') {
          joinedExamId = msg.exam_id;
          joinedRole = msg.role;

          if (msg.role === 'invigilator') {
            if (!examRooms.has(msg.exam_id)) examRooms.set(msg.exam_id, new Set());
            examRooms.get(msg.exam_id)!.add(ws);
          }
          return;
        }

        if (
          msg.type === 'pause_session' ||
          msg.type === 'resume_session' ||
          msg.type === 'force_submit'
        ) {
          const studentWs = studentSockets.get(msg.session_id);
          if (studentWs?.readyState === WebSocket.OPEN) {
            studentWs.send(JSON.stringify(msg));
          }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (joinedExamId && joinedRole === 'invigilator') {
        examRooms.get(joinedExamId)?.delete(ws);
        // Clean up empty rooms
        if (examRooms.get(joinedExamId)?.size === 0) {
          examRooms.delete(joinedExamId);
        }
      }
      if (joinedSessionId) {
        studentSockets.delete(joinedSessionId);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[WS] Server error:', err);
  });

  // ✅ Fixed: was `${wss}` which logs [object Object]
  console.log(`[WS] WebSocket server running on port ${port}`);

  return wss;
}

export function broadcastViolation(exam_id: string, payload: object) {
  const room = examRooms.get(exam_id);
  if (!room) return;

  const msg = JSON.stringify({ type: 'violation', ...payload });
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

export function broadcastStudentStatus(exam_id: string, session_id: string, status: string) {
  const room = examRooms.get(exam_id);
  if (!room) return;

  const msg = JSON.stringify({ type: 'student_status', session_id, status });
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

export function registerStudentSocket(session_id: string, ws: WebSocket) {
  studentSockets.set(session_id, ws);
}

export function unregisterStudentSocket(session_id: string) {
  studentSockets.delete(session_id);
}

/** Send a direct message to a specific student */
export function sendToStudent(session_id: string, payload: object) {
  const ws = studentSockets.get(session_id);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/** How many invigilators are watching an exam */
export function getExamRoomSize(exam_id: string): number {
  return examRooms.get(exam_id)?.size ?? 0;
}