import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      u.id,
      u."fullName",
      u."matricNumber",
      u.role,
      u."isSuspended",
      u."suspendedAt",
      d.name as dept
    FROM "User" u
    LEFT JOIN "Department" d ON u."departmentId" = d.id
    WHERE u."isSuspended" = true
  `;

  if (searchQuery) {
    query = sql`${query} AND (u."fullName" ILIKE ${'%' + searchQuery + '%'} OR u."matricNumber" ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} ORDER BY u."suspendedAt" DESC`;

  const users = await query;

  const formatted = users.map((u: any, i: number) => ({
    id: `U${String(i + 1).padStart(3, '0')}`,
    name: u.fullName,
    matric: u.matricNumber || '—',
    role: u.role,
    reason: 'Account suspended by administrator',
    suspendedAt: u.suspendedAt ? new Date(u.suspendedAt).toISOString().split('T')[0] : '—',
    suspendedBy: 'Admin',
    duration: '30 days',
    status: u.isSuspended ? 'active' : 'expired',
  }));

  return { suspended: formatted };
};
