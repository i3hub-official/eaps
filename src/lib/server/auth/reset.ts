
// src/lib/server/auth/reset.ts
import { createHash, randomBytes } from 'crypto';
import { sql } from '$lib/server/db/index.js';

// ─── Token generation ─────────────────────────────────────────────

/** Generate a 6-char uppercase alphanumeric OTP */
export function generateOTP(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
  let result = '';
  const bytes = randomBytes(6);
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── Create reset ─────────────────────────────────────────────────

export async function createPasswordReset(userId: string): Promise<string> {
  // Invalidate any existing tokens for this user
  await sql(`UPDATE password_resets SET used = true WHERE user_id = $1`, [userId]);

  const token    = generateOTP();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await sql(
    `INSERT INTO password_resets (user_id, token, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, tokenHash, expiresAt]
  );

  return token;
}

// ─── Verify token ─────────────────────────────────────────────────

export interface ResetTokenResult {
  valid: boolean;
  userId?: string;
  token?: string;
  error?: string;
}

export async function verifyResetToken(token: string): Promise<ResetTokenResult> {
  const tokenHash = hashToken(token.toUpperCase().trim());

  const rows = await sql<{
    id: string; user_id: string; token: string;
    used: boolean; expires_at: Date;
  }>(
    `SELECT id, user_id, token, used, expires_at
     FROM password_resets
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (!rows[0]) return { valid: false, error: 'Invalid token.' };
  if (rows[0].used) return { valid: false, error: 'This token has already been used.' };
  if (new Date(rows[0].expires_at) < new Date()) {
    return { valid: false, error: 'This token has expired. Please request a new one.' };
  }

  return { valid: true, userId: rows[0].user_id, token: rows[0].token };
}

// ─── Consume token ────────────────────────────────────────────────

export async function consumeResetToken(token: string): Promise<void> {
  const tokenHash = hashToken(token.toUpperCase().trim());
  await sql(
    `UPDATE password_resets SET used = true WHERE token_hash = $1`,
    [tokenHash]
  );
}