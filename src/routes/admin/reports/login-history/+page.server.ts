// src/routes/admin/reports/login-history/+page.server.ts
import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const search = url.searchParams.get('q')?.trim() || '';
  const pattern = `%${search}%`;

  const sessions = await sql(
    `SELECT
       s.id,
       s.ip_address,
       s.user_agent,
       s.created_at,
       s.expires_at,
       u.full_name,
       u.email
     FROM auth_sessions s
     LEFT JOIN users u ON s.user_id = u.id
     ${search ? `WHERE u.full_name ILIKE $1
        OR u.email      ILIKE $1
        OR s.ip_address ILIKE $1` : ''}
     ORDER BY s.created_at DESC
     LIMIT 200`,
    search ? [pattern] : []
  );

  const formatted = sessions.map((s: any, i: number) => ({
    id:       `L${String(i + 1).padStart(3, '0')}`,
    user:     s.full_name  || 'Unknown',
    email:    s.email      || '—',
    ip:       s.ip_address || '—',
    device:   parseUserAgent(s.user_agent),
    location: 'Umuahia, NG',
    method:   'password',
    status:   s.expires_at && new Date() < new Date(s.expires_at) ? 'success' : 'expired',
    time:     s.created_at
      ? new Date(s.created_at).toISOString().replace('T', ' ').slice(0, 19)
      : '—',
  }));

  return { logins: formatted };
};

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown';
  const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return `Chrome / ${os}`;
  if (ua.includes('Firefox')) return `Firefox / ${os}`;
  if (ua.includes('Edg'))     return `Edge / ${os}`;
  if (ua.includes('Safari'))  return `Safari / ${ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : os}`;
  return `Browser / ${os}`;
}