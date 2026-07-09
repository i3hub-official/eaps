// src/lib/server/auth/verification.ts
// Email verification tokens — shared between staff and student portals

import { getPrismaClient } from '$lib/server/db/index.js'
import { hashOtp } from '$lib/security/dataProtection'
import { generateOtp, type ResetSubject } from './reset'

const VERIFICATION_TOKEN_TTL_MINUTES = 24 * 60 // 24 hours
const RESEND_COOLDOWN_MINUTES = 2
const MAX_RESENDS_PER_DAY = 5

export type VerificationSubject = ResetSubject

export async function canResendVerification(
  subject: VerificationSubject,
): Promise<{ allowed: boolean; reason?: string; cooldownMinutes?: number }> {
  const prisma = await getPrismaClient()

  const recentCount = await prisma.verificationToken.count({
    where: {
      userType: subject.type,
      staffId: subject.type === 'staff' ? subject.user.id : undefined,
      studentId: subject.type === 'student' ? subject.user.id : undefined,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })

  if (recentCount >= MAX_RESENDS_PER_DAY) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${MAX_RESENDS_PER_DAY} verification emails per day. Please try again tomorrow.`,
      cooldownMinutes: 24 * 60,
    }
  }

  const last = await prisma.verificationToken.findFirst({
    where: {
      userType: subject.type,
      staffId: subject.type === 'staff' ? subject.user.id : undefined,
      studentId: subject.type === 'student' ? subject.user.id : undefined,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (last) {
    const minutesSince = (Date.now() - last.createdAt.getTime()) / (60 * 1000)
    if (minutesSince < RESEND_COOLDOWN_MINUTES) {
      const remaining = Math.ceil(RESEND_COOLDOWN_MINUTES - minutesSince)
      return {
        allowed: false,
        reason: `Please wait ${remaining} minute${remaining > 1 ? 's' : ''} before requesting another verification email.`,
        cooldownMinutes: remaining,
      }
    }
  }

  return { allowed: true }
}

export async function createVerificationToken(subject: VerificationSubject): Promise<string> {
  const prisma = await getPrismaClient()
  const code = generateOtp()
  const tokenHash = hashOtp(code)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000)

  await prisma.verificationToken.deleteMany({
    where: {
      userType: subject.type,
      staffId: subject.type === 'staff' ? subject.user.id : undefined,
      studentId: subject.type === 'student' ? subject.user.id : undefined,
      consumedAt: null,
    },
  })

  await prisma.verificationToken.create({
    data: {
      tokenHash,
      userType: subject.type,
      staffId: subject.type === 'staff' ? subject.user.id : undefined,
      studentId: subject.type === 'student' ? subject.user.id : undefined,
      expiresAt,
    },
  })

  return code // plaintext only ever returned here, to be emailed
}

/** Read-only check — does NOT consume the token. Used to render the confirm page. */
export async function verifyVerificationToken(
  code: string,
): Promise<{ valid: boolean; error?: string; userType?: 'staff' | 'student'; userId?: string }> {
  const prisma = await getPrismaClient()
  const tokenHash = hashOtp(code)
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } })

  if (!record) {
    return { valid: false, error: 'This verification link is invalid.' }
  }
  if (record.consumedAt) {
    return { valid: false, error: 'This verification link has already been used.' }
  }
  if (record.expiresAt < new Date()) {
    return { valid: false, error: 'This verification link has expired. Please request a new one.' }
  }

  const userId = record.userType === 'staff' ? record.staffId : record.studentId
  if (!userId) {
    return { valid: false, error: 'This verification link is invalid.' }
  }

  return { valid: true, userType: record.userType as 'staff' | 'student', userId }
}

/** Consumes the token and activates the account. Only call this from a POST/button click. */
export async function consumeVerificationTokenAndActivate(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const check = await verifyVerificationToken(code)
  if (!check.valid || !check.userId || !check.userType) {
    return { success: false, error: check.error }
  }

  const tokenHash = hashOtp(code)
  const prisma = await getPrismaClient()
  const userId = check.userId
  const userType = check.userType

  try {
    await prisma.$transaction(async (tx) => {
      await tx.verificationToken.update({ where: { tokenHash }, data: { consumedAt: new Date() } })

      if (userType === 'staff') {
        const staff = await tx.staff.findUniqueOrThrow({ where: { id: userId } })
        await tx.staff.update({
          where: { id: userId },
          data: {
            emailVerifiedAt: new Date(),
            // Only flip PENDING -> ACTIVE; leave any other status
            // (e.g. SUSPENDED) untouched — verifying an email should
            // never override a moderation decision.
            status: staff.status === 'PENDING' ? 'ACTIVE' : staff.status,
          },
        })
      } else {
        const student = await tx.student.findUniqueOrThrow({ where: { id: userId } })
        await tx.student.update({
          where: { id: userId },
          data: {
            emailVerifiedAt: new Date(),
            status: student.status === 'PENDING' ? 'ACTIVE' : student.status,
          },
        })
      }
    })
    return { success: true }
  } catch (error) {
    console.error('[consumeVerificationTokenAndActivate] Error:', error)
    return { success: false, error: 'Unable to verify your account right now. Please try again.' }
  }
}

export function getVerificationTokenExpiryMinutes(): number {
  return VERIFICATION_TOKEN_TTL_MINUTES
}