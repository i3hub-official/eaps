<!-- src/routes/admin/reports/system-activity/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Monitor, Activity, Clock, AlertTriangle, CheckCircle2, Server, Database, Wifi } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  function getTypeIcon(type: string) {
    return { info: Activity, warning: AlertTriangle, success: CheckCircle2, error: AlertTriangle }[type] || Activity;
  }
  function getTypeColor(type: string) {
    return { info: 'type-info', warning: 'type-warning', success: 'type-success', error: 'type-error' }[type] || 'type-info';
  }
</script>

<svelte:head><title>System Activity — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>System Activity</h1>
    <p class="subtitle">System health, background jobs, and operational events</p>
  </header>

  <section class="metrics-row">
    <div class="metric-card">
      <Server size={18} />
      <div>
        <span class="metric-value">{data.metrics.uptime}</span>
        <span class="metric-label">Uptime</span>
      </div>
    </div>
    <div class="metric-card">
      <Clock size={18} />
      <div>
        <span class="metric-value">{data.metrics.avgResponse}</span>
        <span class="metric-label">Avg Response</span>
      </div>
    </div>
    <div class="metric-card">
      <Wifi size={18} />
      <div>
        <span class="metric-value">{data.metrics.activeConnections}</span>
        <span class="metric-label">Active Conn.</span>
      </div>
    </div>
    <div class="metric-card">
      <Database size={18} />
      <div>
        <span class="metric-value">{data.metrics.dbSize}</span>
        <span class="metric-label">DB Size</span>
      </div>
    </div>
    <div class="metric-card">
      <Monitor size={18} />
      <div>
        <span class="metric-value">{data.metrics.lastBackup}</span>
        <span class="metric-label">Last Backup</span>
      </div>
    </div>
  </section>

  <section class="activity-section">
    <h3>Recent Activity</h3>
    <div class="activity-list">
      {#each data.activities as activity}
        {@const ActivityIcon = getTypeIcon(activity.type)}
        <div class="activity-item {getTypeColor(activity.type)}">
          <div class="activity-icon">
            <ActivityIcon size={16} />
          </div>
          <div class="activity-content">
            <span class="activity-message">{activity.message}</span>
            <div class="activity-meta">
              <span class="activity-source">{activity.source}</span>
              <span class="activity-time">{activity.timestamp}</span>
              {#if activity.duration !== '—'}
                <span class="activity-duration">{activity.duration}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
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
  .metric-card div { display: flex; flex-direction: column; }
  .metric-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
  .metric-label { font-size: 0.75rem; color: var(--color-muted); }

  .activity-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .activity-section h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; }

  .activity-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .activity-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }

  .activity-icon { width: 32px; height: 32px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .type-info .activity-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .type-warning .activity-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .type-success .activity-icon { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .type-error .activity-icon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .activity-content { flex: 1; }
  .activity-message { font-size: 0.875rem; font-weight: 500; color: var(--color-text); display: block; margin-bottom: 0.375rem; }
  .activity-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
  .activity-meta span { font-size: 0.75rem; color: var(--color-muted); }
  .activity-source { font-weight: 600; }
  .activity-duration { background: var(--color-surface); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
</style>