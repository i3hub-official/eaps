import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

// ─── Message types ────────────────────────────────────────────────────────────

export type WsMessage =
  // Infrastructure
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'heartbeat';  session_id: string; role: 'student' | 'invigilator' }
  | { type: 'heartbeat_ack' }
  // Join/leave
  | { type: 'join_exam';  exam_id: string; role: 'invigilator' | 'student'; session_id?: string; student_id?: string; student_name?: string; matric?: string }
  | { type: 'student_joined'; exam_id: string; session_id: string; student_id: string; student_name: string; matric: string }
  | { type: 'student_left';   exam_id: string; session_id: string }
  | { type: 'room_state'; students: RoomStudent[] }
  // Status / violations
  | { type: 'violation';       exam_id: string; session_id: string; student_id: string; flag_type: string; action: string; violation_count: number }
  | { type: 'student_status';  exam_id: string; session_id: string; student_id: string; status: string }
  | { type: 'exam_submitted';  exam_id: string; session_id: string; student_id: string; submitted_at: string; score?: number; percentage?: number }
  // Camera feed
  | { type: 'camera_frame';           session_id: string; exam_id: string; frame: string }
  | { type: 'camera_frame_broadcast'; session_id: string; student_name: string; matric: string; frame: string; status: string; violation_count: number }
  // Invigilator → student commands
  | { type: 'pause_session';    session_id: string }
  | { type: 'resume_session';   session_id: string }
  | { type: 'force_submit';     session_id: string }
  | { type: 'time_correction';  session_id: string; add_secs: number }
  | { type: 'announcement';     exam_id: string; message: string }
  | { type: 'flag_student';     session_id: string; reason: string }
  // Time
  | { type: 'time_sync';   session_id: string; remaining_secs: number }
  | { type: 'time_update'; session_id: string; remaining_secs: number };

// ─── Room types ────────────────────────────────────────────────────────────────

interface RoomStudent {
  session_id:      string;
  student_id:      string;
  student_name:    string;
  matric:          string;
  status:          string;
  violation_count: number;
  last_seen:       number; // timestamp
}

interface StudentConn {
  ws:              WebSocket;
  exam_id:         string;
  student_id:      string;
  student_name:    string;
  matric:          string;
  status:          string;
  violation_count: number;
  last_seen:       number;
}

interface InvigilatorConn {
  ws:        WebSocket;
  last_seen: number;
}

// ─── State ─────────────────────────────────────────────────────────────────────

// exam_id → Set of invigilator connections
const examRooms = new Map<string, Set<InvigilatorConn>>();

// session_id → student connection
const studentConns = new Map<string, StudentConn>();

// exam_id → session_id[] (for room state snapshots)
const examStudents = new Map<string, Set<string>>();

let wss: WebSocketServer | null = null;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function send(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToInvigilators(exam_id: string, payload: object) {
  const room = examRooms.get(exam_id);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const conn of room) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(msg);
    } else {
      room.delete(conn);
    }
  }
}

function broadcastToStudentsInExam(exam_id: string, payload: object) {
  const sessions = examStudents.get(exam_id);
  if (!sessions) return;
  const msg = JSON.stringify(payload);
  for (const session_id of sessions) {
    const conn = studentConns.get(session_id);
    if (conn?.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(msg);
    }
  }
}

function getRoomState(exam_id: string): RoomStudent[] {
  const sessions = examStudents.get(exam_id);
  if (!sessions) return [];
  const state: RoomStudent[] = [];
  for (const session_id of sessions) {
    const conn = studentConns.get(session_id);
    if (conn) {
      state.push({
        session_id,
        student_id:      conn.student_id,
        student_name:    conn.student_name,
        matric:          conn.matric,
        status:          conn.status,
        violation_count: conn.violation_count,
        last_seen:       conn.last_seen,
      });
    }
  }
  return state;
}

