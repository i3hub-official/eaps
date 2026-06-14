<!-- src/lib/components/reports/views/ActionAnalysisView.svelte -->
<script lang="ts">
  import type { ReportMeta, ReportParams } from '$lib/types/reports.js';
  import { Shield, AlertCircle, CheckCircle2, XCircle, PauseCircle, Eye } from '@lucide/svelte';

  interface Props {
    meta: ReportMeta;
    params: ReportParams;
    data: Record<string, unknown>;
  }

  let { meta, data }: Props = $props();

  const actions = $derived(data.actions as Record<string, {
    label: string; count: number; percentage: number;
    trend: 'up' | 'down' | 'stable'; avgResponseTime: string;
  }> ?? {});

  const actionHistory = $derived(data.actionHistory as Array<{
    action: string; label: string; count: number;
    effective: number; ineffective: number; effectiveness: number;
  }> ?? []);

  const actionIcons: Record<string, typeof Shield> = {
    warning: AlertCircle,
    invigilator_alerted: Eye,
    exam_paused: PauseCircle,
    auto_submitted: CheckCircle2,
  };

  const actionColors: Record<string, { bg: string; color: string; bar: string }> = {
    warning:             { bg: '#fef3c7', color: '#d97706', bar: '#f59e0b' },
    invigilator_alerted: { bg: '#eff6ff', color: '#2563eb', bar: '#3b82f6' },
    exam_paused:         { bg: '#fef2f2', color: '#dc2626', bar: '#ef4444' },
    auto_submitted:      { bg: '#f0fdf4', color: '#16a34a', bar: '#22c55e' },
  };

  const maxCount = $derived(Math.max(...actionHistory.map(a => a.count), 1));
</script>

<div class="report-view">
  <!-- Action Cards -->
  <div class="actions-grid">
    {#each Object.entries(actions) as [key, action]}
      {@const cfg = actionColors[key] ?? actionColors.warning}
      {@const Icon = actionIcons[key] ?? Shield}
      <div class="action-card">
        <div class="action-header">
          <div class="action-icon" style="background: {cfg.bg}; color: {cfg.color}">
            <Icon size={20} />
          </div>
          <div class="action-meta">
            <span class="action-name">{action.label}</span>
            <span class="action-count">{action.count.toLocaleString()} occurrences</span>
          </div>
        </div>
        <div class="action-body">
          <div class="metric-row">
            <span class="metric-label">Share of total</span>
            <span class="metric-value">{action.percentage}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Trend</span>
            <span class="metric-value trend-{action.trend}">{action.trend}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Avg response</span>
            <span class="metric-value">{action.avgResponseTime}</span>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Effectiveness Chart -->
  <div class="panel">
    <div class="panel-head">
      <h2>Action Effectiveness</h2>
      <span class="panel-sub">How well each response prevents repeat violations</span>
    </div>
    <div class="panel-body">
      {#if actionHistory.length === 0}
        <div class="empty">No action data available.</div>
      {:else}
        <div class="effectiveness-chart">
          {#each actionHistory as item}
            {@const cfg = actionColors[item.action] ?? actionColors.warning}
            <div class="eff-row">
              <div class="eff-label">
                <span class="eff-name">{item.label}</span>
                <span class="eff-count">{item.count} total</span>
              </div>
              <div class="eff-bar-area">
                <div class="eff-bar-wrap">
                  <div class="eff-bar effective" style="width: {(item.effective / item.count) * 100}%; background: {cfg.bar}">
                    <span class="eff-bar-label">{item.effective} effective</span>
                  </div>
                  <div class="eff-bar ineffective" style="width: {(item.ineffective / item.count) * 100}%; background: #e5e7eb">
                    <span class="eff-bar-label">{item.ineffective} repeat</span>
                  </div>
                </div>
                <span class="eff-rate" style="color: {cfg.color}">{item.effectiveness}% effective</span>
              </div>
            </div>
          {/each}
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th class="num">Total</th>
                <th class="num">Effective</th>
                <th class="num">Repeat</th>
                <th class="num">Effectiveness</th>
                <th>Visual</th>
              </tr>
            </thead>
            <tbody>
              {#each actionHistory as item}
                {@const cfg = actionColors[item.action] ?? actionColors.warning}
                <tr>
                  <td class="action-name-cell">{item.label}</td>
                  <td class="num">{item.count}</td>
                  <td class="num good">{item.effective}</td>
                  <td class="num bad">{item.ineffective}</td>
                  <td class="num">
                    <span class="eff-pill" style="background: {cfg.bg}; color: {cfg.color}">{item.effectiveness}%</span>
                  </td>
                  <td>
                    <div class="mini-bar-wrap">
                      <div class="mini-bar" style="width: {item.effectiveness}%; background: {cfg.bar}"></div>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .report-view { display: flex; flex-direction: column; gap: 1.5rem; }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
  }

  .action-card {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
    transition: all 0.2s;
  }
  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }

  .action-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .action-icon {
    width: 44px; height: 44px; border-radius: 0.75rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .action-meta { display: flex; flex-direction: column; gap: 0.1rem; }
  .action-name { font-size: 0.9rem; font-weight: 700; color: var(--color-text, #111827); }
  .action-count { font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .action-body { padding: 0.875rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }
  .metric-label { color: var(--color-muted, #6b7280); }
  .metric-value { font-weight: 700; color: var(--color-text, #111827); }
  .trend-up { color: #16a34a; }
  .trend-down { color: #ef4444; }
  .trend-stable { color: #6b7280; }

  .panel {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
  }

  .panel-head {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }
  .panel-head h2 { font-size: 0.9rem; font-weight: 700; color: var(--color-text, #111827); margin: 0; }
  .panel-sub { font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .panel-body { padding: 1.25rem; }

  .empty { text-align: center; padding: 3rem; color: var(--color-muted, #6b7280); }

  .effectiveness-chart {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .eff-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .eff-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .eff-name { font-size: 0.85rem; font-weight: 700; color: var(--color-text, #111827); }
  .eff-count { font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .eff-bar-area {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .eff-bar-wrap {
    flex: 1;
    height: 28px;
    display: flex;
    border-radius: 0.5rem;
    overflow: hidden;
    background: var(--color-bg, #f9fafb);
  }

  .eff-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .eff-bar-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
    white-space: nowrap;
    padding: 0 0.5rem;
  }

  .eff-bar.ineffective .eff-bar-label { color: var(--color-muted, #6b7280); }

  .eff-rate {
    font-size: 0.8rem;
    font-weight: 800;
    min-width: 80px;
    text-align: right;
  }

  .table-wrap { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  th {
    padding: 0.625rem 0.875rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #6b7280);
    background: var(--color-bg, #f9fafb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  td {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  tr:hover td { background: var(--color-bg, #f9fafb); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .good { color: #16a34a; font-weight: 700; }
  .bad { color: #ef4444; font-weight: 700; }

  .action-name-cell { font-weight: 600; }

  .eff-pill {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .mini-bar-wrap {
    width: 120px;
    height: 6px;
    background: var(--color-border, #e5e7eb);
    border-radius: 3px;
    overflow: hidden;
  }

  .mini-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
  }
</style>
