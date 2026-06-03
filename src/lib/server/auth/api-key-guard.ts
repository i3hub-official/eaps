// src/lib/server/auth/api-key-guard.ts
//
// Drop-in middleware to protect any +server.ts route with an API key.
//
// Usage:
//   import { requireApiKey } from '$lib/server/auth/api-key-guard.js';
//
//   export const GET: RequestHandler = async ({ request }) => {
//     const auth = await requireApiKey(request, 'read_exams');
//     if (!auth.ok) return auth.response;
//     // auth.keyId is the validated key's UUID
//   };

import { json } from '@sveltejs/kit';
import { validateApiKey, logApiAccess } from '$lib/server/db/api-keys.js';
import type { ApiScope } from '@prisma/client';

type GuardSuccess = { ok: true;  keyId: string; scopes: string[] };
type GuardFailure = { ok: false; response: Response };
type GuardResult  = GuardSuccess | GuardFailure;

export async function requireApiKey(
  request: Request,
  requiredScope?: ApiScope,
  endpoint = '(unknown)'
): Promise<GuardResult> {
  const start = Date.now();
  const ip    = request.headers.get('x-forwarded-for')
    ?? request.headers.get('cf-connecting-ip')
    ?? undefined;

  const auth = request.headers.get('authorization') ?? '';
  const raw  = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!raw) {
    return {
      ok: false,
      response: json(
        { error: 'unauthorized', reason: 'missing_key' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="MOUAU eTest API"' } }
      ),
    };
  }

  const result = await validateApiKey(raw, requiredScope);

  if (!result.valid) {
    if (result.keyId) {
      logApiAccess({
        keyId: result.keyId, endpoint, method: request.method,
        statusCode: 401, ipAddress: ip, durationMs: Date.now() - start,
      }).catch(() => {});
    }
    return {
      ok: false,
      response: json(
        { error: 'unauthorized', reason: result.reason },
        { status: result.reason === 'insufficient_scope' ? 403 : 401 }
      ),
    };
  }

  // Log successful auth (non-blocking)
  logApiAccess({
    keyId: result.keyId!, endpoint, method: request.method,
    statusCode: 200, ipAddress: ip, durationMs: Date.now() - start,
  }).catch(() => {});

  return { ok: true, keyId: result.keyId!, scopes: [] };
}

// ── Rate-limit helper (token-bucket, in-memory, per key) ──────────────────────
// Replace with Redis for multi-instance deployments.
const buckets = new Map<string, { tokens: number; last: number }>();
const REFILL_RATE = 10; // tokens per second
const MAX_TOKENS  = 100;

export function checkRateLimit(keyId: string): { allowed: boolean; remaining: number } {
  const now    = Date.now() / 1000;
  const bucket = buckets.get(keyId) ?? { tokens: MAX_TOKENS, last: now };
  const delta  = now - bucket.last;
  const tokens = Math.min(MAX_TOKENS, bucket.tokens + delta * REFILL_RATE) - 1;
  buckets.set(keyId, { tokens, last: now });

  return { allowed: tokens >= 0, remaining: Math.max(0, Math.floor(tokens)) };
}