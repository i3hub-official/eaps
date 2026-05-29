<script lang="ts">
  import type { PageData } from './$types';
  import { Clock, Target, Zap } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  const maxCount = $derived(Math.max(...data.timeRanges.map(r => r.count), 1));
</script>

<svelte:head><title>Time vs Score — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Time vs Score Correlation</h1>
    <p class="subtitle">Relationship between time spent and exam performance</p>
  </header>

  <div class="summary-row">
    <div class="summary-card">
      <span class="sum-icon"><Clock size={18} /></span>
      <div>
        <span class="summary-value">{data.globalAvgTime} min</span>
        <span class="summary-label">Avg Time Spent</span>
      </div>
    </div>
    <div class="summary-card">
      <span class="sum-icon"><Target size={18} /></span>
      <div>
        <span class="summary-value">{data.globalAvgScore}%</span>
        <span class="summary-label">Avg Score</span>
      </div>
    </div>
    <div class="summary-card">
      <span class="sum-icon"><Zap size={18} /></span>
      <div>
        <span class="summary-value">+0.18</span>
        <span class="summary-label">Overall Correlation</span>
      </div>
    </div>
  </div>

  <div class="charts-grid">

    <!-- Correlation by exam -->
    <div class="chart-card">
      <h3>Correlation by Exam</h3>
      {#if data.correlations.length === 0}
        <p class="empty">No exam data available yet.</p>
      {:else}
        <div class="corr-list">
          {#each data.correlations as c}
            <div class="corr-item">
              <div class="corr-top">
                <span class="corr-exam">{c.exam}</span>
                <span class="corr-val" class:pos={c.correlation > 0} class:neg={c.correlation < 0}>
                  {c.correlation > 0 ? '+' : ''}{c.correlation.toFixed(2)}
                </span>
              </div>
              <div class="corr-meta">
                <span><Clock size={11} /> {c.avgTime} min avg</span>
                <span><Target size={11} /> {c.avgScore}% avg</span>
              </div>
              <p class="corr-insight">{c.insight}</p>
              <!-- Centred correlation bar -->
              <div class="corr-bar-wrap">
                <div class="corr-bar-track">
                  <div
                    class="corr-bar-fill"
                    class:pos={c.correlation > 0}
                    class:neg={c.correlation < 0}
                    style="width:{Math.abs(c.correlation) * 100}%;{c.correlation >= 0 ? 'left:50%' : 'right:50%'}"
                  ></div>
                  <div class="corr-center-line"></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Score by time range -->
    <div class="chart-card">
      <h3>Score by Time Range</h3>
      {#if data.timeRanges.length === 0}
        <p class="empty">No session data available yet.</p>
      {:else}
        <div class="range-list">
          {#each data.timeRanges as r}
            <div class="range-item">
              <div class="range-top">
                <span class="range-label">{r.label}</span>
                <span class="range-sub">{r.range}</span>
              </div>
              <div class="range-track">
                <div class="range-fill" style="width:{(r.count / maxCount) * 100}%"></div>
              </div>
              <div class="range-foot">
                <span class="range-count">{r.count} students</span>
                <span class="range-score">{r.avgScore}%</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  .page { max-width: 1200px; padding: 1.75rem 2rem 4rem; margin: 0 auto; }

  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 {
    font-size: 1.65rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.25rem;
  }
  .subtitle { color: var(--color-muted); font-size: 0.82rem; margin: 0; }

  /* ── Summary ── */
  .summary-row {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1rem; margin-bottom: 1.5rem;
  }
  @media (max-width: 640px) { .summary-row { grid-template-columns: 1fr; } }

  .summary-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1rem 1.25rem;
    display: flex; align-items: center; gap: 0.875rem;
  }
  .sum-icon {
    width: 36px; height: 36px; border-radius: 0.6rem; flex-shrink: 0;
    background: rgba(22,163,74,0.1); color: #16a34a;
    display: flex; align-items: center; justify-content: center;
  }
  .summary-card div { display: flex; flex-direction: column; gap: 0.15rem; }
  .summary-value { font-size: 1.3rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .summary-label { font-size: 0.73rem; color: var(--color-muted); }

  /* ── Grid ── */
  .charts-grid {
    display: grid; grid-template-columns: 2fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.375rem 1.5rem;
  }
  .chart-card h3 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted); margin: 0 0 1.125rem;
  }
  .empty { font-size: 0.85rem; color: var(--color-muted); text-align: center; padding: 2rem 0; }

  /* ── Correlation list ── */
  .corr-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .corr-item {
    padding: 0.875rem 1rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.65rem;
  }
  .corr-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.35rem;
  }
  .corr-exam { font-size: 0.855rem; font-weight: 700; color: var(--color-text); }
  .corr-val  { font-size: 0.95rem; font-weight: 800; }
  .corr-val.pos { color: #16a34a; }
  .corr-val.neg { color: #ef4444; }

  .corr-meta {
    display: flex; gap: 1rem; margin-bottom: 0.4rem;
  }
  .corr-meta span {
    display: flex; align-items: center; gap: 0.25rem;
    font-size: 0.73rem; color: var(--color-muted);
  }
  .corr-insight {
    font-size: 0.77rem; color: var(--color-muted);
    line-height: 1.45; margin: 0 0 0.65rem;
  }

  .corr-bar-wrap { }
  .corr-bar-track {
    position: relative; height: 6px;
    background: var(--color-border); border-radius: 999px; overflow: hidden;
  }
  .corr-bar-fill {
    position: absolute; top: 0; height: 100%;
    border-radius: 999px; min-width: 3px;
  }
  .corr-bar-fill.pos { background: #16a34a; }
  .corr-bar-fill.neg { background: #ef4444; }
  .corr-center-line {
    position: absolute; left: 50%; top: 0;
    width: 1px; height: 100%; background: var(--color-muted); opacity: 0.4;
  }

  /* ── Time range list ── */
  .range-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .range-item {
    padding: 0.875rem 1rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.65rem;
  }
  .range-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .range-label { font-size: 0.855rem; font-weight: 700; color: var(--color-text); }
  .range-sub   { font-size: 0.72rem; color: var(--color-muted); }
  .range-track {
    height: 7px; background: var(--color-border);
    border-radius: 999px; overflow: hidden; margin-bottom: 0.5rem;
  }
  .range-fill {
    height: 100%; background: #16a34a;
    border-radius: 999px; transition: width 0.5s ease; min-width: 3px;
  }
  .range-foot {
    display: flex; align-items: center; justify-content: space-between;
  }
  .range-count { font-size: 0.72rem; color: var(--color-muted); }
  .range-score { font-size: 0.82rem; font-weight: 800; color: #16a34a; }
</style>