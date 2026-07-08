import type { PageServerLoad } from './$types'
import { verifyResetLink } from '$lib/server/auth/resetLinkToken'
import { verifyResetToken } from '$lib/server/auth/reset'

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token') ?? ''

  if (!token) {
    return { valid: false as const, error: 'This link is missing its token.' }
  }

  const linkCheck = verifyResetLink(token)
  if (!linkCheck.valid || !linkCheck.payload) {
    return { valid: false as const, error: linkCheck.error ?? 'This link is invalid.' }
  }

  // The signature only proves the link wasn't tampered with — still confirm
  // the underlying code is actually live in the DB (not expired/consumed)
  // before showing it to anyone, e.g. an email-scanner prefetch shouldn't
  // matter, but a stale link after the code was already used should say so.
  const dbCheck = await verifyResetToken(linkCheck.payload.code)
  if (!dbCheck.valid) {
    return { valid: false as const, error: dbCheck.error ?? 'This code is no longer valid.' }
  }

  if (dbCheck.userId !== linkCheck.payload.userId || dbCheck.userType !== linkCheck.payload.userType) {
    return { valid: false as const, error: 'This link is invalid.' }
  }

  return { valid: true as const, code: linkCheck.payload.code }
}