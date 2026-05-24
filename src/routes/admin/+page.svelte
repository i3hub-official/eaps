<!-- src/routes/(admin)/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  function fmtTime(d: Date) {
    return new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }
</script>

<svelte:head><title>Admin Dashboard — MOUAU eTest</title></svelte:head>

<div class="page">
  <h1>Admin Dashboard</h1>

  <div class="stat-grid">
    <div class="stat-card blue">
      <span class="sv">{data.totalStudents}</span>
      <span class="sl">Students</span>
    </div>
    <div class="stat-card green">
      <span class="sv">{data.totalLecturers}</span>
      <span class="sl">Lecturers</span>
    </div>
    <div class="stat-card purple">
      <span class="sv">{data.totalStaff}</span>
      <span class="sl">Invigilators</span>
    </div>
    <div class="stat-card orange">
      <span class="sv">{data.activeExams}</span>
      <span class="sl">Active Exams</span>
    </div>
    <div class="stat-card">
      <span class="sv">{data.totalExams}</span>
      <span class="sl">Total Exams</span>
    </div>
  </div>

  <div class="quick-links">
    <a href="/admin/users" class="link-card">
      <span class="icon" aria-hidden="true">👥</span>
      <span>Manage Users</span>
    </a>
    <a href="/admin/reports" class="link-card">
      <span class="icon" aria-hidden="true">📊</span>
      <span>Reports</span>
    </a>
  </div>

  <div class="activity">
    <h2>Recent Activity</h2>
    {#if data.recentActivity.length === 0}
      <p class="empty">No activity yet.</p>
    {:else}
      <ul class="activity-list">
        {#each data.recentActivity as log}
          <li>
            <span class="action">{log.action}</span>
            {#if log.entity}<span class="entity">on {log.entity}</span>{/if}
            {#if log.user_name}<span class="who">by {log.user_name}</span>{/if}
            <span class="when">{fmtTime(log.created_at)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .page { padding: 2rem; max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
  h1 { font-size: 1.5rem; font-weight: 700; margin: 0; }

  .stat-grid { display: flex; gap: 1rem; flex-wrap: wrap; }
  .stat-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem 1.5rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.3rem; min-width: 110px;
  }
  .sv { font-size: 2rem; font-weight: 800; }
  .sl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); }
  .stat-card.blue   .sv { color: #2563eb; }
  .stat-card.green  .sv { color: #16a34a; }
  .stat-card.purple .sv { color: #7c3aed; }
  .stat-card.orange .sv { color: #d97706; }

  .quick-links { display: flex; gap: 1rem; flex-wrap: wrap; }
  .link-card {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 1rem 1.5rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.75rem;
    text-decoration: none; color: var(--color-text); font-weight: 600;
    transition: border-color 0.15s;
  }
  .link-card:hover { border-color: var(--color-primary); }
  .icon { font-size: 1.25rem; }

  .activity {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem;
  }
  h2 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; }
  .activity-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .activity-list li {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;
    font-size: 0.85rem; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);
  }
  .action { font-weight: 600; }
  .entity, .who { color: var(--color-muted); }
  .when   { margin-left: auto; color: var(--color-muted); font-size: 0.78rem; font-variant-numeric: tabular-nums; }
  .empty  { color: var(--color-muted); }
</style>