// src/lib/server/auth/email.ts
// Simple email sender — uses nodemailer with SMTP env vars.
// In dev, logs to console if SMTP is not configured.

import { createTransport } from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return createTransport({
    host,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface SendMailOpts {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
}

export async function sendMail(opts: SendMailOpts): Promise<void> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? 'MOUAU eTest <noreply@mouau.edu.ng>';

  if (!transport) {
    // Dev fallback — print to console
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[EMAIL DEV] To:', opts.to);
    console.log('[EMAIL DEV] Subject:', opts.subject);
    console.log('[EMAIL DEV] Body:\n', opts.text);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  await transport.sendMail({ from, ...opts });
}

// ─── Reset email template ─────────────────────────────────────────

export function buildResetEmail(fullName: string, token: string, origin: string) {
  const verifyUrl = `${origin}/reset/verify?token=${token}`;
  const appName   = process.env.PUBLIC_APP_NAME ?? 'MOUAU eTest';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#1e40af);padding:32px 40px;text-align:center;">
              <h1 style="color:white;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em;">
                📋 ${appName}
              </h1>
              <p style="color:rgba(191,219,254,0.9);font-size:13px;margin:6px 0 0;">
                Michael Okpara University of Agriculture
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="font-size:15px;color:#0f172a;margin:0 0 8px;">Hi ${fullName},</p>
              <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">
                We received a request to reset your ${appName} password.
                Use the code below to complete your reset — it expires in <strong>15 minutes</strong>.
              </p>

              <!-- OTP Token -->
              <div style="text-align:center;margin:0 0 24px;">
                <div style="display:inline-block;background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:20px 40px;">
                  <p style="font-size:11px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">
                    Your Reset Code
                  </p>
                  <p style="font-size:36px;font-weight:900;color:#1d4ed8;letter-spacing:0.15em;margin:0;font-family:monospace;">
                    ${token}
                  </p>
                </div>
              </div>

              <p style="font-size:13px;color:#64748b;margin:0 0 16px;">
                Or click the button below — this will open a new tab showing your code,
                which you can then enter into your browser.
              </p>

              <!-- CTA -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${verifyUrl}"
                  style="display:inline-block;background:#2563eb;color:white;text-decoration:none;
                         padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;
                         letter-spacing:0.01em;">
                  Verify My Code →
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;" />

              <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">
                If you didn't request this, you can safely ignore this email.
                Your password will not change.
              </p>
              <p style="font-size:12px;color:#94a3b8;margin:0;">
                This code expires in 15 minutes and can only be used once.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="font-size:11px;color:#94a3b8;margin:0;">
                ${appName} · Michael Okpara University of Agriculture, Umudike
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${fullName},

Your ${appName} password reset code is: ${token}

This code expires in 15 minutes and can only be used once.

You can also verify it by visiting:
${verifyUrl}

If you didn't request this, please ignore this email.

— ${appName} Team`;

  return { html, text };
}