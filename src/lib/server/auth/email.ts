// src/lib/server/auth/email.ts
// Email utilities for sending password reset emails, notifications, etc.
// Uses Gmail SMTP with App Password for secure authentication

import nodemailer from 'nodemailer'
import type { Transporter, SendMailOptions } from 'nodemailer'
import { env } from '$env/dynamic/private'

// ─── Environment Variables ───────────────────────────────────────────────────

const SMTP_HOST = env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(env.SMTP_PORT || '587', 10)
const SMTP_USER = env.SMTP_USER || ''
const SMTP_PASS = env.SMTP_PASS || ''
const EMAIL_FROM = env.EMAIL_FROM || 'noreply@eaps.vercel.app'
const APP_NAME = env.APP_NAME || 'Evaluation Assessment Protocol System'
const APP_SHORT = env.APP_SHORT || 'AES'
const APP_URL = env.APP_URL || 'https://localhost:1209'

// ─── Email Provider ──────────────────────────────────────────────────────────

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP_USER and SMTP_PASS environment variables are not set')
  }
  
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // TLS uses port 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s/g, ''), // Strip any spaces
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    transporter.verify((error) => {
      if (error) {
        console.error('[email] SMTP connection error:', error)
        console.error('[email] Check your SMTP_USER and SMTP_PASS in .env')
      } else {
        console.log('[email] SMTP server is ready to send emails')
      }
    })
  }
  
  return transporter
}

// ─── Email Types ─────────────────────────────────────────────────────────────

export interface MailMessage {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content?: string | Buffer
    path?: string
    contentType?: string
  }>
}

// ─── Send Email ──────────────────────────────────────────────────────────────

