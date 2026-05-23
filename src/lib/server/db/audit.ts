// src/lib/server/db/audit.ts
import { prisma } from './index.js';

export async function log(
  action: string,
  opts: {
    userId?: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  } = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId:    opts.userId    ?? null,
        entity:    opts.entity    ?? null,
        entityId:  opts.entityId  ?? null,
        metadata:  opts.metadata  ?? null,
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch {
    // Audit logging must never crash the main flow
  }
}