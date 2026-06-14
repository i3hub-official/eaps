// lib/server/reports/engines/audit-logs.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const AuditLogsEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const search  = params.q ?? '';
    const pattern = `%${search}%`;

    const logs = await sql(
      `SELECT
         al.id,
         al.action,
         al.entity,
         al.entity_id,
         al.metadata,
         al.ip_address,
         al.created_at,
         u.full_name AS user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${search ? `WHERE u.full_name ILIKE $1
          OR al.action    ILIKE $1
          OR al.entity    ILIKE $1` : ''}
       ORDER BY al.created_at DESC
       LIMIT 200`,
      search ? [pattern] : []
    );

    const formatted = logs.map((l: any, i: number) => ({
      id:        `AL${String(i + 1).padStart(3, '0')}`,
      user:      l.user_name  || 'System',
      action:    l.action,
      entity:    l.entity     || '—',
      entityId:  l.entity_id  ? String(l.entity_id).slice(0, 8) : '—',
      details:   JSON.stringify(l.metadata ?? {}).slice(0, 100),
      ip:        l.ip_address || '—',
      timestamp: l.created_at
        ? new Date(l.created_at).toISOString().replace('T', ' ').slice(0, 19)
        : '—',
    }));

    return { logs: formatted };
  },
};

export default AuditLogsEngine;