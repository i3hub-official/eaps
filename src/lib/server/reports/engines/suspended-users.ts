// engines/suspended-users.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const SuspendedUsersEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const search = params.q ?? '';

    const users = await sql(`
      SELECT u.id, u.full_name, u.matric_number, u.role,
             u.is_suspended, u.suspended_at, u.suspended_by_id,
             d.name AS dept
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.is_suspended = true
        ${search ? `AND (u.full_name ILIKE $1 OR u.matric_number ILIKE $1)` : ''}
      ORDER BY u.suspended_at DESC NULLS LAST
    `, search ? [`%${search}%`] : []);

    return {
      suspended: users.map((u: any, i: number) => ({
        id:          `U${String(i + 1).padStart(3, '0')}`,
        name:        u.full_name,
        matric:      u.matric_number || '—',
        role:        u.role,
        reason:      'Account suspended by administrator',
        suspendedAt: u.suspended_at ? new Date(u.suspended_at).toISOString().split('T')[0] : '—',
        suspendedBy: 'Admin',
        duration:    '—',
        status:      u.is_suspended ? 'active' : 'expired',
      })),
    };
  },
};

export default SuspendedUsersEngine;