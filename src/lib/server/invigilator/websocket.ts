// src/lib/server/invigilator/websocket.ts
// WebSocket server for the invigilator live monitor.
// Mounted in hooks.server.ts via the handleUpgrade helper.
//
// Message flow:
//   Client → server: { type: 'auth', token: '...' }
//   Server → client: { type: 'snapshot', sessions: [...] }
//   Server → client: { type: 'update', session: {...} }
//   Server → client: { type: 'violation', sessionId, violation: {...} }

import { WebSocketServer, type WebSocket } from 'ws'
import { getPrismaClient } from '$lib/server/db/index.js';import { getStaffByToken } from '$lib/components'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveSession {
  sessionId: string
  studentId: string
  studentName: string
  matricNumber: string
  status: string
  currentQuestion: number
  totalQuestions: number
  timeRemainingSeconds: number | null
  answeredCount: number
  violationCount: number
  lastViolationType: string | null
  isOnline: boolean
  faceVerifiedAt: string | null
  startedAt: string | null
}

interface InvigilatorClient {
  ws: WebSocket
  staffId: string
  assessmentId: string
}

// ─── State ────────────────────────────────────────────────────────────────────

// Map: assessmentId → Set of connected invigilator websockets
const rooms = new Map<string, Set<InvigilatorClient>>()

// Map: assessmentId → broadcast interval
const broadcastIntervals = new Map<string, ReturnType<typeof setInterval>>()

// ─── Server setup ─────────────────────────────────────────────────────────────

export async function createInvigilatorWSS() {
    
  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws: WebSocket) => {
    let client: InvigilatorClient | null = null
    let authed = false

    // Auth timeout — disconnect if no auth within 10s
    const authTimeout = setTimeout(() => {
      if (!authed) ws.close(4001, 'Authentication timeout')
    }, 10_000)

    ws.on('message', async (raw) => {
      let msg: any
      try { msg = JSON.parse(raw.toString()) } catch { return }

      // ── Auth handshake ──────────────────────────────────────────────────
      if (msg.type === 'auth') {
        const result = await getStaffByToken(msg.token)
        if (!result) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }))
          ws.close(4001, 'Unauthorized')
          return
        }

        // Only invigilator-capable roles
        const allowed = [
          'INVIGILATOR', 'LECTURER', 'DEPARTMENT_EXAM_OFFICER',
          'COLLEGE_EXAM_OFFICER', 'UNIVERSITY_EXAM_OFFICER',
          'HOD', 'SUPER_ADMIN',
        ]
        if (!allowed.includes(result.staff.primaryRole)) {
          ws.close(4003, 'Forbidden')
          return
        }

        const assessmentId = msg.assessmentId as string
        if (!assessmentId) {
          ws.close(4000, 'assessmentId required')
          return
        }

        // Verify they're assigned to this exam
        const prisma = await getPrismaClient();
        const isAssigned = await prisma.assessmentInvigilator.findFirst({
          where: { assessmentId, staffId: result.staff.id },
        })
        const isAdmin = ['SUPER_ADMIN', 'UNIVERSITY_EXAM_OFFICER', 'HOD'].includes(result.staff.primaryRole)

        if (!isAssigned && !isAdmin) {
          ws.close(4003, 'Not assigned to this examination')
          return
        }

        clearTimeout(authTimeout)
        authed = true

        client = { ws, staffId: result.staff.id, assessmentId }

        // Join room
        if (!rooms.has(assessmentId)) {
          rooms.set(assessmentId, new Set())
        }
        rooms.get(assessmentId)!.add(client)

        // Start broadcast loop if not already running for this room
        startBroadcastLoop(assessmentId)

        // Send initial snapshot
        const snapshot = await getSnapshot(assessmentId)
        ws.send(JSON.stringify({ type: 'snapshot', sessions: snapshot }))

        return
      }

      // ── Ping / keepalive ────────────────────────────────────────────────
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    })

    ws.on('close', () => {
      if (client) {
        rooms.get(client.assessmentId)?.delete(client)
        if (rooms.get(client.assessmentId)?.size === 0) {
          stopBroadcastLoop(client.assessmentId)
          rooms.delete(client.assessmentId)
        }
      }
    })

    ws.on('error', () => ws.close())
  })

  return wss
}

// ─── Broadcast loop ───────────────────────────────────────────────────────────
// Polls DB every 5s and broadcasts diffs to all clients in the room.
// In production, replace with Postgres LISTEN/NOTIFY for lower latency.

function startBroadcastLoop(assessmentId: string) {
  if (broadcastIntervals.has(assessmentId)) return

  const interval = setInterval(async () => {
    const room = rooms.get(assessmentId)
    if (!room || room.size === 0) {
      stopBroadcastLoop(assessmentId)
      return
    }

    const sessions = await getSnapshot(assessmentId)
    const msg = JSON.stringify({ type: 'snapshot', sessions })

    for (const client of room) {
      if (client.ws.readyState === 1 /* OPEN */) {
        client.ws.send(msg)
      }
    }
  }, 5_000)

  broadcastIntervals.set(assessmentId, interval)
}

function stopBroadcastLoop(assessmentId: string) {
  const interval = broadcastIntervals.get(assessmentId)
  if (interval) {
    clearInterval(interval)
    broadcastIntervals.delete(assessmentId)
  }
}

// ─── Snapshot query ───────────────────────────────────────────────────────────

async function getSnapshot(assessmentId: string): Promise<LiveSession[]> {
  const prisma = await getPrismaClient();
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      assessmentId,
      status: { in: ['PENDING', 'IN_PROGRESS', 'PAUSED'] },
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricNumber: true,
        },
      },
      answers: { select: { questionId: true } },
      violations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { type: true },
      },
      questionOrder: { select: { questionId: true } },
    },
    orderBy: { startedAt: 'asc' },
  })

  const now = Date.now()

  return sessions.map(s => {
    const remaining = s.expiresAt
      ? Math.max(0, Math.floor((s.expiresAt.getTime() - now) / 1000))
      : null

    return {
      sessionId: s.id,
      studentId: s.studentId,
      studentName: `${s.student.firstName} ${s.student.lastName}`,
      matricNumber: s.student.matricNumber,
      status: s.status,
      currentQuestion: 0, // updated by client heartbeat (not stored in DB)
      totalQuestions: s.questionOrder.length,
      timeRemainingSeconds: remaining,
      answeredCount: s.answers.length,
      violationCount: 0, // fetched separately below
      lastViolationType: s.violations[0]?.type ?? null,
      isOnline: s.lastSyncAt
        ? (now - s.lastSyncAt.getTime()) < 60_000
        : false,
      faceVerifiedAt: s.faceVerifiedAt?.toISOString() ?? null,
      startedAt: s.startedAt?.toISOString() ?? null,
    }
  })
}

// ─── Push violation to room ───────────────────────────────────────────────────
// Called from the violation API endpoint so invigilators see it instantly

export function broadcastViolation(
  assessmentId: string,
  sessionId: string,
  violation: { type: string; severity: number; createdAt: string }
) {
  const room = rooms.get(assessmentId)
  if (!room) return

  const msg = JSON.stringify({ type: 'violation', sessionId, violation })
  for (const client of room) {
    if (client.ws.readyState === 1) {
      client.ws.send(msg)
    }
  }
}