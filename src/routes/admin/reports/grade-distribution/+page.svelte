<script lang="ts">
  import { Award, BarChart3, PieChart, TrendingUp, GraduationCap } from 'lucide-svelte';

  let gradeData = $state({
    A: { count: 234, percentage: 18.7, range: '70-100%' },
    B: { count: 456, percentage: 36.5, range: '60-69%' },
    C: { count: 312, percentage: 25.0, range: '50-59%' },
    D: { count: 178, percentage: 14.3, range: '45-49%' },
    E: { count: 45, percentage: 3.6, range: '40-44%' },
    F: { count: 22, percentage: 1.8, range: '0-39%' },
  });

  let totalStudents = $derived(Object.values(gradeData).reduce((a, g) => a + g.count, 0));

  const gradeColors: Record<string, string> = {
    A: '#16a34a', B: '#22c55e', C: '#f59e0b', D: '#f97316', E: '#ef4444', F: '#dc2626'
  };
</script>

<svelte:head><title>Grade Distribution — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Grade Distribution</h1>
    <p class="subtitle">Overall grade spread across all exams and sessions</p>
  </header>

  <section class="summary-row">
    <div class="summary-card">
      <GraduationCap size={20} />
      <div>
        <span class="summary-value">{totalStudents.toLocaleString()}</span>
        <span class="summary-label">Total Graded</span>
      </div>
    </div>
    <div class="summary-card">
      <Award size={20} />
      <div>
        <span class="summary-value">{gradeData.A.percentage + gradeData.B.percentage}%</span>
        <span class="summary-label">A & B Grades</span>
      </div>
    </div>
    <div class="summary-card">
      <TrendingUp size={20} />
      <div>
        <span class="summary-value">{(100 - gradeData.F.percentage).toFixed(1)}%</span>
        <span class="summary-label">Pass Rate</span>
      </div>
    </div>
  </section>

  <section class="distribution-grid">
    <div class="chart-card">
      <h3>Grade Distribution Chart</h3>
      <div class="grade-bars">
        {#each Object.entries(gradeData) as [grade, data]}
          <div class="grade-row">
            <div class="grade-label">
              <span class="grade-letter" style="background: {gradeColors[grade]}20; color: {gradeColors[grade]}">{grade}</span>
              <span class="grade-range">{data.range}</span>
            </div>
            <div class="grade-bar-container">
              <div class="grade-bar" style="width: {data.percentage}%; background: {gradeColors[grade]}"></div>
            </div>
            <div class="grade-stats">
              <span class="grade-count">{data.count}</span>
              <span class="grade-pct">{data.percentage}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="chart-card compact">
      <h3>Grade Breakdown</h3>
      <div class="breakdown-list">
        {#each Object.entries(gradeData) as [grade, data]}
          <div class="breakdown-item">
            <div class="breakdown-dot" style="background: {gradeColors[grade]}"></div>
            <span class="breakdown-grade">Grade {grade}</span>
            <span class="breakdown-range">{data.range}</span>
            <span class="breakdown-count">{data.count} students</span>
            <span class="breakdown-pct">{data.percentage}%</span>
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

  .distribution-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
  @media (max-width: 900px) { .distribution-grid { grid-template-columns: 1fr; } }

  .chart-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .chart-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; }

  .grade-bars { display: flex; flex-direction: column; gap: 1rem; }
  .grade-row { display: flex; align-items: center; gap: 1rem; }
  .grade-label { display: flex; align-items: center; gap: 0.5rem; width: 120px; flex-shrink: 0; }
  .grade-letter { width: 32px; height: 32px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; }
  .grade-range { font-size: 0.75rem; color: var(--color-muted); }
  .grade-bar-container { flex: 1; height: 24px; background: var(--color-bg); border-radius: 0.375rem; overflow: hidden; }
  .grade-bar { height: 100%; border-radius: 0.375rem; transition: width 0.5s ease; }
  .grade-stats { display: flex; flex-direction: column; align-items: flex-end; width: 80px; flex-shrink: 0; }
  .grade-count { font-weight: 700; color: var(--color-text); font-size: 0.875rem; }
  .grade-pct { font-size: 0.75rem; color: var(--color-muted); }

  .breakdown-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .breakdown-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0; border-bottom: 1px solid var(--color-border); }
  .breakdown-item:last-child { border-bottom: none; }
  .breakdown-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .breakdown-grade { font-weight: 600; color: var(--color-text); width: 60px; }
  .breakdown-range { font-size: 0.75rem; color: var(--color-muted); width: 70px; }
  .breakdown-count { font-size: 0.8rem; color: var(--color-text); flex: 1; text-align: right; }
  .breakdown-pct { font-size: 0.8rem; font-weight: 700; color: var(--color-text); width: 50px; text-align: right; }
</style>