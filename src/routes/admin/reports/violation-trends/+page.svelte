<script lang="ts">
  import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Calendar } from 'lucide-svelte';

  let dailyTrends = $state([
    { date: '2026-05-15', count: 3, types: { tab_switch: 1, window_blur: 2 } },
    { date: '2026-05-16', count: 5, types: { tab_switch: 2, fullscreen_exit: 1, copy_attempt: 2 } },
    { date: '2026-05-17', count: 2, types: { window_blur: 1, multiple_faces: 1 } },
    { date: '2026-05-18', count: 12, types: { tab_switch: 4, copy_attempt: 3, fullscreen_exit: 2, devtools_open: 3 } },
    { date: '2026-05-19', count: 8, types: { tab_switch: 3, window_blur: 2, screenshot_attempt: 3 } },
    { date: '2026-05-20', count: 15, types: { tab_switch: 5, fullscreen_exit: 4, copy_attempt: 3, multiple_faces: 3 } },
    { date: '2026-05-21', count: 6, types: { window_blur: 2, no_face_detected: 4 } },
    { date: '2026-05-22', count: 9, types: { tab_switch: 3, copy_attempt: 2, invigilator_manual: 4 } },
  ]);

  let typeBreakdown = $state({
    tab_switch: 18,
    window_blur: 7,
    fullscreen_exit: 7,
    copy_attempt: 10,
    devtools_open: 3,
    screenshot_attempt: 3,
    multiple_faces: 4,
    no_face_detected: 4,
    invigilator_manual: 4,
  });

  let totalViolations = $derived(dailyTrends.reduce((a, d) => a + d.count, 0));
  let avgPerDay = $derived((totalViolations / dailyTrends.length).toFixed(1));
  let peakDay = $derived(dailyTrends.reduce((a, d) => d.count > a.count ? d : a, dailyTrends[0]));
</script>

<svelte:head><title>Violation Trends — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Violation Trends</h1>
    <p class="subtitle">Temporal analysis of security incidents and violation patterns</p>
  </header>

  <section class="summary-row">
    <div class="summary-card">
      <AlertTriangle size={20} />
      <div>
        <span class="summary-value">{totalViolations}</span>
        <span class="summary-label">Last 8 Days</span>
      </div>
    </div>
    <div class="summary-card">
      <BarChart3 size={20} />
      <div>
        <span class="summary-value">{avgPerDay}</span>
        <span class="summary-label">Avg / Day</span>
      </div>
    </div>
    <div class="summary-card critical">
      <Calendar size={20} />
      <div>
        <span class="summary-value">{peakDay.date}</span>
        <span class="summary-label">Peak Day ({peakDay.count})</span>
      </div>
    </div>
  </section>

  <section class="charts-grid">
    <div class="chart-card wide">
      <h3>Daily Violation Count</h3>
      <div class="trend-chart">
        {#each dailyTrends as day, i}
          <div class="trend-bar-container">
            <div class="trend-bar" style="height: {(day.count / 15) * 100}%"></div>
            <span class="trend-date">{day.date.slice(5)}</span>
            <span class="trend-count">{day.count}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="chart-card">
      <h3>By Violation Type</h3>
      <div class="type-list">
        {#each Object.entries(typeBreakdown) as [type, count]}
          <div class="type-item">
            <div class="type-header">
              <span class="type-name">{type.replace('_', ' ')}</span>
              <span class="type-count">{count}</span>
            </div>
            <div class="type-bar-container">
              <div class="type-bar" style="width: {(count / 18) * 100}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 768px) { .summary-row { grid-template-columns: 1fr; } }

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #f59e0b; }
  .summary-card.critical { color: #ef4444; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
  @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

  .chart-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .chart-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; }

  .trend-chart { display: flex; align-items: flex-end; gap: 0.75rem; height: 200px; padding-bottom: 2rem; position: relative; }
  .trend-bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative; }
  .trend-bar { width: 100%; background: linear-gradient(to top, #ef4444, #f97316); border-radius: 0.25rem 0.25rem 0 0; min-height: 4px; transition: height 0.5s ease; }
  .trend-date { font-size: 0.7rem; color: var(--color-muted); position: absolute; bottom: -1.5rem; white-space: nowrap; }
  .trend-count { font-size: 0.75rem; font-weight: 700; color: var(--color-text); position: absolute; top: -1.25rem; }

  .type-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .type-item { padding: 0.75rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }
  .type-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .type-name { font-size: 0.8rem; font-weight: 600; color: var(--color-text); text-transform: capitalize; }
  .type-count { font-size: 0.8rem; font-weight: 700; color: #ef4444; }
  .type-bar-container { height: 6px; background: var(--color-surface); border-radius: 3px; overflow: hidden; }
  .type-bar { height: 100%; background: #ef4444; border-radius: 3px; transition: width 0.5s ease; }
</style>