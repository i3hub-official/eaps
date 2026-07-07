// src/lib/server/audit.ts
// Centralised audit logging — call from any server route or action

import { getPrismaClient } from '$lib/server/db/index.js';

interface AuditParams {
  actorType: 'staff' | 'student' | 'system'
  staffId?: string
  studentId?: string
  action: string        // e.g. 'EXAM_SUBMITTED', 'RESULT_RELEASED'
  entity: string        // table / domain name e.g. 'ExamSession'
  entityId?: string
  beforeData?: object
  afterData?: object
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(params: AuditParams) {
  try {
    const prisma = await getPrismaClient();
    await prisma.auditLog.create({ data: params })
  } catch {
    // audit logging should never crash the main flow
    console.error('[audit] Failed to write audit log:', params.action)
  }
}

// Convenience wrappers
export const audit = {
  staff: (staffId: string, action: string, entity: string, extra?: Partial<AuditParams>) =>
    createAuditLog({ actorType: 'staff', staffId, action, entity, ...extra }),

  student: (studentId: string, action: string, entity: string, extra?: Partial<AuditParams>) =>
    createAuditLog({ actorType: 'student', studentId, action, entity, ...extra }),

  system: (action: string, entity: string, extra?: Partial<AuditParams>) =>
    createAuditLog({ actorType: 'system', action, entity, ...extra }),
}