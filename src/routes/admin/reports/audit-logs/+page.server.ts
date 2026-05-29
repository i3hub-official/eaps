import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      al.id,
      al.action,
      al.entity,
      al."entityId",
      al.metadata,
      al."ipAddress",
      al."createdAt",
      u."fullName" as user_name
    FROM "AuditLog" al
    LEFT JOIN "User" u ON al."userId" = u.id
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND (
      u."fullName" ILIKE ${'%' + searchQuery + '%'} OR 
      al.action ILIKE ${'%' + searchQuery + '%'} OR 
      al.entity ILIKE ${'%' + searchQuery + '%'}
    )`;
  }

  query = sql`${query} ORDER BY al."createdAt" DESC LIMIT 200`;

  const logs = await query;

  const formatted = logs.map((l: any, i: number) => ({
    id: `AL${String(i + 1).padStart(3, '0')}`,
    user: l.user_name || 'System',
    action: l.action,
    entity: l.entity || '—',
    entityId: l.entityId ? l.entityId.slice(0, 8) : '—',
    details: JSON.stringify(l.metadata || {}).slice(0, 100),
    ip: l.ipAddress || '—',
    timestamp: l.createdAt ? new Date(l.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '—',
  }));

  return { logs: formatted };
};
