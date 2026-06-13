// src/lib/server/db/audit.ts
import { getPrismaClient } from './index.js';
import { Prisma } from '@prisma/client';

interface AuditOptions {
  userId?:    string;
  entity?:    string;
  entityId?:  string;
  metadata?:  Record<string, unknown>;
  ipAddress?: string;
}

export async function log(action: string, opts: AuditOptions = {}): Promise<void> {
  const prisma = await getPrismaClient();

  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId:    opts.userId    ?? null,
        entity:    opts.entity    ?? null,
        entityId:  opts.entityId  ?? null,
        metadata:  opts.metadata  ?? Prisma.JsonNull,  // ← Prisma sentinel for null JSON
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('[Audit] Failed to write log entry:', action, err);
  }
}