function cleanupStudent(session_id: string) {
  const conn = studentConns.get(session_id);
  if (!conn) return;
  examStudents.get(conn.exam_id)?.delete(session_id);
  if (examStudents.get(conn.exam_id)?.size === 0) examStudents.delete(conn.exam_id);
  broadcastToInvigilators(conn.exam_id, { type: 'student_left', exam_id: conn.exam_id, session_id });
  studentConns.delete(session_id);
}

function cleanupInvigilator(exam_id: string, conn: InvigilatorConn) {
  examRooms.get(exam_id)?.delete(conn);
  if (examRooms.get(exam_id)?.size === 0) examRooms.delete(exam_id);
}

// ─── Heartbeat sweeper — runs every 60s ───────────────────────────────────────

function startHeartbeatSweeper() {
  setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 90_000; // 90s without heartbeat = dead

    for (const [session_id, conn] of studentConns) {
      if (now - conn.last_seen > TIMEOUT) {
        conn.ws.terminate();
        cleanupStudent(session_id);
      }
    }

    for (const [exam_id, room] of examRooms) {
      for (const conn of room) {
        if (now - conn.last_seen > TIMEOUT) {
          conn.ws.terminate();
          cleanupInvigilator(exam_id, conn);
        }
      }
    }
  }, 60_000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function getWss(): WebSocketServer {
  if (wss) return wss;

  const port = Number(process.env.WS_PORT ?? 2605);
  wss = new WebSocketServer({ port });
  startHeartbeatSweeper();

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    // Per-connection state
    let joinedExamId:    string | null = null;
    let joinedSessionId: string | null = null;
    let joinedRole:      'student' | 'invigilator' | null = null;
    let invigilatorConn: InvigilatorConn | null = null;

    ws.on('message', (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());

        // ── Ping / pong ────────────────────────────────────────────
        if (msg.type === 'ping') {
          send(ws, { type: 'pong' });
          return;
        }

        // ── Heartbeat ──────────────────────────────────────────────
        if (msg.type === 'heartbeat') {
          send(ws, { type: 'heartbeat_ack' });
          const now = Date.now();
          if (msg.role === 'student' && msg.session_id) {
            const conn = studentConns.get(msg.session_id);
            if (conn) conn.last_seen = now;
          } else if (invigilatorConn) {
            invigilatorConn.last_seen = now;
          }
          return;
        }

        // ── Join exam ──────────────────────────────────────────────
        if (msg.type === 'join_exam') {
          joinedExamId = msg.exam_id;
          joinedRole   = msg.role;

          if (msg.role === 'invigilator') {
            invigilatorConn = { ws, last_seen: Date.now() };
            if (!examRooms.has(msg.exam_id)) examRooms.set(msg.exam_id, new Set());
            examRooms.get(msg.exam_id)!.add(invigilatorConn);

            // Send current room state snapshot
            send(ws, { type: 'room_state', students: getRoomState(msg.exam_id) });

          } else if (msg.role === 'student' && msg.session_id) {
            joinedSessionId = msg.session_id;
            const conn: StudentConn = {
              ws,
              exam_id:         msg.exam_id,
              student_id:      msg.student_id   ?? '',
              student_name:    msg.student_name ?? '',
              matric:          msg.matric       ?? '',
              status:          'in_progress',
              violation_count: 0,
              last_seen:       Date.now(),
            };
            studentConns.set(msg.session_id, conn);
            if (!examStudents.has(msg.exam_id)) examStudents.set(msg.exam_id, new Set());
            examStudents.get(msg.exam_id)!.add(msg.session_id);

            // Notify invigilators
            broadcastToInvigilators(msg.exam_id, {
              type:         'student_joined',
              exam_id:      msg.exam_id,
              session_id:   msg.session_id,
              student_id:   conn.student_id,
              student_name: conn.student_name,
              matric:       conn.matric,
            });
          }
          return;
        }

        // ── Camera frame (student → invigilators only) ─────────────
        if (msg.type === 'camera_frame') {
          const conn = studentConns.get(msg.session_id);
          if (!conn) return;
          conn.last_seen = Date.now();
          broadcastToInvigilators(msg.exam_id, {
            type:            'camera_frame_broadcast',
            session_id:      msg.session_id,
            student_name:    conn.student_name,
            matric:          conn.matric,
            frame:           msg.frame,
            status:          conn.status,
            violation_count: conn.violation_count,
          });
          return;
        }

        // ── Time sync (student reports remaining time) ─────────────
        if (msg.type === 'time_sync') {
          const conn = studentConns.get(msg.session_id);
          if (conn) conn.last_seen = Date.now();
          return;
        }

        // ── Violation (student → invigilators) ────────────────────
        if (msg.type === 'violation') {
          const conn = studentConns.get(msg.session_id);
          if (conn) {
            conn.violation_count = msg.violation_count;
            conn.last_seen = Date.now();
          }
          broadcastToInvigilators(msg.exam_id, msg);
          return;
        }

        // ── Student status update ──────────────────────────────────
        if (msg.type === 'student_status') {
          const conn = studentConns.get(msg.session_id);
          if (conn) {
            conn.status    = msg.status;
            conn.last_seen = Date.now();
          }
          broadcastToInvigilators(msg.exam_id, msg);
          return;
        }

        // ── Exam submitted ─────────────────────────────────────────
        if (msg.type === 'exam_submitted') {
          const conn = studentConns.get(msg.session_id);
          if (conn) conn.status = 'submitted';
          broadcastToInvigilators(msg.exam_id, msg);
          return;
        }

        // ── Invigilator → student commands ─────────────────────────
        if (
          msg.type === 'pause_session'   ||
          msg.type === 'resume_session'  ||
          msg.type === 'force_submit'    ||
          msg.type === 'time_correction' ||
          msg.type === 'flag_student'
        ) {
          const studentWs = studentConns.get(msg.session_id)?.ws;
          if (studentWs?.readyState === WebSocket.OPEN) {
            studentWs.send(JSON.stringify(msg));
          }
          return;
        }

        // ── Announcement (invigilator → all students in exam) ──────
        if (msg.type === 'announcement') {
          broadcastToStudentsInExam(msg.exam_id, msg);
          // Echo back to all invigilators too so they see it in their feed
          broadcastToInvigilators(msg.exam_id, msg);
          return;
        }

      } catch {
        // ignore malformed
      }
    });

    ws.on('close', () => {
      if (joinedRole === 'student' && joinedSessionId) {
        cleanupStudent(joinedSessionId);
      }
      if (joinedRole === 'invigilator' && joinedExamId && invigilatorConn) {
        cleanupInvigilator(joinedExamId, invigilatorConn);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
    });
  });

  wss.on('error', (err) => console.error('[WS] Server error:', err));
  console.log(`[WS] WebSocket server running on port ${port}`);
  return wss;
}

// ─── Server-side broadcast helpers (called from API routes) ───────────────────

export function broadcastViolation(exam_id: string, payload: object) {
  broadcastToInvigilators(exam_id, { type: 'violation', ...payload });
}

export function broadcastStudentStatus(exam_id: string, session_id: string, status: string) {
  const conn = studentConns.get(session_id);
  if (conn) conn.status = status;
  broadcastToInvigilators(exam_id, { type: 'student_status', exam_id, session_id, status });
}

export function registerStudentSocket(session_id: string, ws: WebSocket) {
  // Legacy shim — new flow uses join_exam message
  const existing = studentConns.get(session_id);
  if (existing) existing.ws = ws;
}

export function unregisterStudentSocket(session_id: string) {
  cleanupStudent(session_id);
}

export function sendToStudent(session_id: string, payload: object) {
  const conn = studentConns.get(session_id);
  if (conn?.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(payload));
  }
}

export function getExamRoomSize(exam_id: string): number {
  return examRooms.get(exam_id)?.size ?? 0;
}