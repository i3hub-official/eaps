import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const notifications = await sql`
    SELECT 
      title,
      COUNT(*)::int as sent,
      COUNT(CASE WHEN "isRead" = true THEN 1 END)::int as read
    FROM "Notification"
    GROUP BY title
  `;

  const totalSent = await sql`SELECT COUNT(*)::int as count FROM "Notification"`;
  const totalRead = await sql`SELECT COUNT(*)::int as count FROM "Notification" WHERE "isRead" = true`;
  const pending = await sql`SELECT COUNT(*)::int as count FROM "Notification" WHERE "isRead" = false`;

  const sent = totalSent[0]?.count || 0;
  const read = totalRead[0]?.count || 0;
  const readRate = sent > 0 ? ((read / sent) * 100).toFixed(1) : '0';

  const formatted = notifications.map((n: any) => {
    const sentCount = n.sent || 0;
    const readCount = n.read || 0;
    return {
      title: n.title,
      sent: sentCount,
      read: readCount,
      readRate: sentCount > 0 ? parseFloat(((readCount / sentCount) * 100).toFixed(1)) : 0,
      avgTime: '2.3 min',
      type: n.title.toLowerCase().includes('exam') ? 'exam' :
            n.title.toLowerCase().includes('result') ? 'result' :
            n.title.toLowerCase().includes('violation') ? 'security' :
            n.title.toLowerCase().includes('maintenance') ? 'system' : 'course',
    };
  });

  return {
    stats: {
      totalSent: sent,
      readRate: parseFloat(readRate),
      avgOpenTime: '2.3 min',
      pending: pending[0]?.count || 0,
      failed: 0,
    },
    notifications: formatted,
  };
};
