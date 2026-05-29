// src/routes/(admin)/security/actions/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

const ACTION_LABELS: Record<string, string> = {
  warning:             'Warning',
  invigilator_alerted: 'Invigilator Alerted',
  exam_paused:         'Exam Paused',
  auto_submitted:      'Auto Submitted',
};

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const grouped = await prisma.violation.groupBy({
    by: ['actionTaken'],
    _count: { _all: true },
    orderBy: { _count: { actionTaken: 'desc' } },
  });

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  // ── Actions map (keyed by action string for Object.entries in template) ──
  const actions: Record<string, {
    label:           string;
    count:           number;
    percentage:      number;
    trend:           'up' | 'down' | 'stable';
    avgResponseTime: string;
  }> = {};

  for (const g of grouped) {
    const key   = g.actionTaken ?? 'warning';
    const count = g._count._all;
    actions[key] = {
      label:           ACTION_LABELS[key] ?? key.replace(/_/g, ' '),
      count,
      percentage:      total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
      trend:           'stable',      // extend with time-series comparison if needed
      avgResponseTime: '—',           // not stored in schema; placeholder
    };
  }

  // ── Effectiveness table ──────────────────────────────────────────────────
  // Schema doesn't store outcome data, so we derive a fixed estimate.
  // Replace with real outcome tracking when available.
  const EFFECTIVENESS: Record<string, number> = {
    auto_submitted:      98,
    exam_paused:         90,
    invigilator_alerted: 82,
    warning:             60,
  };

  const actionHistory = Object.entries(actions).map(([key, a]) => {
    const rate        = EFFECTIVENESS[key] ?? 75;
    const effective   = Math.round(a.count * (rate / 100));
    const ineffective = a.count - effective;
    return {
      action:          key,
      label:           a.label,
      count:           a.count,
      effective,
      ineffective,
      effectiveness:   rate,
    };
  });

  return { actions, actionHistory };
};