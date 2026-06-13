// src/lib/server/db/api-keys.ts
// CRUD + validation helpers for API key management

import { getPrismaClient } from './index.js';
import { randomBytes, createHash } from 'crypto';

import type { ApiScope, ApiKeyStatus } from '@prisma/client';



// ── Key generation ────────────────────────────────────────────────────────────

export function generateRawKey(): { raw: string; prefix: string; hash: string } {
  const raw = 'mk_live_' + randomBytes(32).toString('hex');
  const prefix = raw.slice(0, 16);
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, hash };
}

export function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createApiKey(params: {
  name: string;
  scopes: ApiScope[];
  createdById: string;
  expiresAt?: Date | null;
  ipWhitelist?: string[];
}) {
  const prisma = await getPrismaClient();

  const { raw, prefix, hash } = generateRawKey();

  const key = await prisma.apiKey.create({
    data: {
      name: params.name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: params.scopes,
      createdById: params.createdById,
      expiresAt: params.expiresAt ?? null,
      ipWhitelist: params.ipWhitelist ?? [],
    },
  });

  // Return raw key ONCE — never stored in plain text
  return { key, rawKey: raw };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listApiKeys(opts?: {
  status?: ApiKeyStatus;
  createdById?: string;
  limit?: number;
  offset?: number;
}) {
  const prisma = await getPrismaClient();

  const where = {
    ...(opts?.status ? { status: opts.status } : {}),
    ...(opts?.createdById ? { createdById: opts.createdById } : {}),
  };

  const [keys, total] = await prisma.$transaction([
    prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
      include: {
        createdBy: { select: { fullName: true, email: true } },
        revokedBy: { select: { fullName: true } },
        _count: { select: { accessLogs: true } },
      },
    }),
    prisma.apiKey.count({ where }),
  ]);

  return { keys, total };
}

// ── Get one ───────────────────────────────────────────────────────────────────

export async function getApiKey(id: string) {
  const prisma = await getPrismaClient();

  return prisma.apiKey.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true, email: true } },
      revokedBy: { select: { fullName: true } },
      accessLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: { select: { accessLogs: true } },
    },
  });
}

// ── Validate incoming request key ─────────────────────────────────────────────

export async function validateApiKey(
  raw: string,
  requiredScope?: ApiScope
): Promise<{ valid: boolean; keyId?: string; reason?: string }> {
  const prisma = await getPrismaClient();

  const hash = hashKey(raw);

  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!key) return { valid: false, reason: 'invalid_key' };
  if (key.status === 'revoked') return { valid: false, reason: 'revoked' };
  if (key.status === 'expired') return { valid: false, reason: 'expired' };
  if (key.expiresAt && key.expiresAt < new Date()) {
    await prisma.apiKey.update({ where: { id: key.id }, data: { status: 'expired' } });
    return { valid: false, reason: 'expired' };
  }
  if (requiredScope && !key.scopes.includes(requiredScope) && !key.scopes.includes('admin_full')) {
    return { valid: false, reason: 'insufficient_scope' };
  }

  // Update last used + request count (fire and forget)
  prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
    })
    .catch(() => {});

  return { valid: true, keyId: key.id };
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeApiKey(id: string, revokedById: string) {
  const prisma = await getPrismaClient();

  return prisma.apiKey.update({
    where: { id },
    data: { status: 'revoked', revokedAt: new Date(), revokedById },
  });
}

// ── Update (scopes / whitelist / name) ────────────────────────────────────────

export async function updateApiKey(
  id: string,
  data: { name?: string; scopes?: ApiScope[]; ipWhitelist?: string[] }
) {
  const prisma = await getPrismaClient();

  return prisma.apiKey.update({ where: { id }, data });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteApiKey(id: string) {
  return prisma.apiKey.delete({ where: { id } });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getApiKeyStats() {
  const prisma = await getPrismaClient();

  const [total, active, revoked, expired, recentLogs] = await prisma.$transaction([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { status: 'active' } }),
    prisma.apiKey.count({ where: { status: 'revoked' } }),
    prisma.apiKey.count({ where: { status: 'expired' } }),
    prisma.apiAccessLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { key: { select: { name: true, keyPrefix: true } } },
    }),
  ]);

  return { total, active, revoked, expired, recentLogs };
}

// ── Log access ────────────────────────────────────────────────────────────────

export async function logApiAccess(params: {
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress?: string;
  durationMs?: number;
}) {
  const prisma = await getPrismaClient();

  await prisma.apiAccessLog.create({ data: params }).catch(() => {});
}