<!-- src/routes/admin/reports/notification-analytics/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Bell, TrendingDown, Eye, Clock, Send } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Notification Analytics — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Notification Analytics</h1>
    <p class="subtitle">Delivery rates, read metrics, and engagement analytics</p>
  </header>

  <section class="metrics-row">
    <div class="metric-card">
      <Send size={18} />
      <div>
        <span class="metric-value">{data.stats.totalSent.toLocaleString()}</span>
        <span class="metric-label">Total Sent</span>
      </div>
    </div>
    <div class="metric-card">
      <Eye size={18} />
      <div>
        <span class="metric-value">{data.stats.readRate}%</span>
        <span class="metric-label">Read Rate</span>
      </div>
    </div>
    <div class="metric-card">
      <Clock size={18} />
      <div>
        <span class="metric-value">{data.stats.avgOpenTime}</span>
        <span class="metric-label">Avg Open Time</span>
      </div>
    </div>
    <div class="metric-card">
      <Bell size={18} />
      <div>
        <span class="metric-value">{data.stats.pending}</span>
        <span class="metric-label">Pending</span>
      </div>
    </div>
    <div class="metric-card fail">
      <TrendingDown size={18} />
      <div>
        <span class="metric-value">{data.stats.failed}</span>
        <span class="metric-label">Failed</span>
      </div>
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Notification</th>
          <th>Type</th>
          <th>Sent</th>
          <th>Read</th>
          <th>Read Rate</th>
          <th>Avg Open Time</th>
        </tr>
      </thead>
      <tbody>
        {#each data.notifications as n}
          <tr>
            <td>
              <div class="notif-cell">
                <div class="notif-icon"><Bell size={16} /></div>
                <span class="notif-title">{n.title}</span>
              </div>
            </td>
            <td><span class="type-badge {n.type}">{n.type}</span></td>
            <td>{n.sent.toLocaleString()}</td>
            <td>{n.read.toLocaleString()}</td>
            <td>
              <div class="read-bar">
                <div class="read-fill" style="width: {n.readRate}%"></div>
                <span>{n.readRate}%</span>
              </div>
            </td>
            <td>{n.avgTime}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .metrics-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 900px) { .metrics-row { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 500px) { .metrics-row { grid-template-columns: 1fr; } }

  .metric-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #3b82f6; }
  .metric-card.fail { color: #ef4444; }
  .metric-card div { display: flex; flex-direction: column; }
  .metric-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
  .metric-label { font-size: 0.75rem; color: var(--color-muted); }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .notif-cell { display: flex; align-items: center; gap: 0.75rem; }
  .notif-icon { width: 32px; height: 32px; border-radius: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .notif-title { font-weight: 600; color: var(--color-text); }

  .type-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .type-badge.exam     { background: rgba(59, 130, 246, 0.1);  color: #3b82f6; }
  .type-badge.result   { background: rgba(22, 163, 74, 0.1);   color: #16a34a; }
  .type-badge.security { background: rgba(239, 68, 68, 0.1);   color: #ef4444; }
  .type-badge.system   { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
  .type-badge.course   { background: rgba(99, 102, 241, 0.1);  color: #6366f1; }

  .read-bar { display: flex; align-items: center; gap: 0.5rem; }
  .read-fill { height: 6px; background: #3b82f6; border-radius: 3px; min-width: 4px; max-width: 80px; }
  .read-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 40px; }
</style>