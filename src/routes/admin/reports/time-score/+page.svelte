<script lang="ts">
  import { Clock, TrendingUp, Target, Zap, BarChart3 } from 'lucide-svelte';

  let correlations = $state([]);

  let timeRanges = $state([]);
</script>

<svelte:head><title>Time vs Score — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Time vs Score Correlation</h1>
    <p class="subtitle">Analyze the relationship between time spent and exam performance</p>
  </header>

  <section class="summary-row">
    <div class="summary-card">
      <Clock size={20} />
      <div>
        <span class="summary-value">58.3 min</span>
        <span class="summary-label">Avg Time Spent</span>
      </div>
    </div>
    <div class="summary-card">
      <Target size={20} />
      <div>
        <span class="summary-value">67.4%</span>
        <span class="summary-label">Avg Score</span>
      </div>
    </div>
    <div class="summary-card">
      <Zap size={20} />
      <div>
        <span class="summary-value">+0.18</span>
        <span class="summary-label">Overall Correlation</span>
      </div>
    </div>
  </section>

  <section class="charts-grid">
    <div class="chart-card wide">
      <h3>Correlation by Exam</h3>
      <div class="correlation-list">
        {#each correlations as c}
          <div class="correlation-item">
            <div class="correlation-header">
              <span class="correlation-exam">{c.exam}</span>
              <span class="correlation-value" class:positive={c.correlation > 0} class:negative={c.correlation < 0}>
                {c.correlation > 0 ? '+' : ''}{c.correlation.toFixed(2)}
              </span>
            </div>
            <div class="correlation-metrics">
              <span><Clock size={12} /> {c.avgTime} min avg</span>
              <span><Target size={12} /> {c.avgScore}% avg</span>
            </div>
            <p class="correlation-insight">{c.insight}</p>
            <div class="correlation-bar">
              <div class="correlation-fill" class:positive={c.correlation > 0} class:negative={c.correlation < 0} style="width: {Math.abs(c.correlation) * 100}%; margin-left: {c.correlation < 0 ? 'auto' : '0'}; margin-right: {c.correlation > 0 ? 'auto' : '0'}"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="chart-card">
      <h3>Score by Time Range</h3>
      <div class="time-range-list">
        {#each timeRanges as range}
          <div class="time-range-item">
            <div class="time-range-header">
              <span class="time-range-label">{range.label}</span>
              <span class="time-range-range">{range.range}</span>
            </div>
            <div class="time-range-bar-container">
              <div class="time-range-bar" style="width: {(range.count / 567) * 100}%"></div>
            </div>
            <div class="time-range-footer">
              <span class="time-range-count">{range.count} students</span>
              <span class="time-range-score">{range.avgScore}% avg</span>
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

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #16a34a; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
  @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

  .chart-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .chart-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; }

  .correlation-list { display: flex; flex-direction: column; gap: 1.25rem; }
  .correlation-item { padding: 1rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }
  .correlation-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .correlation-exam { font-weight: 700; color: var(--color-text); }
  .correlation-value { font-weight: 700; font-size: 1rem; }
  .correlation-value.positive { color: #16a34a; }
  .correlation-value.negative { color: #ef4444; }
  .correlation-metrics { display: flex; gap: 1rem; margin-bottom: 0.5rem; }
  .correlation-metrics span { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--color-muted); }
  .correlation-insight { font-size: 0.8rem; color: var(--color-muted); margin: 0 0 0.75rem 0; line-height: 1.4; }
  .correlation-bar { height: 6px; background: var(--color-border); border-radius: 3px; position: relative; }
  .correlation-fill { height: 100%; border-radius: 3px; position: absolute; top: 0; }
  .correlation-fill.positive { background: #16a34a; left: 50%; }
  .correlation-fill.negative { background: #ef4444; right: 50%; }

  .time-range-list { display: flex; flex-direction: column; gap: 1.25rem; }
  .time-range-item { padding: 1rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }
  .time-range-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .time-range-label { font-weight: 700; color: var(--color-text); }
  .time-range-range { font-size: 0.75rem; color: var(--color-muted); }
  .time-range-bar-container { height: 8px; background: var(--color-surface); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
  .time-range-bar { height: 100%; background: #16a34a; border-radius: 4px; transition: width 0.5s ease; }
  .time-range-footer { display: flex; justify-content: space-between; align-items: center; }
  .time-range-count { font-size: 0.75rem; color: var(--color-muted); }
  .time-range-score { font-size: 0.8rem; font-weight: 700; color: #16a34a; }
</style>