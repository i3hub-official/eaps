// src/hooks.server.ts
// Populates event.locals.user / event.locals.session from the staff or
// student session cookie on every request, and mounts the invigilator
// WebSocket server on HTTP upgrade requests (SvelteKit doesn't handle WS
// natively — we intercept the upgrade event from the underlying Node
// HTTP server).

import type { Handle, Cookies } from '@sveltejs/kit'
import { createInvigilatorWSS } from '$lib/server/invigilator/websocket'
import {
  STAFF_COOKIE,
  STUDENT_COOKIE,
  cookieOptions,
  getStaffByToken,
  getStudentByToken,
} from '$lib/server/auth'
import { revealEmail, revealMatricNumber, revealName } from '$lib/security/dataProtection'
import type { User, Session } from '$lib/server/auth/types'
import type { StaffRole } from '@prisma/client'

let wss: any = null

declare global {
  var __wsAttached: boolean
}

if (typeof globalThis.__wsAttached === 'undefined') {
  globalThis.__wsAttached = false
}

// Encrypted fields can fail to decrypt if the stored ciphertext is stale or
// corrupt — fall back rather than throwing and taking down the whole request.
function safeDecrypt(fn: () => string, fallback: string): string {
  try {
    return fn()
  } catch {
    return fallback
  }
}

async function loadSessionFromCookies(
  cookies: Cookies,
): Promise<{ user: User | null; session: Session | null }> {
const staffToken = cookies.get(STAFF_COOKIE)

if (staffToken) {
  const result = await getStaffByToken(staffToken)
  if (result) {
    const { staff, session, permissions, roles } = result

    const user: User = {
      type: 'staff',
      id: staff.id,
      staffNumber: staff.staffNumber,
      email: safeDecrypt(() => revealEmail(staff.email), ''),
      firstName: safeDecrypt(() => revealName(staff.firstName), ''),
      lastName: safeDecrypt(() => revealName(staff.lastName), ''),
      primaryRole: staff.primaryRole,
      collegeId: staff.collegeId,
      departmentId: staff.departmentId,
      status: staff.status,
      roles: Array.from(roles) as StaffRole[],
      permissions: Array.from(permissions),
    }

    return {
      user,
      session: {
        id: session.id,
        token: session.token,
        userType: 'staff',
        expiresAt: session.expiresAt,
      },
    }
  }
  cookies.delete(STAFF_COOKIE, { path: cookieOptions.path })
}

  const studentToken = cookies.get(STUDENT_COOKIE)
  if (studentToken) {
    const result = await getStudentByToken(studentToken)
    if (result) {
      const { student, session } = result

      const user: User = {
        type: 'student',
        id: student.id,
        matricNumber: safeDecrypt(() => revealMatricNumber(student.matricNumber),''),
        email: safeDecrypt(() => revealEmail(student.email), ''),
        firstName: safeDecrypt(() => revealName(student.firstName), ''),
        otherNames: safeDecrypt(() => revealName(student.otherNames), ''),
        lastName: safeDecrypt(() => revealName(student.lastName), ''),
        department: student.department,
        program: student.programme,
        currentLevel: student.currentLevel,
        collegeId: student.collegeId,
        departmentId: student.departmentId,
        programmeId: student.programmeId,
        currentLevelId: student.currentLevelId,
        status: student.status,
      }

      return {
        user,
        session: {
          id: session.id,
          token: session.token,
          userType: 'student',
          expiresAt: session.expiresAt,
        },
      }
    }
    cookies.delete(STUDENT_COOKIE, { path: cookieOptions.path })
  }

  return { user: null, session: null }
}

export const handle: Handle = async ({ event, resolve }) => {
  const { user, session } = await loadSessionFromCookies(event.cookies)
  event.locals.user = user
  event.locals.session = session

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