import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      s.id,
      s."ipAddress",
      s."userAgent",
      s."createdAt",
      s."expiresAt",
      u."fullName",
      u.email
    FROM "AuthSession" s
    LEFT JOIN "User" u ON s."userId" = u.id
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND (
      u."fullName" ILIKE ${'%' + searchQuery + '%'} OR 
      u.email ILIKE ${'%' + searchQuery + '%'} OR 
      s."ipAddress" LIKE ${'%' + searchQuery + '%'}
    )`;
  }

  query = sql`${query} ORDER BY s."createdAt" DESC LIMIT 200`;

  const sessions = await query;

  const formatted = sessions.map((s: any, i: number) => ({
    id: `L${String(i + 1).padStart(3, '0')}`,
    user: s.fullName || 'Unknown',
    email: s.email || '—',
    ip: s.ipAddress || '—',
    device: parseUserAgent(s.userAgent),
    location: 'Umuahia, NG',
    method: 'password',
    status: new Date() < new Date(s.expiresAt) ? 'success' : 'expired',
    time: s.createdAt ? new Date(s.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '—',
  }));

  return { logins: formatted };
};

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome')) return 'Chrome / ' + (ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : 'Linux');
  if (ua.includes('Firefox')) return 'Firefox / ' + (ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : 'Linux');
  if (ua.includes('Safari')) return 'Safari / iOS';
  return 'Browser / Unknown';
}
