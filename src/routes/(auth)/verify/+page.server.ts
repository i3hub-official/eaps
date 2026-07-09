import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import {
  verifyVerificationToken,
  consumeVerificationTokenAndActivate,
  createVerificationToken,
  canResendVerification,
  getVerificationTokenExpiryMinutes,
} from '$lib/server/auth/verification'
import { findAccountByEmail } from '$lib/server/auth/reset'
import { revealEmail, revealName } from '$lib/security/dataProtection'
import { sendVerificationEmail } from '$lib/server/auth/email'
import type { ResetSubject } from '$lib/server/auth/reset'

function safeDecrypt<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function decryptContact(account: ResetSubject): { email: string | null; fullName: string } {
  const email = safeDecrypt(() => revealEmail(account.user.email), null)
  const firstName = safeDecrypt(() => revealName(account.user.firstName), '')
  const lastName = safeDecrypt(() => revealName(account.user.lastName), '')
  return { email, fullName: `${firstName} ${lastName}`.trim() || 'there' }
}

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token') ?? ''

  if (!token) {
    return { status: 'missing' as const, token: '' }
  }

  const check = await verifyVerificationToken(token)
  if (!check.valid) {
    return { status: 'invalid' as const, error: check.error ?? 'This verification link is invalid.', token }
  }

  return { status: 'ready' as const, token }
}

export const actions: Actions = {
  confirm: async ({ request }) => {
    const form = await request.formData()
    const token = form.get('token')?.toString() ?? ''

    if (!token) {
      return fail(400, { error: 'Missing verification token.' })
    }

    const result = await consumeVerificationTokenAndActivate(token)
    if (!result.success) {
      return fail(400, { error: result.error ?? 'Unable to verify your account.' })
    }

    return { success: true }
  },

  resend: async ({ request, url }) => {
    const form = await request.formData()
    const identifier = form.get('identifier')?.toString()?.trim() ?? ''

    if (!identifier) {
      return fail(400, { resendError: 'Please enter your email address.' })
    }

    const account = await findAccountByEmail(identifier)
    if (!account) {
      // Don't reveal whether the account exists.
      return {
        resendSuccess: true,
        resendMessage: "If an account exists, we've sent a new verification link.",
      }
    }

    const rateCheck = await canResendVerification(account)
    if (!rateCheck.allowed) {
      return fail(429, { resendError: rateCheck.reason })
    }

    const { email, fullName } = decryptContact(account)
    if (!email) {
      console.error('[verify/resend] Could not decrypt email for account', account.user.id)
      return fail(500, { resendError: 'Unable to send verification email right now.' })
    }

    const token = await createVerificationToken(account)
    const sendResult = await sendVerificationEmail(email, fullName, token, url.origin)
    if (!sendResult.success) {
      console.error('[verify/resend] Failed to send verification email:', sendResult.error)
      return fail(500, { resendError: 'Unable to send verification email right now.' })
    }

    const hours = Math.round(getVerificationTokenExpiryMinutes() / 60)
    return {
      resendSuccess: true,
      resendMessage: `A new verification link has been sent. It will expire in ${hours} hours.`,
    }
  },
}