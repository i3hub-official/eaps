// src/lib/server/auth/reset.ts
// Password reset tokens — shared between staff and student portals

import { randomInt } from 'crypto'
import { getPrismaClient } from '$lib/server/db/index.js'
import type { Staff, Student } from '@prisma/client'

const RESET_TOKEN_TTL_MINUTES = 30

function generateOtp(): string {
  // 6-char alphanumeric, uppercase, no ambiguous chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[randomInt(chars.length)]
  return out
}

export type ResetSubject =
  | { type: 'staff'; user: Staff }
  | { type: 'student'; user: Student }

/** Look up an account by email across both Staff and Student tables. */
export async function findAccountByEmail(email: string): Promise<ResetSubject | null> {
  const prisma = await getPrismaClient()
  const normalized = email.trim().toLowerCase()

  const staff = await prisma.staff.findUnique({ where: { email: normalized } })
  if (staff) return { type: 'staff', user: staff }

  const student = await prisma.student.findUnique({ where: { email: normalized } })
  if (student) return { type: 'student', user: student }

  return null
}

export async function createPasswordReset(subject: ResetSubject): Promise<string> {
  const prisma = await getPrismaClient()
  const token = generateOtp()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: {
      token,
      userType: subject.type,
      staffId: subject.type === 'staff' ? subject.user.id : undefined,
      studentId: subject.type === 'student' ? subject.user.id : undefined,
      expiresAt,
    },
  })

  return token
}

export async function verifyResetToken(
  token: string,
): Promise<{ valid: boolean; error?: string; userType?: 'staff' | 'student'; userId?: string }> {
  const prisma = await getPrismaClient()
  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) return { valid: false, error: 'Invalid code.' }
  if (record.consumedAt) return { valid: false, error: 'This code has already been used.' }
  if (record.expiresAt < new Date()) return { valid: false, error: 'This code has expired.' }

  const userId = record.userType === 'staff' ? record.staffId : record.studentId
  if (!userId) return { valid: false, error: 'Invalid code.' }

  return { valid: true, userType: record.userType as 'staff' | 'student', userId }
}

export async function consumeResetToken(token: string): Promise<void> {
  const prisma = await getPrismaClient()
  await prisma.passwordResetToken.update({
    where: { token },
    data: { consumedAt: new Date() },
  })
}