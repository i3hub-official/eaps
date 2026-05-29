<script lang="ts">
  import { Building2, Award, Users, TrendingUp, TrendingDown, Target, GraduationCap } from 'lucide-svelte';

  let colleges = $state([
    { id: 1, name: 'College of Physical & Applied Sciences', abbreviation: 'CPAS', students: 445, exams: 12, avgScore: 66.8, passRate: 72.3, topCourse: 'CSC 201', trend: 'up' },
    { id: 2, name: 'College of Biological Sciences', abbreviation: 'CBS', students: 267, exams: 8, avgScore: 71.2, passRate: 78.5, topCourse: 'BIO 101', trend: 'up' },
    { id: 3, name: 'College of Engineering', abbreviation: 'COE', students: 134, exams: 6, avgScore: 58.9, passRate: 64.2, topCourse: 'ENG 201', trend: 'down' },
    { id: 4, name: 'College of Arts & Humanities', abbreviation: 'CAH', students: 46, exams: 3, avgScore: 82.4, passRate: 89.1, topCourse: 'ENG 101', trend: 'stable' },
  ]);

  let totalStudents = $derived(colleges.reduce((a, c) => a + c.students, 0));
</script>

<svelte:head><title>College Performance — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>College Performance</h1>
    <p class="subtitle">Cross-college comparison: scores, pass rates, and enrollment</p>
  </header>

  <section class="college-grid">
    {#each colleges as college}
      <div class="college-card">
        <div class="college-header">
          <div class="college-icon"><Building2 size={20} /></div>
          <div class="college-info">
            <h3>{college.abbreviation}</h3>
            <span>{college.name}</span>
          </div>
          <span class="trend-icon" class:up={college.trend === 'up'} class:down={college.trend === 'down'} class:stable={college.trend === 'stable'}>
            <TrendingUp size={16} />
          </span>
        </div>

        <div class="college-stats">
          <div class="stat">
            <Users size={14} />
            <span class="stat-value">{college.students}</span>
            <span class="stat-label">Students</span>
          </div>
          <div class="stat">
            <Award size={14} />
            <span class="stat-value">{college.avgScore}%</span>
            <span class="stat-label">Avg Score</span>
          </div>
          <div class="stat">
            <Target size={14} />
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
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .college-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  @media (max-width: 768px) { .college-grid { grid-template-columns: 1fr; } }

  .college-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .college-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.25rem; }
  .college-icon { width: 40px; height: 40px; border-radius: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .college-info { flex: 1; }
  .college-info h3 { font-size: 1.125rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .college-info span { font-size: 0.75rem; color: var(--color-muted); }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }

  .college-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .stat :global(svg) { color: var(--color-muted); }
  .stat-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
  .stat-label { font-size: 0.7rem; color: var(--color-muted); }

  .college-pass-bar { height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
  .pass-fill { height: 100%; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; transition: width 0.5s ease; }

  .college-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--color-muted); }
  .college-footer span { display: flex; align-items: center; gap: 0.25rem; }
</style>