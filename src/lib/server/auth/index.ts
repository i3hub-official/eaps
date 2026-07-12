// src/lib/server/auth/index.ts
import { hash, verify } from '@node-rs/argon2'

import { randomBytes } from 'crypto'
import { getPrismaClient } from '$lib/server/db/index.js'
import { searchHashFor } from '$lib/security/dataProtection'

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_TTL_DAYS = 7
const REFRESH_TTL_DAYS = 30

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id — resistant to both GPU cracking and side-channel attacks
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
}

// ─── Passwords ───────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS)
}

export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, plain, ARGON2_OPTIONS)
}

export function needsRehashCheck(storedHash: string): boolean {
  // @node-rs/argon2 has no built-in needsRehash, so parse the PHC-format
  // hash string ourselves and compare its params to ARGON2_OPTIONS.
  // Format: $argon2id$v=19$m=65536,t=3,p=4$salt$hash
  const match = storedHash.match(/^\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/)
  if (!match) return true // unrecognized format — force a rehash

  const memoryCost = Number(match[1])
  const timeCost = Number(match[2])
  const parallelism = Number(match[3])

  return (
    memoryCost !== ARGON2_OPTIONS.memoryCost ||
    timeCost !== ARGON2_OPTIONS.timeCost ||
    parallelism !== ARGON2_OPTIONS.parallelism
  )
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character'
  return null
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

function sessionExpiry(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

// ─── Staff Sessions ──────────────────────────────────────────────────────────

export async function createStaffSession(
  staffId: string,
  meta: { ipAddress?: string; userAgent?: string } = {},
) {
  const prisma = await getPrismaClient()
  const token = generateToken()
  const refreshToken = generateToken()

  const session = await prisma.staffSession.create({
    data: {
      staffId,
      token,
      refreshToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt: sessionExpiry(SESSION_TTL_DAYS),
      refreshTokenExpiresAt: sessionExpiry(REFRESH_TTL_DAYS),
    },
  })

  return { token, refreshToken, session }
}

export async function getStaffByToken(token: string) {
  const prisma = await getPrismaClient()
  const session = await prisma.staffSession.findUnique({
    where: { token },
    include: {
      staff: {
        include: {
          roleAssignments: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) return null
  if (session.staff.status !== 'ACTIVE') return null

  const permissions = new Set<string>()
  const roles = new Set<string>()
  for (const ra of session.staff.roleAssignments) {
    roles.add(ra.role.name)
    for (const rp of ra.role.permissions) {
      permissions.add(rp.permission.name)
    }
  }

  prisma.staffSession
    .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
    .catch(() => {})

  return { staff: session.staff, session, permissions, roles }
}

export async function refreshStaffSession(refreshToken: string) {
  const prisma = await getPrismaClient()
  const session = await prisma.staffSession.findUnique({
    where: { refreshToken },
    include: { staff: true },
  })

  if (!session) return null
  if (!session.refreshTokenExpiresAt || session.refreshTokenExpiresAt < new Date()) return null
  if (session.staff.status !== 'ACTIVE') return null

  const newToken = generateToken()
  const newRefreshToken = generateToken()

  const updated = await prisma.staffSession.update({
    where: { id: session.id },
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: sessionExpiry(SESSION_TTL_DAYS),
      refreshTokenExpiresAt: sessionExpiry(REFRESH_TTL_DAYS),
      lastActiveAt: new Date(),
    },
  })

  return { token: newToken, refreshToken: newRefreshToken, session: updated }
}

export async function invalidateStaffSession(token: string) {
  const prisma = await getPrismaClient()
  await prisma.staffSession.deleteMany({ where: { token } })
}

export async function invalidateAllStaffSessions(staffId: string) {
  const prisma = await getPrismaClient()
  await prisma.staffSession.deleteMany({ where: { staffId } })
}

// ─── Student Sessions ────────────────────────────────────────────────────────

export async function createStudentSession(
  studentId: string,
  meta: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string } = {},
) {
  const prisma = await getPrismaClient()
  const token = generateToken()
  const refreshToken = generateToken()

  const session = await prisma.studentSession.create({
    data: {
      studentId,
      token,
      refreshToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      deviceFingerprint: meta.deviceFingerprint,
      expiresAt: sessionExpiry(SESSION_TTL_DAYS),
      refreshTokenExpiresAt: sessionExpiry(REFRESH_TTL_DAYS),
    },
  })

  return { token, refreshToken, session }
}

export async function getStudentByToken(token: string) {
  const prisma = await getPrismaClient()
  const session = await prisma.studentSession.findUnique({
    where: { token },
    include: {
      student: {
        include: {
          department: true,
          programme: true,
          currentLevel: true,
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) return null
  if (session.student.status !== 'ACTIVE') return null

  prisma.studentSession
    .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
    .catch(() => {})

  return { student: session.student, session }
}

export async function refreshStudentSession(refreshToken: string) {
  const prisma = await getPrismaClient()
  const session = await prisma.studentSession.findUnique({
    where: { refreshToken },
    include: { student: true },
  })

  if (!session) return null
  if (!session.refreshTokenExpiresAt || session.refreshTokenExpiresAt < new Date()) return null
  if (session.student.status !== 'ACTIVE') return null

  const newToken = generateToken()
  const newRefreshToken = generateToken()

  const updated = await prisma.studentSession.update({
    where: { id: session.id },
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: sessionExpiry(SESSION_TTL_DAYS),
      refreshTokenExpiresAt: sessionExpiry(REFRESH_TTL_DAYS),
      lastActiveAt: new Date(),
    },
  })

  return { token: newToken, refreshToken: newRefreshToken, session: updated }
}

export async function invalidateStudentSession(token: string) {
  const prisma = await getPrismaClient()
  await prisma.studentSession.deleteMany({ where: { token } })
}

export async function invalidateAllStudentSessions(studentId: string) {
  const prisma = await getPrismaClient()
  await prisma.studentSession.deleteMany({ where: { studentId } })
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

export const STAFF_COOKIE = 'etest_staff_session'
export const STUDENT_COOKIE = 'etest_student_session'
export const COOKIE_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE,
}

// ─── User lookups ─────────────────────────────────────────────────────────────

export async function findStaffByEmail(email: string) {
  const prisma = await getPrismaClient()
  const emailHash = await searchHashFor(email, 'email')
  return prisma.staff.findUnique({ where: { emailHash } })
}

export async function findStudentByEmail(email: string) {
  const prisma = await getPrismaClient()
  const emailHash = await searchHashFor(email, 'email')
  return prisma.student.findUnique({ where: { emailHash } })
}