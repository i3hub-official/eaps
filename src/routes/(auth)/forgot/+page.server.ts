// src/routes/(auth)/forgot/+page.server.ts
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import {
  findAccountByEmail,
  canRequestReset,
  createPasswordReset,
  verifyResetToken,
  consumeResetToken,
  getResetTokenExpiryMinutes,
} from '$lib/server/auth/reset'
import { hashPassword, validatePasswordStrength } from '$lib/server/auth'
import { getPrismaClient } from '$lib/server/db/index.js'
import { revealEmail, revealName } from '$lib/security/dataProtection'
import { sendResetEmail } from '$lib/server/auth/email'
import type { ResetSubject } from '$lib/server/auth/reset'

export const load: PageServerLoad = async () => {
  return {}
}

function safeDecrypt<T>(decryptFn: () => T, fallback: T): T {
  try {
    return decryptFn()
  } catch {
    return fallback
  }
}

function decryptContact(account: ResetSubject): { email: string | null; fullName: string } {
  const email = safeDecrypt(() => revealEmail(account.user.email), null)
  const firstName = safeDecrypt(() => revealName(account.user.firstName), '')
  const lastName = safeDecrypt(() => revealName(account.user.lastName), '')
  const fullName = `${firstName} ${lastName}`.trim() || 'there'
  return { email, fullName }
}

