<script lang="ts">
  import type { PageData } from './$types';
  import { Building2, Award, Users, TrendingUp, TrendingDown, Minus, Target, GraduationCap } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const { colleges } = data;

  const totalStudents = $derived(colleges.reduce((a: number, c: any) => a + c.students, 0));
</script>

<svelte:head><title>College Performance — MOUAU eTest</title></svelte:head>

<div class="page">
 <header class="page-header">
  <div>
    <h1>College Performance</h1>
    <p class="subtitle">Cross-college comparison: scores, pass rates, and enrollment</p>
  </div>
  <div class="total-badge">
    <Users size={14} />
    {totalStudents.toLocaleString()} students across {colleges.length} colleges
  </div>
</header>

  {#if colleges.length === 0}
    <div class="empty">
      <Building2 size={32} />
      <p>No college data available.</p>
    </div>
  {:else}
    <section class="college-grid">
      {#each colleges as college}
        <div class="college-card">
          <div class="college-header">
            <div class="college-icon"><Building2 size={20} /></div>
            <div class="college-info">
              <h3>{college.abbreviation}</h3>
              <span>{college.name}</span>
            </div>
            <span class="trend-icon"
              class:up={college.trend === 'up'}
              class:down={college.trend === 'down'}
              class:stable={college.trend === 'stable'}
            >
              {#if college.trend === 'up'}
                <TrendingUp size={16} />
              {:else if college.trend === 'down'}
                <TrendingDown size={16} />
              {:else}
                <Minus size={16} />
              {/if}
            </span>
          </div>

          <div class="college-stats">
            <div class="stat">
              <Users size={13} />
              <span class="stat-value">{college.students.toLocaleString()}</span>
              <span class="stat-label">Students</span>
            </div>
            <div class="stat">
              <Award size={13} />
              <span class="stat-value">{college.avgScore}%</span>
              <span class="stat-label">Avg Score</span>
            </div>
            <div class="stat">
              <Target size={13} />
              <span class="stat-value">{college.passRate}%</span>
              <span class="stat-label">Pass Rate</span>
            </div>
          </div>

          <div class="college-pass-bar">
            <div class="pass-fill" style="width: {college.passRate}%"></div>
          </div>

          <div class="college-footer">
            <span><GraduationCap size={12} /> Top: {college.topCourse}</span>
            <span>{college.exams} exams</span>
          </div>
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .page { max-width: 1200px; }
 .page-header {
  display: flex; align-items: center;
  justify-content: space-between;
  gap: 1rem; margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.total-badge {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.78rem; font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 0.4rem 0.875rem; border-radius: 999px;
  white-space: nowrap;
}
[data-theme="dark"] .total-badge { color: #60a5fa; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .college-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  @media (max-width: 768px) { .college-grid { grid-template-columns: 1fr; } }

  .college-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1.5rem;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .college-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.07);
    border-color: rgba(59, 130, 246, 0.2);
  }

  .college-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.25rem; }
  .college-icon {
    width: 40px; height: 40px; border-radius: 0.5rem; flex-shrink: 0;
    background: rgba(59,130,246,0.1); color: #3b82f6;
    display: flex; align-items: center; justify-content: center;
  }
  .college-info { flex: 1; min-width: 0; }
  .college-info h3 { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: 0; letter-spacing: -0.02em; }
  .college-info span { font-size: 0.72rem; color: var(--color-muted); }

  .trend-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .trend-icon.up     { color: #16a34a; }
  .trend-icon.down   { color: #ef4444; }
  .trend-icon.stable { color: var(--color-muted); }

  .college-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
  .stat :global(svg) { color: var(--color-muted); }
  .stat-value { font-size: 1.1rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.02em; }
  .stat-label { font-size: 0.65rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

  .college-pass-bar {
    height: 7px; background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px; overflow: hidden; margin-bottom: 1rem;
  }
  .pass-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 4px; transition: width 0.5s ease;
  }

  .college-footer {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.72rem; color: var(--color-muted);
  }
  .college-footer span { display: flex; align-items: center; gap: 0.3rem; }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 4rem 2rem; color: var(--color-muted); text-align: center;
    background: var(--color-surface); border: 1px dashed var(--color-border);
    border-radius: 0.875rem;
  }
  .empty p { margin: 0; font-size: 0.875rem; }
</style>