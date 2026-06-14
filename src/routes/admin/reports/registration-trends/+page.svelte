<script lang="ts">
  import type { PageData } from './$types';
  import { BookOpen, Calendar } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const { monthlyData, courseRegistrations, maxCount } = data;

  // Scale bar heights relative to the tallest month
  const chartMax = Math.max(...monthlyData.map((m: any) => m.newUsers), 1);
</script>

<svelte:head><title>Registration Trends — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Registration Trends</h1>
    <p class="subtitle">User registration growth and course enrollment patterns over time</p>
  </header>

  <!-- Monthly registrations chart -->
  <section class="chart-card">
    <h3><Calendar size={16} /> Monthly User Registration</h3>

    {#if monthlyData.length === 0}
      <p class="empty">No registration data in the last 6 months.</p>
    {:else}
      <div class="trend-chart">
        {#each monthlyData as month}
          <div class="bar-group">
            <span class="bar-total">{month.newUsers}</span>
            <div class="bar-stack">
              <div class="segment invigilators"
                style="height: {(month.invigilators / chartMax) * 140}px"></div>
              <div class="segment lecturers"
                style="height: {(month.lecturers / chartMax) * 140}px"></div>
              <div class="segment students"
                style="height: {(month.students / chartMax) * 140}px"></div>
            </div>
            <span class="bar-month">{month.month}</span>
          </div>
        {/each}
      </div>

      <div class="legend">
        <span><span class="dot students"></span> Students</span>
        <span><span class="dot lecturers"></span> Lecturers</span>
        <span><span class="dot invigilators"></span> Invigilators</span>
      </div>
    {/if}
  </section>

  <!-- Course registrations -->
  <section class="chart-card">
    <h3><BookOpen size={16} /> Course Registrations by Session</h3>

    {#if courseRegistrations.length === 0}
      <p class="empty">No course registration data available.</p>
    {:else}
      <div class="reg-grid">
        {#each courseRegistrations as reg}
          <div class="reg-card">
            <div class="reg-header">
              <span class="reg-session">{reg.session}</span>
              <span class="reg-semester">Semester {reg.semester}</span>
            </div>
            <div class="reg-count">{reg.count.toLocaleString()}</div>
            <div class="reg-label">registrations</div>
            <div class="reg-track">
              <div class="reg-fill" style="width: {(reg.count / maxCount) * 100}%"></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .page { max-width: 1200px; display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { margin-bottom: 0; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .chart-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.5rem;
  }
  .chart-card h3 {
    font-size: 1rem; font-weight: 600; color: var(--color-text);
    margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem;
  }

  .empty { font-size: 0.85rem; color: var(--color-muted); text-align: center; padding: 2rem 0; margin: 0; }

  /* ── Bar chart ──────────────────────────────────── */
  .trend-chart {
    display: flex; align-items: flex-end; gap: 0.75rem;
    height: 180px; padding-bottom: 2rem; position: relative;
  }

  .bar-group {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; position: relative; gap: 0;
  }

  .bar-total {
    font-size: 0.68rem; font-weight: 700; color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  .bar-stack {
    width: 100%; display: flex; flex-direction: column;
    border-radius: 0.25rem; overflow: hidden; gap: 1px;
  }

  .segment { width: 100%; min-height: 2px; transition: height 0.5s ease; }
  .segment.students     { background: #3b82f6; }
  .segment.lecturers    { background: #6366f1; }
  .segment.invigilators { background: #f97316; }

  .bar-month {
    position: absolute; bottom: -1.6rem;
    font-size: 0.65rem; color: var(--color-muted); white-space: nowrap;
  }

  .legend {
    display: flex; gap: 1.5rem;
    margin-top: 1.25rem; padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }
  .legend span {
    display: flex; align-items: center; gap: 0.375rem;
    font-size: 0.8rem; color: var(--color-text);
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .dot.students     { background: #3b82f6; }
  .dot.lecturers    { background: #6366f1; }
  .dot.invigilators { background: #f97316; }

  /* ── Registration cards ─────────────────────────── */
  .reg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .reg-card {
    padding: 1.1rem; background: var(--color-bg);
    border-radius: 0.5rem; border: 1px solid var(--color-border);
  }

  .reg-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
  }

  .reg-session { font-weight: 700; color: var(--color-text); font-size: 0.875rem; }
  .reg-semester {
    font-size: 0.7rem; color: var(--color-muted);
    background: var(--color-surface); padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }

  .reg-count { font-size: 1.5rem; font-weight: 800; color: #3b82f6; line-height: 1; }
  [data-theme="dark"] .reg-count { color: #60a5fa; }
  .reg-label { font-size: 0.72rem; color: var(--color-muted); margin: 0.2rem 0 0.75rem; }

  .reg-track {
    height: 6px; background: var(--color-surface);
    border-radius: 3px; overflow: hidden;
  }
  .reg-fill {
    height: 100%; background: #3b82f6;
    border-radius: 3px; transition: width 0.5s ease;
  }
  [data-theme="dark"] .reg-fill { background: #60a5fa; }
</style>