export async function sendMail(msg: MailMessage): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Only ever send real emails in production. In any other environment
    // (development, test, preview), log what would have been sent instead —
    // regardless of whether SMTP credentials happen to be configured. This
    // is a stronger guarantee than the old dev-mock branch below, which
    // only mocked when SMTP_USER/SMTP_PASS were absent; a dev machine with
    // real credentials configured would otherwise have sent real mail.
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] 📧 (non-production — not sent) Email would be sent:')
      console.log(`[email] To: ${msg.to}`)
      console.log(`[email] Subject: ${msg.subject}`)
      console.log(`[email] HTML: ${msg.html.substring(0, 200)}...`)
      console.log(`[email] Text: ${msg.text.substring(0, 200)}...`)
      return { success: true, id: 'dev-mock-id' }
    }

    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP_USER and SMTP_PASS environment variables are not set')
    }

    const transporter = getTransporter()
    const from = msg.from || EMAIL_FROM

    const mailOptions: SendMailOptions = {
      from,
      to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
      cc: msg.cc ? (Array.isArray(msg.cc) ? msg.cc.join(', ') : msg.cc) : undefined,
      bcc: msg.bcc ? (Array.isArray(msg.bcc) ? msg.bcc.join(', ') : msg.bcc) : undefined,
      attachments: msg.attachments,
    }

    const info = await transporter.sendMail(mailOptions)
    
    console.log(`[email] Email sent successfully to ${msg.to}`)
    console.log(`[email] Message ID: ${info.messageId}`)
    
    return { success: true, id: info.messageId }
  } catch (error) {
    console.error('[email] Failed to send email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    }
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

export function buildResetEmail(
  fullName: string,
  linkToken: string,
  origin: string = APP_URL,
  expiryMinutes: number = 30,
): { html: string; text: string } {
  const revealLink = `${origin}/forgot/reveal?token=${encodeURIComponent(linkToken)}`

  const text = `
Hi ${fullName},

We received a request to reset your password for ${APP_NAME} (${APP_SHORT}).

Click the link below to view your verification code:
${revealLink}

This link will expire in ${expiryMinutes} minutes.

If you didn't request this, please ignore this email or contact support.

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
    .security { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 14px; color: #92400e; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h1>Password Reset Request</h1>

  <p>Hi ${fullName},</p>

  <p>We received a request to reset your password for your ${APP_NAME} account.</p>

  <p>Click the button below to view your verification code. Keep the tab where you started your reset open — you'll need to type the code back in there.</p>

  <p style="text-align: center;">
    <a href="${revealLink}" class="button">View my verification code</a>
  </p>

  <p>This link will expire in <strong>${expiryMinutes} minutes</strong>.</p>

  <div class="security">
    <strong>⚠️ Security Notice</strong><br>
    If you didn't request this password reset, please ignore this email or contact support immediately.
    Never share this code with anyone.
  </div>

  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af;">
      This is an automated message, please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

export function buildVerificationEmail(
  fullName: string,
  token: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const verifyLink = `${origin}/verify?token=${encodeURIComponent(token)}`
  const expiryMinutes = 24 * 60

  const text = `
Hi ${fullName},

Welcome to ${APP_NAME} (${APP_SHORT})!

Please verify your email address to complete your registration.

Your verification code is: ${token}

This code will expire in ${expiryMinutes} minutes.

Click here to verify: ${verifyLink}

If you didn't create an account, please ignore this email.

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .code { background: #f3f4f6; padding: 12px 24px; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; font-family: monospace; color: #1a56db; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h1>Welcome to ${APP_NAME}!</h1>
  
  <p>Hi ${fullName},</p>
  
  <p>Thank you for creating an account. Please verify your email address to get started.</p>
  
  <p>Your verification code is:</p>
  
  <div class="code">${token}</div>
  
  <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
  
  <p style="text-align: center;">
    <a href="${verifyLink}" class="button">Verify Email</a>
  </p>
  
  <p>If you didn't create an account, please ignore this email.</p>
  
  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

export function buildNotificationEmail(
  fullName: string,
  subject: string,
  message: string,
  actionLink?: string,
  actionText?: string,
): { html: string; text: string } {
  const text = `
Hi ${fullName},

${subject}

${message}

${actionText && actionLink ? `${actionText}: ${actionLink}` : ''}

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h2>${subject}</h2>
  
  <p>Hi ${fullName},</p>
  
  <div>${message}</div>
  
  ${actionText && actionLink ? `<p style="text-align: center;"><a href="${actionLink}" class="button">${actionText}</a></p>` : ''}
  
  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

// ─── Welcome Emails ───────────────────────────────────────────────────────────
// Sent once, right after a student self-registers or a staff account is
// seeded/provisioned — distinct from buildVerificationEmail (which asks the
// person to confirm their email) and buildResetEmail (password recovery).
// This is purely a "you're in, here's how to get started" message.

export function buildWelcomeStudentEmail(
  fullName: string,
  matricNumber: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const loginLink = `${origin}/login`

  const text = `
Hi ${fullName},

Welcome to ${APP_NAME} (${APP_SHORT})!

Your student account has been created successfully.

Matric Number: ${matricNumber}

You can now log in to:
- Register your courses for the semester
- Enroll your face for exam verification
- View upcoming tests and examinations
- Track your results once released

Log in here: ${loginLink}

If you didn't create this account, please contact the registrar's office.

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .detail-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 600; color: #1a1a1a; }
    .checklist { padding-left: 20px; }
    .checklist li { margin-bottom: 8px; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h1>Welcome, ${fullName}!</h1>

  <p>Your student account has been created successfully. You're all set to get started.</p>

  <div class="detail-box">
    <div class="detail-row">
      <span class="detail-label">Matric Number</span>
      <span class="detail-value">${matricNumber}</span>
    </div>
  </div>

  <p><strong>Here's what you can do next:</strong></p>
  <ul class="checklist">
    <li>Register your courses for the semester</li>
    <li>Enroll your face for exam verification</li>
    <li>View upcoming tests and examinations</li>
    <li>Track your results once released</li>
  </ul>

  <p style="text-align: center;">
    <a href="${loginLink}" class="button">Log in to your account</a>
  </p>

  <p style="font-size: 13px; color: #6b7280;">
    If you didn't create this account, please contact the registrar's office.
  </p>

  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af;">
      This is an automated message, please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

export function buildWelcomeStaffEmail(
  fullName: string,
  staffNumber: string,
  roleDisplayName: string,
  temporaryPassword?: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const loginLink = `${origin}/login`

  const text = `
Hi ${fullName},

Welcome to ${APP_NAME} (${APP_SHORT})!

Your staff account has been created successfully.

Staff Number: ${staffNumber}
Role: ${roleDisplayName}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}

${temporaryPassword ? 'You will be asked to change this password when you first log in.' : ''}

Log in here: ${loginLink}

If you believe this account was created in error, please contact the system administrator.

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .detail-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 600; color: #1a1a1a; }
    .credential { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 14px; color: #92400e; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h1>Welcome, ${fullName}!</h1>

  <p>Your staff account has been created successfully.</p>

  <div class="detail-box">
    <div class="detail-row">
      <span class="detail-label">Staff Number</span>
      <span class="detail-value">${staffNumber}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Role</span>
      <span class="detail-value">${roleDisplayName}</span>
    </div>
  </div>

  ${temporaryPassword ? `
  <div class="credential">
    <strong>🔑 Temporary Password:</strong> <code>${temporaryPassword}</code><br>
    You will be asked to change this password the first time you log in.
  </div>
  ` : ''}

  <p style="text-align: center;">
    <a href="${loginLink}" class="button">Log in to your account</a>
  </p>

  <p style="font-size: 13px; color: #6b7280;">
    If you believe this account was created in error, please contact the system administrator.
  </p>

  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af;">
      This is an automated message, please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

// ─── Login Alert Email ────────────────────────────────────────────────────────
// Sent on every successful login, fire-and-forget, purely informational —
// lets the account owner notice a login they don't recognize. Not a
// verification step and never blocks sign-in.

export function buildLoginAlertEmail(
  fullName: string,
  loginTime: Date,
  ipAddress?: string,
  userAgent?: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const resetLink = `${origin}/forgot`
  const formattedTime = loginTime.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const text = `
Hi ${fullName},

Your ${APP_NAME} (${APP_SHORT}) account was just signed in to.

Time: ${formattedTime}
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${userAgent ? `Device: ${userAgent}` : ''}

If this was you, no action is needed.

If you don't recognize this login, reset your password immediately:
${resetLink}

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .detail-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; gap: 12px; }
    .detail-label { color: #6b7280; white-space: nowrap; }
    .detail-value { font-weight: 600; color: #1a1a1a; text-align: right; word-break: break-word; }
    .security { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 14px; color: #92400e; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h1>New Sign-in to Your Account</h1>

  <p>Hi ${fullName},</p>

  <p>Your account was just signed in to.</p>

  <div class="detail-box">
    <div class="detail-row">
      <span class="detail-label">Time</span>
      <span class="detail-value">${formattedTime}</span>
    </div>
    ${ipAddress ? `
    <div class="detail-row">
      <span class="detail-label">IP Address</span>
      <span class="detail-value">${ipAddress}</span>
    </div>
    ` : ''}
    ${userAgent ? `
    <div class="detail-row">
      <span class="detail-label">Device</span>
      <span class="detail-value">${userAgent}</span>
    </div>
    ` : ''}
  </div>

  <p>If this was you, no action is needed — you can safely ignore this email.</p>

  <div class="security">
    <strong>⚠️ Don't recognize this login?</strong><br>
    Reset your password immediately to secure your account.
  </div>

  <p style="text-align: center;">
    <a href="${resetLink}" class="button">Reset my password</a>
  </p>

  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af;">
      This is an automated message, please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

// ─── Staff Invitation (Pre-onboarding) Email ─────────────────────────────────
// Sent when an admin pre-onboards a staff member, before any Staff row
// exists. Contains the identification token needed to complete onboarding
// at /onboarding — distinct from buildWelcomeStaffEmail, which is
// sent AFTER a staff account already exists.

export function buildStaffInvitationEmail(
  email: string,
  roleDisplayName: string,
  collegeName: string,
  departmentName: string,
  courseList: string[],
  token: string,
  expiryHours: number,
  origin: string = APP_URL,
): { html: string; text: string } {
const onboardLink = `${origin}/onboarding#token=${encodeURIComponent(token)}`
  const coursesText = courseList.length > 0 ? courseList.join(', ') : '(none assigned yet)'

  const text = `
Hello,

You've been pre-onboarded as staff at ${APP_NAME} (${APP_SHORT}).

Role: ${roleDisplayName}
College: ${collegeName}
Department: ${departmentName}
Courses: ${coursesText}

To complete your account setup, use the link below. This link contains your
identification token and will expire in ${expiryHours} hours.

${onboardLink}

If you were not expecting this invitation, you can safely ignore this email.

---
${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System
${APP_URL}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a56db; }
    .subtitle { font-size: 14px; color: #6b7280; font-weight: normal; }
    .detail-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; gap: 12px; }
    .detail-label { color: #6b7280; white-space: nowrap; }
    .detail-value { font-weight: 600; color: #1a1a1a; text-align: right; word-break: break-word; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${APP_NAME} <span class="subtitle">(${APP_SHORT})</span></div>
  </div>

  <h1>You've Been Invited to Join ${APP_SHORT}</h1>

  <p>You've been pre-onboarded as staff. Here are the details on file:</p>

  <div class="detail-box">
    <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">${roleDisplayName}</span></div>
    <div class="detail-row"><span class="detail-label">College</span><span class="detail-value">${collegeName}</span></div>
    <div class="detail-row"><span class="detail-label">Department</span><span class="detail-value">${departmentName}</span></div>
    <div class="detail-row"><span class="detail-label">Courses</span><span class="detail-value">${coursesText}</span></div>
  </div>

  <p>Click below to complete your account setup. This link contains your identification token.</p>

  <p style="text-align: center;">
    <a href="${onboardLink}" class="button">Complete my onboarding</a>
  </p>

  <p>This link will expire in <strong>${expiryHours} hours</strong>.</p>

  <p style="font-size: 13px; color: #6b7280;">
    If you were not expecting this invitation, you can safely ignore this email.
  </p>

  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Evaluation Assessment Protocol System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af;">
      This is an automated message, please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { html, text }
}

// ─── Send Emails ─────────────────────────────────────────────────────────────

export async function sendResetEmail(
  email: string,
  fullName: string,
  linkToken: string,
  origin?: string,
  expiryMinutes?: number,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildResetEmail(fullName, linkToken, origin, expiryMinutes)

  return sendMail({
    to: email,
    subject: `Reset Your ${APP_SHORT} Password`,
    html,
    text,
  })
}

export async function sendVerificationEmail(
  email: string,
  fullName: string,
  token: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildVerificationEmail(fullName, token, origin)
  
  return sendMail({
    to: email,
    subject: `Verify Your ${APP_SHORT} Account`,
    html,
    text,
  })
}

export async function sendWelcomeStudentEmail(
  email: string,
  fullName: string,
  matricNumber: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildWelcomeStudentEmail(fullName, matricNumber, origin)

  return sendMail({
    to: email,
    subject: `Welcome to ${APP_SHORT}`,
    html,
    text,
  })
}

export async function sendWelcomeStaffEmail(
  email: string,
  fullName: string,
  staffNumber: string,
  roleDisplayName: string,
  temporaryPassword?: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildWelcomeStaffEmail(fullName, staffNumber, roleDisplayName, temporaryPassword, origin)

  return sendMail({
    to: email,
    subject: `Welcome to ${APP_SHORT}`,
    html,
    text,
  })
}

export async function sendLoginAlertEmail(
  email: string,
  fullName: string,
  loginTime: Date,
  ipAddress?: string,
  userAgent?: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildLoginAlertEmail(fullName, loginTime, ipAddress, userAgent, origin)

  return sendMail({
    to: email,
    subject: `New sign-in to your ${APP_SHORT} account`,
    html,
    text,
  })
}

// ─── Staff Invitation Email ─────────────────────────────────────────────────

export async function sendStaffInvitationEmail(
  email: string,
  roleDisplayName: string,
  collegeName: string,
  departmentName: string,
  courseList: string[],
  token: string,
  expiryHours: number,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildStaffInvitationEmail(
    email, roleDisplayName, collegeName, departmentName, courseList, token, expiryHours, origin
  )

  return sendMail({
    to: email,
    subject: `You're invited to join ${APP_SHORT}`,
    html,
    text,
  })
}

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getEmailConfigStatus(): { 
  configured: boolean; 
  provider: string; 
  from: string; 
  host: string;
  appName: string;
  appShort: string;
} {
  return {
    configured: !!SMTP_USER && !!SMTP_PASS,
    provider: SMTP_USER ? 'Gmail SMTP' : 'None (Development Mode)',
    from: EMAIL_FROM,
    host: SMTP_HOST,
    appName: APP_NAME,
    appShort: APP_SHORT,
  }
}

export function isEmailConfigured(): boolean {
  return !!SMTP_USER && !!SMTP_PASS
}

export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      return { success: false, error: 'SMTP credentials not configured' }
    }
    
    const transporter = getTransporter()
    await transporter.verify()
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}