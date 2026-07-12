// src/hooks.server.ts
// Populates event.locals.user / event.locals.session from the staff or
// student session cookie on every request, redirects already-authenticated
// users away from guest-only routes ("/", "/login", "/forgot-password"),
// and mounts the invigilator WebSocket server on HTTP upgrade requests
// (SvelteKit doesn't handle WS natively — we intercept the upgrade event
// from the underlying Node HTTP server).

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
import { enforceGuestOnly } from '$lib/server/auth/guestOnly.js'

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
  const studentToken = cookies.get(STUDENT_COOKIE)

  if (!staffToken && !studentToken) {
    return { user: null, session: null }
  }

  // Optimize throughput by resolving tokens concurrently rather than sequentially waterfalling
  const [staffResult, studentResult] = await Promise.all([
    staffToken ? getStaffByToken(staffToken) : Promise.resolve(null),
    studentToken ? getStudentByToken(studentToken) : Promise.resolve(null)
  ])

  if (staffToken) {
    if (staffResult) {
      const { staff, session, permissions, roles } = staffResult
      return {
        user: {
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
        },
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

  if (studentToken) {
    if (studentResult) {
      const { student, session } = studentResult
      return {
        user: {
          type: 'student',
          id: student.id,
          matricNumber: safeDecrypt(() => revealMatricNumber(student.matricNumber), ''),
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
        },
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

  // Must run AFTER `user` is resolved above — it decides whether to bounce
  // an already-authenticated visitor off "/", "/login", and
  // "/forgot-password" toward their dashboard instead. Throws a redirect
  // (via SvelteKit's `redirect()`), which propagates up through this
  // handle function same as any other thrown redirect.
  enforceGuestOnly(event.url.pathname, user)

  // Attach WS upgrade handler to the Node server on first request using early-exit guard clauses
  if (!globalThis.__wsAttached) {
    if (!wss) {
      wss = await createInvigilatorWSS()
    }
    
    const server = (event.platform as any)?.server ?? (globalThis as any).__sveltekitDevServer
    if (server) {
      server.on('upgrade', (req: any, socket: any, head: any) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/ws/invigilator')) {
          socket.destroy()
          return
        }
        wss.handleUpgrade(req, socket, head, (ws: any) => {
          wss.emit('connection', ws, req)
        })
      })
      globalThis.__wsAttached = true
    }
  }

  return resolve(event)
}