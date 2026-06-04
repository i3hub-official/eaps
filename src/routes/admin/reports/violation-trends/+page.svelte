<!-- src/routes/(admin)/security/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { AlertTriangle, BarChart3, Calendar } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  const { dailyTrends, typeBreakdown } = data;

  // ── Safe derived values (guard against empty array) ─────────────────────────
  const totalViolations = $derived(
    dailyTrends.reduce((a: number, d: any) => a + d.count, 0)
  );

  const avgPerDay = $derived(
    dailyTrends.length > 0
      ? (totalViolations / dailyTrends.length).toFixed(1)
      : '0.0'
  );

  const peakDay = $derived(
    dailyTrends.length > 0
      ? dailyTrends.reduce((a: any, d: any) => d.count > a.count ? d : a, dailyTrends[0])
      : null
  );

  // ── Chart scaling ────────────────────────────────────────────────────────────
  const maxCount = $derived(
    dailyTrends.length > 0
      ? Math.max(...dailyTrends.map((d: any) => d.count), 1)
      : 1
  );

  const maxTypeCount = $derived(
    Object.values(typeBreakdown).length > 0
      ? Math.max(...Object.values(typeBreakdown) as number[], 1)
      : 1
  );

  function formatDate(iso: string) {
    const [, m, d] = iso.split('-');
    return `${m}/${d}`;
  }

  function formatType(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Severity colours per flag type
  const TYPE_COLOR: Record<string, string> = {
    tab_switch:          '#f59e0b',
    window_blur:         '#f59e0b',
    fullscreen_exit:     '#f97316',
    copy_attempt:        '#f97316',
    devtools_open:       '#ef4444',
    screenshot_attempt:  '#ef4444',
    multiple_faces:      '#dc2626',
    no_face_detected:    '#dc2626',
    invigilator_manual:  '#7c3aed',
  };

  function typeColor(key: string) {
    return TYPE_COLOR[key] ?? '#6b7280';
  }
</script>

<svelte:head><title>Violation Trends — MOUAU eTest</title></svelte:head>

<div class="page">

  <header class="page-header">
    <div>
      <h1>Violation Trends</h1>
      <p class="subtitle">Security incidents over the last 8 days</p>
    </div>
  </header>

  <!-- Summary cards -->
  <div class="summary-row">
    <div class="stat-card">
      <div class="stat-icon amber"><AlertTriangle size={18} /></div>
      <div class="stat-body">
        <span class="stat-value">{totalViolations}</span>
        <span class="stat-label">Total (8 days)</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon blue"><BarChart3 size={18} /></div>
      <div class="stat-body">
        <span class="stat-value">{avgPerDay}</span>
        <span class="stat-label">Avg per day</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon red"><Calendar size={18} /></div>
      <div class="stat-body">
        {#if peakDay}
          <span class="stat-value">{formatDate(peakDay.date)}</span>
          <span class="stat-label">Peak day · {peakDay.count} violations</span>
        {:else}
          <span class="stat-value">—</span>
          <span class="stat-label">No data yet</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Charts -->
  <div class="charts-grid">

    <!-- Bar chart -->
    <div class="chart-card wide">
      <h3>Daily Violations</h3>

      {#if dailyTrends.length === 0}
        <div class="empty">No violations recorded in the last 8 days.</div>
      {:else}
        <div class="bar-chart">
          {#each dailyTrends as day}
            {@const pct = Math.round((day.count / maxCount) * 100)}
            <div class="bar-col">
              <span class="bar-val">{day.count}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  style="height: {pct}%; background: {pct > 66 ? '#ef4444' : pct > 33 ? '#f97316' : '#f59e0b'}"
                ></div>
              </div>
              <span class="bar-label">{formatDate(day.date)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Type breakdown -->
    <div class="chart-card">
      <h3>By Type</h3>

      {#if Object.keys(typeBreakdown).length === 0}
        <div class="empty">No data.</div>
      {:else}
        <div class="type-list">
          {#each Object.entries(typeBreakdown).sort((a, b) => (b[1] as number) - (a[1] as number)) as [type, count]}
            {@const pct = Math.round(((count as number) / maxTypeCount) * 100)}
            <div class="type-row">
              <div class="type-meta">
                <span class="type-name">{formatType(type)}</span>
                <span class="type-count" style="color: {typeColor(type)}">{count as number}</span>
              </div>
              <div class="type-track">
                <div
                  class="type-bar"
                  style="width: {pct}%; background: {typeColor(type)}"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
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
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; }
  h1 { font-size: 1.4rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--color-text); }
  .subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  /* ── Summary cards ───────────────────────────────────── */
  .summary-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  @media (max-width: 640px) { .summary-row { grid-template-columns: 1fr; } }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1rem 1.125rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .stat-icon {
    width: 38px; height: 38px;
    border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .stat-icon.amber { background: rgba(245,158,11,0.12); color: #d97706; }
  .stat-icon.blue  { background: rgba(59,130,246,0.12);  color: #2563eb; }
  .stat-icon.red   { background: rgba(239,68,68,0.12);   color: #dc2626; }

  .stat-body { display: flex; flex-direction: column; gap: 0.15rem; }
  .stat-value { font-size: 1.35rem; font-weight: 800; color: var(--color-text); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .stat-label { font-size: 0.72rem; color: var(--color-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── Charts grid ─────────────────────────────────────── */
  .charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.25rem 1.5rem;
  }

  h3 {
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    margin: 0 0 1.25rem;
  }

  /* ── Bar chart ───────────────────────────────────────── */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    height: 180px;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    height: 100%;
  }

  .bar-val {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-muted);
    line-height: 1;
    flex-shrink: 0;
  }

  .bar-track {
    flex: 1;
    width: 100%;
    background: var(--color-bg);
    border-radius: 0.3rem;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .bar-fill {
    width: 100%;
    border-radius: 0.25rem 0.25rem 0 0;
    min-height: 3px;
    transition: height 0.4s ease;
  }

  .bar-label {
    font-size: 0.68rem;
    color: var(--color-muted);
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* ── Type list ───────────────────────────────────────── */
  .type-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .type-row { display: flex; flex-direction: column; gap: 0.35rem; }

  .type-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .type-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .type-count {
    font-size: 0.78rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .type-track {
    height: 5px;
    background: var(--color-bg);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .type-bar {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
    min-width: 3px;
  }

  /* ── Empty ───────────────────────────────────────────── */
  .empty {
    text-align: center;
    padding: 2rem;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  /* ── Dark mode ───────────────────────────────────────── */
  :global(.dark) .stat-icon.amber { background: rgba(245,158,11,0.15); }
  :global(.dark) .stat-icon.blue  { background: rgba(59,130,246,0.15); }
  :global(.dark) .stat-icon.red   { background: rgba(239,68,68,0.15); }
</style>