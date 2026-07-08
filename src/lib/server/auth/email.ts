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
const EMAIL_FROM = env.EMAIL_FROM || 'noreply@reaiaes.vercel.app'
const APP_NAME = env.APP_NAME || 'Assessment Evaluation System'
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
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    })

    transporter.verify((error) => {
      if (error) {
        console.error('[email] SMTP connection error:', error)
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
    if ((!SMTP_USER || !SMTP_PASS) && process.env.NODE_ENV === 'development') {
      console.log('[email] 📧 Email would be sent:')
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
  token: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const resetLink = `${origin}/reset-password?token=${encodeURIComponent(token)}`
  const expiryMinutes = 30

  const text = `
Hi ${fullName},

We received a request to reset your password for ${APP_NAME} (${APP_SHORT}).

Your verification code is: ${token}

This code will expire in ${expiryMinutes} minutes.

If you didn't request this, please ignore this email or contact support.

For security, never share this code with anyone.

---
${APP_NAME} (${APP_SHORT}) - Assessment Evaluation System
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
  
  <p>Your verification code is:</p>
  
  <div class="code">${token}</div>
  
  <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
  
  <p>Or click the button below to reset your password:</p>
  
  <p style="text-align: center;">
    <a href="${resetLink}" class="button">Reset Password</a>
  </p>
  
  <div class="security">
    <strong>⚠️ Security Notice</strong><br>
    If you didn't request this password reset, please ignore this email or contact support immediately.
    Never share this code with anyone.
  </div>
  
  <p>For security reasons, this link will expire in ${expiryMinutes} minutes.</p>
  
  <div class="footer">
    <p>
      ${APP_NAME} (${APP_SHORT}) - Assessment Evaluation System<br>
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
${APP_NAME} (${APP_SHORT}) - Assessment Evaluation System
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
      ${APP_NAME} (${APP_SHORT}) - Assessment Evaluation System<br>
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
${APP_NAME} (${APP_SHORT}) - Assessment Evaluation System
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
      ${APP_NAME} (${APP_SHORT}) - Assessment Evaluation System<br>
      <a href="${APP_URL}" style="color: #1a56db;">${APP_URL}</a>
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
  token: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildResetEmail(fullName, token, origin)
  
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