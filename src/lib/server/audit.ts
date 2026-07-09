// src/lib/server/audit.ts
import { getPrismaClient } from '$lib/server/db/index.js'

interface AuditOptions {
  entityId?: string
  beforeData?: unknown
  afterData?: unknown
  ipAddress?: string
  userAgent?: string
}

async function write(
  actorType: 'staff' | 'student' | 'system',
  staffId: string | null,
  studentId: string | null,
  action: string,
  entity: string,
  options: AuditOptions = {},
) {
  const prisma = await getPrismaClient()
  await prisma.auditLog.create({
    data: {
      actorType,
      staffId: staffId ?? undefined,
      studentId: studentId ?? undefined,
      action,
      entity,
      entityId: options.entityId,
      beforeData: options.beforeData as any,
      afterData: options.afterData as any,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    },
  })
}

export const audit = {
  student: (studentId: string, action: string, entity: string, options?: AuditOptions) =>
    write('student', null, studentId, action, entity, options),
  staff: (staffId: string, action: string, entity: string, options?: AuditOptions) =>
    write('staff', staffId, null, action, entity, options),
  system: (action: string, entity: string, options?: AuditOptions) =>
    write('system', null, null, action, entity, options),
}