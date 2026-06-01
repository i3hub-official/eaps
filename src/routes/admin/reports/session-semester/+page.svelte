<script lang="ts">
  import type { PageData } from './$types';
  import { Calendar, BookOpen, Users, Award, TrendingUp, TrendingDown, Target } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Session / Semester Trends — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Session / Semester Trends</h1>
    <p class="subtitle">Longitudinal analysis across academic sessions and semesters</p>
  </header>

  <section class="session-grid">
    {#each data.sessions as s}
      <div class="session-card">
        <div class="session-header">
          <div class="session-badge">
            <Calendar size={16} />
            <span>{s.session}</span>
          </div>
          <span class="semester-badge">Semester {s.semester}</span>
          <span class="trend-icon" class:up={s.trend === 'up'} class:down={s.trend === 'down'} class:stable={s.trend === 'stable'}>
            <TrendingUp size={16} />
          </span>
        </div>

        <div class="session-stats">
          <div class="stat">
            <BookOpen size={14} />
            <span class="stat-value">{s.exams}</span>
            <span class="stat-label">Exams</span>
          </div>
          <div class="stat">
            <Users size={14} />
            <span class="stat-value">{(s.students ?? 0).toLocaleString()}</span>
            <span class="stat-label">Students</span>
          </div>
          <div class="stat">
            <Award size={14} />
            <span class="stat-value">{s.avgScore}%</span>
            <span class="stat-label">Avg Score</span>
          </div>
          <div class="stat">
            <Target size={14} />
            <span class="stat-value">{s.passRate}%</span>
            <span class="stat-label">Pass Rate</span>
          </div>
        </div>

        <div class="session-pass-bar">
          <div class="pass-fill" style="width: {s.passRate}%"></div>
        </div>
      </div>
    {/each}

    {#if data.sessions.length === 0}
      <div class="empty">
        <Calendar size={32} />
        <p>No session data found.</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }

  .session-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .session-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
  .session-badge { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.625rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; }
  .semester-badge { padding: 0.25rem 0.5rem; background: rgba(22, 163, 74, 0.1); color: #16a34a; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }

  .trend-icon { display: flex; align-items: center; justify-content: center; margin-left: auto; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }

  .session-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.75rem; background: var(--color-bg); border-radius: 0.5rem; }
  .stat :global(svg) { color: var(--color-muted); }
  .stat-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
  .stat-label { font-size: 0.7rem; color: var(--color-muted); }

  .session-pass-bar { height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; }
  .pass-fill { height: 100%; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; transition: width 0.5s ease; }

  .empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; color: var(--color-muted); }
</style>