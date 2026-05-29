import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const search = url.searchParams.get('q')?.trim() || '';

  const users = await sql(
    `SELECT
       u.id,
       u.full_name,
       u.matric_number,
       u.role,
       u.is_suspended,
       u.suspended_at,
       u.suspended_by_id,
       d.name AS dept
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.is_suspended = true
       ${search ? `AND (
         u.full_name     ILIKE $1 OR
         u.matric_number ILIKE $1
       )` : ''}
     ORDER BY u.suspended_at DESC NULLS LAST`,
    search ? [`%${search}%`] : []
  );

  const formatted = users.map((u: any, i: number) => ({
    id:          `U${String(i + 1).padStart(3, '0')}`,
    name:        u.full_name,
    matric:      u.matric_number  || '—',
    role:        u.role,
    reason:      'Account suspended by administrator',
    suspendedAt: u.suspended_at
      ? new Date(u.suspended_at).toISOString().split('T')[0]
      : '—',
    suspendedBy: 'Admin',
    duration:    '—',
    status:      u.is_suspended ? 'active' : 'expired',
  }));

  return { suspended: formatted };
};