export const actions: Actions = {
  // Step 1: Request OTP
  requestOtp: async ({ request, url }) => {
    const form = await request.formData()
    const identifier = form.get('identifier')?.toString()?.trim() ?? ''

    if (!identifier) {
      return fail(400, { 
        step: 'identifier',
        error: 'Please enter your email or matric number.' 
      })
    }

    // Check rate limits
    const rateCheck = await canRequestReset(identifier)
    if (!rateCheck.allowed) {
      return fail(429, { 
        step: 'identifier',
        error: rateCheck.reason,
        cooldownMinutes: rateCheck.cooldownMinutes
      })
    }

    // Find the account
    const account = await findAccountByEmail(identifier)
    if (!account) {
      // Don't reveal if email exists or not (security)
      return {
        step: 'otp',
        success: true,
        identifier,
        message: 'If an account exists, we\'ve sent a verification code.'
      }
    }

    // Check if account is active
    if (account.user.status !== 'ACTIVE') {
      return fail(403, { 
        step: 'identifier',
        error: 'This account is not active. Please contact support for assistance.' 
      })
    }

    // Create reset token
    const token = await createPasswordReset(account)
    const expiryMinutes = getResetTokenExpiryMinutes()

    // Send to the account's real, decrypted email — never the raw identifier,
    // since that could be a matric number rather than an address.
    const { email, fullName } = decryptContact(account)

    if (!email) {
      console.error('[requestOtp] Could not decrypt email for account', account.user.id)
      return fail(500, {
        step: 'identifier',
        error: 'Unable to send verification code right now. Please try again shortly.',
      })
    }

    const sendResult = await sendResetEmail(email, fullName, token, url.origin)
    if (!sendResult.success) {
      console.error('[requestOtp] Failed to send reset email:', sendResult.error)
      return fail(500, {
        step: 'identifier',
        error: 'Unable to send verification code right now. Please try again shortly.',
      })
    }

    return {
      step: 'otp',
      success: true,
      identifier,
      expiryMinutes,
      message: `A verification code has been sent to your email. It will expire in ${expiryMinutes} minutes.`
    }
  },

  // Step 2: Verify OTP
  verifyOtp: async ({ request }) => {
    const form = await request.formData()
    const token = form.get('otp')?.toString()?.trim() ?? ''
    const identifier = form.get('identifier')?.toString()?.trim() ?? ''

    if (!token || token.length < 6) {
      return fail(400, { 
        step: 'otp',
        identifier,
        error: 'Please enter the 6-character verification code.' 
      })
    }

    // Verify the token
    const verification = await verifyResetToken(token)
    if (!verification.valid) {
      return fail(400, { 
        step: 'otp',
        identifier,
        error: verification.error 
      })
    }

    // Store the user info in the session or return it
    // We'll pass it to the next step via form data
    return {
      step: 'newPassword',
      success: true,
      identifier,
      userId: verification.userId,
      userType: verification.userType,
      token, // Keep the token to consume it later
    }
  },

  // Step 3: Set new password
  setPassword: async ({ request }) => {
    const form = await request.formData()
    const token = form.get('token')?.toString() ?? ''
    const userId = form.get('userId')?.toString() ?? ''
    const userType = form.get('userType')?.toString() as 'staff' | 'student' | null
    const newPassword = form.get('newPassword')?.toString() ?? ''
    const confirmPassword = form.get('confirmPassword')?.toString() ?? ''

    // Validate password
    if (!newPassword || !confirmPassword) {
      return fail(400, { 
        step: 'newPassword',
        error: 'Please enter and confirm your new password.' 
      })
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { 
        step: 'newPassword',
        error: 'Passwords do not match.' 
      })
    }

    const passwordError = validatePasswordStrength(newPassword)
    if (passwordError) {
      return fail(400, { 
        step: 'newPassword',
        error: passwordError 
      })
    }

    if (!userId || !userType || !token) {
      return fail(400, { 
        step: 'newPassword',
        error: 'Invalid reset session. Please start over.' 
      })
    }

    // Verify the token again (ensure it hasn't been consumed)
    const verification = await verifyResetToken(token)
    if (!verification.valid) {
      return fail(400, { 
        step: 'newPassword',
        error: verification.error || 'Invalid or expired verification code.' 
      })
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    const prisma = await getPrismaClient()

    // Update the user's password
    try {
      if (userType === 'staff') {
        await prisma.staff.update({
          where: { id: userId },
          data: { 
            passwordHash: hashedPassword,
            mustChangePassword: false,
          },
        })
      } else if (userType === 'student') {
        await prisma.student.update({
          where: { id: userId },
          data: { 
            passwordHash: hashedPassword,
            mustChangePassword: false,
          },
        })
      } else {
        return fail(400, { 
          step: 'newPassword',
          error: 'Invalid user type.' 
        })
      }

      // Consume the token so it can't be used again
      await consumeResetToken(token)

      // Invalidate all existing sessions for this user
      if (userType === 'staff') {
        await prisma.staffSession.deleteMany({
          where: { staffId: userId }
        })
      } else {
        await prisma.studentSession.deleteMany({
          where: { studentId: userId }
        })
      }

      return {
        step: 'success',
        success: true,
        message: 'Your password has been successfully updated.'
      }
    } catch (error) {
      console.error('[setPassword] Error:', error)
      return fail(500, { 
        step: 'newPassword',
        error: 'Unable to update password. Please try again.' 
      })
    }
  },

  // Resend OTP
  resendOtp: async ({ request, url }) => {
    const form = await request.formData()
    const identifier = form.get('identifier')?.toString()?.trim() ?? ''

    if (!identifier) {
      return fail(400, { 
        step: 'otp',
        error: 'Please provide your email or matric number.' 
      })
    }

    // Check rate limits
    const rateCheck = await canRequestReset(identifier)
    if (!rateCheck.allowed) {
      return fail(429, { 
        step: 'otp',
        identifier,
        error: rateCheck.reason,
        cooldownMinutes: rateCheck.cooldownMinutes
      })
    }

    // Find the account
    const account = await findAccountByEmail(identifier)
    if (!account) {
      return fail(404, { 
        step: 'otp',
        identifier,
        error: 'No account found with that email or matric number.' 
      })
    }

    // Create new reset token
    const token = await createPasswordReset(account)
    const expiryMinutes = getResetTokenExpiryMinutes()

    const { email, fullName } = decryptContact(account)

    if (!email) {
      console.error('[resendOtp] Could not decrypt email for account', account.user.id)
      return fail(500, {
        step: 'otp',
        identifier,
        error: 'Unable to resend verification code right now. Please try again shortly.',
      })
    }

    const sendResult = await sendResetEmail(email, fullName, token, url.origin)
    if (!sendResult.success) {
      console.error('[resendOtp] Failed to send reset email:', sendResult.error)
      return fail(500, {
        step: 'otp',
        identifier,
        error: 'Unable to resend verification code right now. Please try again shortly.',
      })
    }

    return {
      step: 'otp',
      success: true,
      identifier,
      expiryMinutes,
      message: `A new verification code has been sent. It will expire in ${expiryMinutes} minutes.`
    }
  }
}