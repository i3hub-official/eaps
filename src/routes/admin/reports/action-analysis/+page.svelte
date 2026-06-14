<!-- src/routes/(admin)/security/actions/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    AlertTriangle, Shield, PauseCircle, Send, FileBarChart
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const { actions, actionHistory } = data;

  // Icon per action key
  const ACTION_ICONS: Record<string, any> = {
    warning:             AlertTriangle,
    invigilator_alerted: Shield,
    exam_paused:         PauseCircle,
    auto_submitted:      Send,
  };

  function iconFor(key: string) {
    return ACTION_ICONS[key] ?? AlertTriangle;
  }

  // Colour per action
  const ACTION_COLOR: Record<string, { bg: string; text: string }> = {
    warning:             { bg: 'rgba(245,158,11,0.1)',  text: '#d97706' },
    invigilator_alerted: { bg: 'rgba(59,130,246,0.1)',  text: '#2563eb' },
    exam_paused:         { bg: 'rgba(139,92,246,0.1)',  text: '#7c3aed' },
    auto_submitted:      { bg: 'rgba(220,38,38,0.1)',   text: '#dc2626' },
  };

  function colorFor(key: string) {
    return ACTION_COLOR[key] ?? { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' };
  }

  function fmt(key: string) {
    return key.replace(/_/g, ' ');
  }

  // Bar fill colour based on effectiveness rate
  function effectColor(rate: number) {
    if (rate >= 90) return '#16a34a';
    if (rate >= 75) return '#d97706';
    return '#dc2626';
  }

  const entries = $derived(Object.entries(actions));
</script>

<svelte:head><title>Action Analysis — MOUAU eTest</title></svelte:head>

<div class="page">

  <header class="page-header">
    <div>
      <h1>Action Taken Analysis</h1>
      <p class="subtitle">Violation response distribution and intervention effectiveness</p>
    </div>
    <div class="header-badge">
      <FileBarChart size={14} />
      <span>{actionHistory.reduce((a, r) => a + r.count, 0)} total actions</span>
    </div>
  </header>

  <!-- Action cards -->
  {#if entries.length === 0}
    <div class="empty-block">No violation actions recorded yet.</div>
  {:else}
    <div class="actions-grid">
      {#each entries as [key, a]}
        {@const Icon  = iconFor(key)}
        {@const color = colorFor(key)}
        <div class="action-card">
          <div class="card-header">
            <div class="card-icon" style="background:{color.bg}; color:{color.text}">
              <Icon size={18} />
            </div>
            <div class="card-title">
              <span class="card-name">{a.label}</span>
              <span class="card-trend trend-{a.trend}">{a.trend}</span>
            </div>
            <span class="card-pct">{a.percentage}%</span>
          </div>

          <div class="card-stats">
            <div class="stat">
              <span class="stat-val">{a.count}</span>
              <span class="stat-lbl">Times used</span>
            </div>
            <div class="stat">
              <span class="stat-val">{a.percentage}%</span>
              <span class="stat-lbl">of total</span>
            </div>
            <div class="stat">
              <span class="stat-val">{a.avgResponseTime}</span>
              <span class="stat-lbl">Avg response</span>
            </div>
          </div>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width:{a.percentage}%; background:{color.text}"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Effectiveness table -->
  <div class="table-card">
    <div class="table-header">
      <h2>Effectiveness Breakdown</h2>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Total applied</th>
            <th>Effective</th>
            <th>Ineffective</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {#if actionHistory.length === 0}
            <tr>
              <td colspan="5" class="empty-row">No data available.</td>
            </tr>
          {:else}
            {#each actionHistory as row}
              <tr>
                <td><span class="action-pill">{row.label}</span></td>
                <td class="num-cell">{row.count}</td>
                <td><span class="count-val effective">{row.effective}</span></td>
                <td><span class="count-val ineffective">{row.ineffective}</span></td>
                <td>
                  <div class="rate-bar">
                    <div class="rate-track">
                      <div
                        class="rate-fill"
                        style="width:{row.effectiveness}%; background:{effectColor(row.effectiveness)}"
                      ></div>
                    </div>
                    <span class="rate-pct" style="color:{effectColor(row.effectiveness)}">
                      {row.effectiveness}%
                    </span>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

</div>

<style>
  .page {
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  .page-header {
    display: flex; align-items: flex-end;
    justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }

  h1 { font-size: 1.4rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--color-text); }
  .subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2);
    border-radius: 999px; font-size: 0.75rem; font-weight: 700; color: #3b82f6;
    flex-shrink: 0;
  }

  /* ── Action cards ────────────────────────────────────── */
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  @media (max-width: 640px) { .actions-grid { grid-template-columns: 1fr; } }

  .action-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.125rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  .card-header {
    display: flex; align-items: center; gap: 0.75rem;
  }

  .card-icon {
    width: 36px; height: 36px; border-radius: 0.5rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }

  .card-title {
    flex: 1; display: flex; flex-direction: column; gap: 0.1rem;
    min-width: 0;
  }

  .card-name {
    font-size: 0.875rem; font-weight: 700; color: var(--color-text);
    text-transform: capitalize; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  .card-trend {
    font-size: 0.7rem; font-weight: 600; text-transform: capitalize;
  }
  .trend-up     { color: #16a34a; }
  .trend-down   { color: #dc2626; }
  .trend-stable { color: var(--color-muted); }

  .card-pct {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
    font-variant-numeric: tabular-nums; flex-shrink: 0;
  }

  .card-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.6rem; padding: 0.75rem 0;
  }

  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
  .stat-val { font-size: 1rem; font-weight: 800; color: var(--color-text); font-variant-numeric: tabular-nums; }
  .stat-lbl { font-size: 0.65rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

  .progress-track {
    height: 5px; background: var(--color-bg);
    border-radius: 999px; overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .progress-fill {
    height: 100%; border-radius: 999px;
    transition: width 0.4s ease; min-width: 3px;
  }

  /* ── Table ───────────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem; overflow: hidden;
  }

  .table-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  h2 { font-size: 0.875rem; font-weight: 700; margin: 0; color: var(--color-text); }

  .table-scroll { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }

  thead { background: var(--color-bg); }

  th {
    padding: 0.625rem 1rem; text-align: left;
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text); vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }

  .action-pill {
    padding: 0.2rem 0.55rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.35rem; font-size: 0.72rem; font-weight: 600;
    text-transform: capitalize; color: var(--color-text); white-space: nowrap;
  }

  .num-cell { font-variant-numeric: tabular-nums; font-weight: 600; }

  .count-val { font-weight: 700; font-size: 0.82rem; font-variant-numeric: tabular-nums; }
  .count-val.effective   { color: #16a34a; }
  .count-val.ineffective { color: #dc2626; }

  .rate-bar {
    display: flex; align-items: center; gap: 0.625rem; min-width: 140px;
  }

  .rate-track {
    flex: 1; height: 6px; background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px; overflow: hidden;
  }

  .rate-fill {
    height: 100%; border-radius: 999px;
    transition: width 0.4s ease; min-width: 3px;
  }

  .rate-pct { font-size: 0.78rem; font-weight: 700; min-width: 36px; font-variant-numeric: tabular-nums; }

  /* ── Empty ───────────────────────────────────────────── */
  .empty-block {
    padding: 3rem; text-align: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; color: var(--color-muted); font-size: 0.875rem;
  }

  .empty-row {
    text-align: center; padding: 2.5rem 1rem !important;
    color: var(--color-muted); font-size: 0.875rem;
  }

  /* ── Dark mode ───────────────────────────────────────── */
  :global(.dark) .header-badge { background: rgba(59,130,246,0.12); }
</style>