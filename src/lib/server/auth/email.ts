// src/lib/server/auth/email.ts
// STUB — no mail provider wired up yet. Replace sendMail's body with your
// actual SMTP/Resend/SendGrid call before this goes anywhere near production;
// right now it only logs.

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendMail(msg: MailMessage): Promise<void> {
  console.warn('[email] sendMail is a stub — no mail provider configured yet.')
  console.warn(`[email] Would send to ${msg.to}: ${msg.subject}`)
}

export function buildResetEmail(
  fullName: string,
  token: string,
  origin: string,
): { html: string; text: string } {
  const link = `${origin}/reset/verify?token=${encodeURIComponent(token)}`
  const text = `Hi ${fullName},\n\nYour MOUAU eTest password reset code is: ${token}\nThis code expires in 30 minutes.\n\nOr click: ${link}\n\nIf you didn't request this, ignore this email.`
  const html = `<p>Hi ${fullName},</p><p>Your MOUAU eTest password reset code is: <strong>${token}</strong></p><p>This code expires in 30 minutes.</p><p><a href="${link}">Reset your password</a></p><p>If you didn't request this, ignore this email.</p>`
  return { html, text }
}