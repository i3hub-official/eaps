<!-- src/routes/admin/reports/exam-scheduling/+page.svelte -->

<script lang="ts">
  import { Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, Timer, Users, BookOpen } from 'lucide-svelte';

  let exams = $state([]);
  let summary = $state({
    scheduled: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    totalStudents: 0
  });
  let loading = $state(true);

  function getStatusColor(s: string) {
    return { scheduled: 'status-scheduled', active: 'status-active', completed: 'status-completed', cancelled: 'status-cancelled' }[s] || 'status-scheduled';
  }

  // Load data from the server load function
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(() => {
    // The data is already available via page.data from the server load
    // We'll set up a reactive effect to handle it
    const unsubscribe = page.subscribe($page => {
      if ($page.data) {
        exams = $page.data.exams || [];
        summary = $page.data.summary || {
          scheduled: 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          totalStudents: 0
        };
        loading = false;
      }
    });
    
    return unsubscribe;
  });
</script>

<svelte:head><title>Exam Scheduling — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Exam Scheduling</h1>
    <p class="subtitle">Schedule overview, upcoming exams, and status tracking</p>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading exam schedule...</p>
    </div>
  {:else}
    <section class="summary-row">
      <div class="summary-card">
        <Calendar size={20} />
        <div>
          <span class="summary-value">{summary.scheduled || 0}</span>
          <span class="summary-label">Scheduled</span>
        </div>
      </div>
      <div class="summary-card active">
        <Clock size={20} />
        <div>
          <span class="summary-value">{summary.active || 0}</span>
          <span class="summary-label">Active Now</span>
        </div>
      </div>
      <div class="summary-card completed">
        <CheckCircle2 size={20} />
        <div>
          <span class="summary-value">{summary.completed || 0}</span>
          <span class="summary-label">Completed</span>
        </div>
      </div>
      <div class="summary-card">
        <Users size={20} />
        <div>
          <span class="summary-value">{(summary.totalStudents || 0).toLocaleString()}</span>
          <span class="summary-label">Total Students</span>
        </div>
      </div>
    </section>

    <section class="table-section">
      {#if exams.length === 0}
        <div class="empty-state">
          <Calendar size={48} strokeWidth={1.5} />
          <p>No exams scheduled yet</p>
          <span>Create your first exam schedule to get started</span>
        </div>
      {:else}
        <table class="data-table">
          <thead>
            <tr>
              <th>Exam</th>
              <th>Date</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Students</th>
              <th>Invigilators</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each exams as exam}
              <tr>
                <td>
                  <div class="exam-cell">
                    <div class="exam-icon"><BookOpen size={16} /></div>
                    <span class="exam-title">{exam.title}</span>
                  </div>
                </td>
                <td>{exam.date || '—'}</td>
                <td>{exam.start || '—'} — {exam.end || '—'}</td>
                <td>{exam.duration || 0} min</td>
                <td>{exam.students || 0}</td>
                <td>{exam.invigilators || 0}</td>
                <td><span class="status-badge {getStatusColor(exam.status)}">{exam.status || 'unknown'}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/if}
</div>

<style>
  .page { max-width: 1200px; margin: 0 auto; padding: 1rem; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 768px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #3b82f6; }
  .summary-card.active { color: #f59e0b; }
  .summary-card.completed { color: #16a34a; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .exam-cell { display: flex; align-items: center; gap: 0.75rem; }
  .exam-icon { width: 32px; height: 32px; border-radius: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .exam-title { font-weight: 600; color: var(--color-text); }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-scheduled { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
  .status-active { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .status-completed { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-cancelled { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; color: var(--color-muted); }
  .spinner { width: 40px; height: 40px; border: 3px solid var(--color-border); border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 1rem; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 2rem; text-align: center; color: var(--color-muted); }
  .empty-state svg { color: var(--color-border); margin-bottom: 1rem; opacity: 0.5; }
  .empty-state p { font-size: 1rem; font-weight: 500; margin: 0 0 0.25rem 0; color: var(--color-text); }
  .empty-state span { font-size: 0.875rem; }
</style>