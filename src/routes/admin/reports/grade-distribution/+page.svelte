<!-- src/routes/admin/reports/grade-distribution/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Award, TrendingUp, GraduationCap } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  const gradeColors: Record<string, string> = {
    A: '#16a34a', B: '#22c55e', C: '#f59e0b', D: '#f97316', E: '#ef4444', F: '#dc2626',
  };

  const abRate = $derived(
    (data.gradeData.A?.percentage ?? 0) + (data.gradeData.B?.percentage ?? 0)
  );
  const passRate = $derived(
    (100 - (data.gradeData.F?.percentage ?? 0)).toFixed(1)
  );
</script>

<svelte:head><title>Grade Distribution — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Grade Distribution</h1>
    <p class="subtitle">Overall grade spread across all exams and sessions</p>
  </header>

  <div class="summary-row">
    <div class="summary-card">
      <span class="sum-icon"><GraduationCap size={18} /></span>
      <div>
        <span class="summary-value">{data.totalStudents.toLocaleString()}</span>
        <span class="summary-label">Total Graded</span>
      </div>
    </div>
    <div class="summary-card">
      <span class="sum-icon"><Award size={18} /></span>
      <div>
        <span class="summary-value">{abRate.toFixed(1)}%</span>
        <span class="summary-label">A &amp; B Grades</span>
      </div>
    </div>
    <div class="summary-card">
      <span class="sum-icon"><TrendingUp size={18} /></span>
      <div>
        <span class="summary-value">{passRate}%</span>
        <span class="summary-label">Pass Rate</span>
      </div>
    </div>
  </div>

  <div class="distribution-grid">
    <div class="chart-card">
      <h3>Grade Distribution Chart</h3>
      <div class="grade-bars">
        {#each Object.entries(data.gradeData) as [grade, d]}
          <div class="grade-row">
            <div class="grade-label">
              <span class="grade-letter" style="background:{gradeColors[grade]}20;color:{gradeColors[grade]}">{grade}</span>
              <span class="grade-range">{d.range}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:{d.percentage}%;background:{gradeColors[grade]}"></div>
            </div>
            <div class="grade-stats">
              <span class="grade-count">{d.count}</span>
              <span class="grade-pct">{d.percentage}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="chart-card">
      <h3>Grade Breakdown</h3>
      <div class="breakdown-list">
        {#each Object.entries(data.gradeData) as [grade, d]}
          <div class="breakdown-item">
            <span class="breakdown-dot" style="background:{gradeColors[grade]}"></span>
            <span class="breakdown-grade">Grade {grade}</span>
            <span class="breakdown-range">{d.range}</span>
            <span class="breakdown-count">{d.count} students</span>
            <span class="breakdown-pct" style="color:{gradeColors[grade]}">{d.percentage}%</span>
          </div>
        {/each}
      </div>
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
    width: 36px; height: 36px; border-radius: 0.6rem;
    background: rgba(59,130,246,0.1); color: #3b82f6;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .summary-card div { display: flex; flex-direction: column; gap: 0.15rem; }
  .summary-value { font-size: 1.3rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .summary-label { font-size: 0.73rem; color: var(--color-muted); }

  .distribution-grid {
    display: grid; grid-template-columns: 2fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 900px) { .distribution-grid { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.375rem 1.5rem;
  }
  .chart-card h3 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    margin: 0 0 1.25rem;
  }

  .grade-bars { display: flex; flex-direction: column; gap: 0.875rem; }
  .grade-row { display: flex; align-items: center; gap: 0.875rem; }
  .grade-label { display: flex; align-items: center; gap: 0.5rem; width: 110px; flex-shrink: 0; }
  .grade-letter {
    width: 30px; height: 30px; border-radius: 0.45rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 0.85rem;
  }
  .grade-range { font-size: 0.72rem; color: var(--color-muted); white-space: nowrap; }
  .bar-track {
    flex: 1; height: 22px; background: var(--color-bg);
    border-radius: 0.35rem; overflow: hidden;
    border: 1px solid var(--color-border);
  }
  .bar-fill { height: 100%; border-radius: 0.35rem; transition: width 0.5s ease; min-width: 3px; }
  .grade-stats { display: flex; flex-direction: column; align-items: flex-end; width: 72px; flex-shrink: 0; }
  .grade-count { font-weight: 700; color: var(--color-text); font-size: 0.855rem; }
  .grade-pct { font-size: 0.72rem; color: var(--color-muted); }

  .breakdown-list { display: flex; flex-direction: column; }
  .breakdown-item {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.625rem 0; border-bottom: 1px solid var(--color-border);
  }
  .breakdown-item:last-child { border-bottom: none; }
  .breakdown-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .breakdown-grade { font-size: 0.82rem; font-weight: 700; color: var(--color-text); width: 54px; }
  .breakdown-range { font-size: 0.72rem; color: var(--color-muted); width: 64px; }
  .breakdown-count { font-size: 0.78rem; color: var(--color-muted); flex: 1; }
  .breakdown-pct { font-size: 0.82rem; font-weight: 800; width: 44px; text-align: right; }
</style>
