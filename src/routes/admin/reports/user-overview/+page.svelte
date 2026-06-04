<!-- src/routes/admin/reports/users/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Users, GraduationCap, BookOpen, ShieldCheck, UserPlus, UserCheck, UserX, TrendingUp } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { stats, roleDistribution } = data;
</script>

<svelte:head><title>User Overview — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>User Overview</h1>
    <p class="subtitle">Complete user base analytics and role distribution</p>
  </header>

  <section class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon total"><Users size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.total.toLocaleString()}</span>
        <span class="metric-label">Total Users</span>
      </div>
      <div class="metric-trend up">
        <TrendingUp size={14} />
        <span>+{stats.newThisMonth}</span>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon students"><GraduationCap size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.students.toLocaleString()}</span>
        <span class="metric-label">Students</span>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon lecturers"><BookOpen size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.lecturers}</span>
        <span class="metric-label">Lecturers</span>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon invigilators"><ShieldCheck size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.invigilators}</span>
        <span class="metric-label">Invigilators</span>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon active"><UserCheck size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.active.toLocaleString()}</span>
        <span class="metric-label">Active</span>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon suspended"><UserX size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.suspended}</span>
        <span class="metric-label">Suspended</span>
      </div>
    </div>
  </section>

  <section class="chart-card">
    <h3>Role Distribution</h3>
    <div class="distribution-chart">
      {#each roleDistribution as role}
        <div class="dist-row">
          <div class="dist-info">
            <span class="dist-dot" style="background: {role.color}"></span>
            <span class="dist-role">{role.role}</span>
            <span class="dist-count">{role.count}</span>
          </div>
          <div class="dist-bar-container">
            <div class="dist-bar" style="width: {role.percentage}%; background: {role.color}"></div>
          </div>
          <span class="dist-pct">{role.percentage}%</span>
        </div>
      {/each}
    </div>
  </section>
</div>
<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

  .metric-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; align-items: center; gap: 0.875rem; }
  .metric-icon { width: 40px; height: 40px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .metric-icon.total        { background: rgba(59,130,246,0.1);  color: #3b82f6; }
  .metric-icon.students     { background: rgba(22,163,74,0.1);   color: #16a34a; }
  .metric-icon.lecturers    { background: rgba(99,102,241,0.1);  color: #6366f1; }
  .metric-icon.invigilators { background: rgba(245,158,11,0.1);  color: #f59e0b; }
  .metric-icon.active       { background: rgba(22,163,74,0.1);   color: #16a34a; }
  .metric-icon.suspended    { background: rgba(239,68,68,0.1);   color: #ef4444; }

  .metric-content { flex: 1; display: flex; flex-direction: column; }
  .metric-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .metric-label { font-size: 0.75rem; color: var(--color-muted); }

  .metric-trend { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 0.375rem; }
  .metric-trend.up { color: #16a34a; background: rgba(22,163,74,0.1); }

  .chart-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .chart-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem; }

  .distribution-chart { display: flex; flex-direction: column; gap: 1rem; }
  .dist-row { display: flex; align-items: center; gap: 1rem; }
  .dist-info { display: flex; align-items: center; gap: 0.5rem; width: 180px; flex-shrink: 0; }
  .dist-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dist-role { font-size: 0.875rem; font-weight: 600; color: var(--color-text); }
  .dist-count { font-size: 0.75rem; color: var(--color-muted); margin-left: auto; }
  .dist-bar-container { flex: 1; height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; }
  .dist-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
  .dist-pct { font-size: 0.8rem; font-weight: 700; color: var(--color-text); width: 50px; text-align: right; }
</style>