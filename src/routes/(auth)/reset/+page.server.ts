// src/routes/(auth)/reset-password/+page.server.ts
import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'
import {
  findAccountByEmail,
  canRequestReset,
  createPasswordReset,
  getResetTokenExpiryMinutes,
  getRateLimitInfo,
} from '$lib/server/auth/reset'

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData()
    const email = form.get('email')?.toString() ?? ''

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'Please enter a valid email address.' })
    }

    // Check rate limits first
    const rateCheck = await canRequestReset(email)
    if (!rateCheck.allowed) {
      return fail(429, { 
        error: rateCheck.reason,
        cooldownMinutes: rateCheck.cooldownMinutes
      })
    }

    // Find the account
    const account = await findAccountByEmail(email)
    if (!account) {
      // Don't reveal if email exists or not (security)
      return { 
        success: true, 
        message: `If an account exists with this email, we've sent a reset code.` 
      }
    }

    // Check if account is active
    if (account.user.status !== 'ACTIVE') {
      return fail(403, { 
        error: 'This account is not active. Please contact support for assistance.' 
      })
    }

    // Create reset token
    const token = await createPasswordReset(account)
    const expiryMinutes = getResetTokenExpiryMinutes()
    const rateLimitInfo = getRateLimitInfo()

    // In production, send email with the token
    // For now, just return success
    console.log(`[RESET] Token for ${email}: ${token}`)

    return { 
      success: true,
      message: `A verification code has been sent to your email. It will expire in ${expiryMinutes} minutes.`,
      expiryMinutes,
      rateLimitInfo
    }
  }
}