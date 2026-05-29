<script lang="ts">
  import { BarChart3, GraduationCap, Award, Target, TrendingUp, TrendingDown, Users } from 'lucide-svelte';

  let levels = $state([]);
</script>

<svelte:head><title>Level Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Level Analysis</h1>
    <p class="subtitle">Performance comparison across academic levels (100L — 500L)</p>
  </header>

  <section class="level-grid">
    {#each levels as lvl}
      <div class="level-card">
        <div class="level-header">
          <div class="level-badge">{lvl.level}L</div>
          <span class="trend-icon" class:up={lvl.trend === 'up'} class:down={lvl.trend === 'down'} class:stable={lvl.trend === 'stable'}>
            <TrendingUp size={16} />
          </span>
        </div>

        <div class="level-stats">
          <div class="stat">
            <Users size={14} />
            <span class="stat-value">{lvl.students}</span>
            <span class="stat-label">Students</span>
          </div>
          <div class="stat">
            <Award size={14} />
            <span class="stat-value">{lvl.avgScore}%</span>
            <span class="stat-label">Avg Score</span>
          </div>
          <div class="stat">
            <Target size={14} />
            <span class="stat-value">{lvl.passRate}%</span>
            <span class="stat-label">Pass Rate</span>
          </div>
        </div>

        <div class="level-pass-bar">
          <div class="pass-fill" style="width: {lvl.passRate}%"></div>
        </div>

        <div class="level-footer">
          <span><GraduationCap size={12} /> {lvl.exams} exams</span>
          <span>Top: {lvl.topDept}</span>
        </div>
      </div>
    {/each}
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .level-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

  .level-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .level-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
  .level-badge { width: 48px; height: 48px; border-radius: 0.75rem; background: linear-gradient(135deg, #16a34a, #15803d); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.125rem; color: white; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }

  .level-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .stat :global(svg) { color: var(--color-muted); }
  .stat-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
  .stat-label { font-size: 0.7rem; color: var(--color-muted); }

  .level-pass-bar { height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
  .pass-fill { height: 100%; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; transition: width 0.5s ease; }

  .level-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--color-muted); }
  .level-footer span { display: flex; align-items: center; gap: 0.25rem; }
</style>