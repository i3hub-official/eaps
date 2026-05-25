// src/lib/server/auth/reset.ts
import { randomBytes } from 'crypto';
import { sql } from '$lib/server/db/index.js';

const TOKEN_TTL_MINUTES = 15;

// ── Table DDL (run once) ──────────────────────────────────────────────────────
// CREATE TABLE IF NOT EXISTS password_resets (
//   token       TEXT        PRIMARY KEY,
//   user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   expires_at  TIMESTAMPTZ NOT NULL,
//   used_at     TIMESTAMPTZ
// );
// CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

// ── Generate a 6-char alphanumeric token ──────────────────────────────────────
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  const bytes = randomBytes(6);
  return Array.from(bytes)
    .map(b => chars[b % chars.length])
    .join('');
}

// ── Create a reset token for a user ──────────────────────────────────────────
export async function createPasswordReset(userId: string): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await sql(
    `DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );

  const token     = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await sql(
    `INSERT INTO password_resets (token, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );

  return token;
}

// ── Verify a token — returns userId if valid ──────────────────────────────────
export async function verifyResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const rows = await sql<{
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT user_id, expires_at, used_at
     FROM password_resets
     WHERE token = $1`,
    [token.toUpperCase().trim()]
  );

  const row = rows[0];

  if (!row)              return { valid: false, error: 'Invalid code — check you copied it correctly.' };
  if (row.used_at)       return { valid: false, error: 'This code has already been used.' };
  if (new Date() > row.expires_at)
                         return { valid: false, error: 'Code expired — request a new one.' };

  return { valid: true, userId: row.user_id };
}

// ── Mark token as used ────────────────────────────────────────────────────────
export async function consumeResetToken(token: string): Promise<void> {
  await sql(
    `UPDATE password_resets SET used_at = now() WHERE token = $1`,
    [token.toUpperCase().trim()]
  );
}

// ── Cleanup expired tokens (call periodically) ────────────────────────────────
export async function purgeExpiredResetTokens(): Promise<void> {
  await sql(`DELETE FROM password_resets WHERE expires_at < now()`);
}