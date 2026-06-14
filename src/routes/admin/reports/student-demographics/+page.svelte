<script lang="ts">
  import type { PageData } from './$types';
  import { GraduationCap, Building2, Layers } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const { byLevel, byCollege, byDepartment } = data;
</script>

<svelte:head><title>Student Demographics — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Student Demographics</h1>
    <p class="subtitle">Enrollment distribution by level, college, and department</p>
  </header>

  <section class="demographics-grid">
    <div class="chart-card">
      <h3><GraduationCap size={16} /> By Level</h3>
      {#if byLevel.length === 0}
        <p class="empty">No data available.</p>
      {:else}
        <div class="demo-list">
          {#each byLevel as lvl}
            <div class="demo-item">
              <div class="demo-header">
                <span class="demo-label">{lvl.level} Level</span>
                <span class="demo-count">{lvl.count} students</span>
              </div>
              <div class="demo-bar-container">
                <div class="demo-bar" style="width: {lvl.percentage}%"></div>
              </div>
              <span class="demo-pct">{lvl.percentage}%</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="chart-card">
      <h3><Building2 size={16} /> By College</h3>
      {#if byCollege.length === 0}
        <p class="empty">No data available.</p>
      {:else}
        <div class="demo-list">
          {#each byCollege as college}
            <div class="demo-item">
              <div class="demo-header">
                <span class="demo-label">{college.abbreviation}</span>
                <span class="demo-count">{college.count}</span>
              </div>
              <div class="demo-bar-container">
                <div class="demo-bar college" style="width: {college.percentage}%"></div>
              </div>
              <span class="demo-pct">{college.percentage}%</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="chart-card wide">
      <h3><Layers size={16} /> By Department</h3>
      {#if byDepartment.length === 0}
        <p class="empty">No data available.</p>
      {:else}
        <div class="dept-grid">
          {#each byDepartment as dept}
            <div class="dept-item">
              <div class="dept-header">
                <span class="dept-name">{dept.name}</span>
                <span class="dept-college">{dept.college}</span>
              </div>
              <div class="dept-bar-container">
                <div class="dept-bar" style="width: {dept.percentage}%"></div>
              </div>
              <div class="dept-footer">
                <span>{dept.count} students</span>
                <span>{dept.percentage}%</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
</div>
<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .demographics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .demographics-grid .wide { grid-column: 1 / -1; }
  @media (max-width: 768px) { .demographics-grid { grid-template-columns: 1fr; } }

  .chart-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .chart-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem; }

  .empty { font-size: 0.85rem; color: var(--color-muted); text-align: center; padding: 2rem 0; margin: 0; }

  .demo-list { display: flex; flex-direction: column; gap: 1rem; }
  .demo-item { padding: 0.75rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }
  .demo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .demo-label { font-weight: 600; color: var(--color-text); font-size: 0.875rem; }
  .demo-count { font-size: 0.75rem; color: var(--color-muted); }
  .demo-bar-container { height: 8px; background: var(--color-surface); border-radius: 4px; overflow: hidden; margin-bottom: 0.25rem; }
  .demo-bar { height: 100%; background: #3b82f6; border-radius: 4px; transition: width 0.5s ease; }
  .demo-bar.college { background: #3b82f6; }
  .demo-pct { font-size: 0.75rem; font-weight: 700; color: var(--color-text); }

  .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
  .dept-item { padding: 0.875rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }
  .dept-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .dept-name { font-weight: 600; color: var(--color-text); font-size: 0.875rem; }
  .dept-college { font-size: 0.7rem; color: var(--color-muted); background: var(--color-surface); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
  .dept-bar-container { height: 6px; background: var(--color-surface); border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem; }
  .dept-bar { height: 100%; background: #3b82f6; border-radius: 3px; transition: width 0.5s ease; }
  .dept-footer { display: flex; justify-content: space-between; font-size: 0.75rem; }
  .dept-footer span:first-child { color: var(--color-muted); }
  .dept-footer span:last-child { font-weight: 700; color: var(--color-text); }
</style>