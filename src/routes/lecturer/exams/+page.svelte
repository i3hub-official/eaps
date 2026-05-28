<!-- src/routes/lecturer/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { exams, statsMap } = data;

  const STATUS_COLOR: Record<string, string> = {
    draft: 'gray', scheduled: 'blue', active: 'green',
    completed: 'purple', cancelled: 'red',
  };
</script>

<svelte:head><title>Lecturer Dashboard — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="page-header">
    <div>
      <h1>My Exams</h1>
      <p class="sub">Welcome back, {data.user.fullName}</p>
    </div>
    <a href="/lecturer/exams/create" class="btn-primary">+ New Exam</a>
  </div>

  {#if exams.length === 0}
    <div class="empty">
      <p>You haven't created any exams yet.</p>
      <a href="/lecturer/exams/create" class="btn-primary">Create your first exam</a>
    </div>
  {:else}
    <div class="exam-grid">
      {#each exams as exam}
        {@const s = statsMap[exam.id]}
        <div class="exam-card">
          <div class="card-top">
            <span class="course-badge">{exam.course.code}</span>
            <span class="status-dot {STATUS_COLOR[exam.status]}">{exam.status}</span>
          </div>
          <h2 class="exam-title">{exam.title}</h2>
          <p class="exam-meta">
            {exam.durationMinutes}min · {exam.totalMarks} marks · Pass {exam.passMark}
          </p>

          {#if s}
            <div class="stats-row">
              <div class="stat"><span class="sv">{s.total}</span><span class="sl">Students</span></div>
              <div class="stat"><span class="sv">{s.submitted}</span><span class="sl">Submitted</span></div>
              <div class="stat"><span class="sv">{s.avg_pct}%</span><span class="sl">Avg Score</span></div>
            </div>
          {/if}

          <div class="card-actions">
            <a href="/lecturer/exams/{exam.id}/questions" class="btn-sm">Questions</a>
            <a href="/lecturer/exams/{exam.id}/results"   class="btn-sm">Results</a>
            <a href="/lecturer/exams/{exam.id}"           class="btn-sm outline">Manage</a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; }

  .page-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 2rem; gap: 1rem;
  }
  h1   { font-size: 1.5rem; font-weight: 700; margin: 0; }
  .sub { color: var(--color-muted); margin: 0.25rem 0 0; font-size: 0.9rem; }

  .btn-primary {
    padding: 0.6rem 1.25rem; background: var(--color-primary); color: #fff;
    border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9rem;
    white-space: nowrap;
  }

  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
  }

  .exam-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .card-top { display: flex; justify-content: space-between; align-items: center; }

  .course-badge {
    font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem;
    background: var(--color-primary-subtle); color: var(--color-primary);
    border-radius: 999px;
  }

  .status-dot {
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    border-radius: 999px; text-transform: capitalize;
  }
  .status-dot.gray   { background: var(--color-border);  color: var(--color-muted); }
  .status-dot.blue   { background: #dbeafe; color: #1d4ed8; }
  .status-dot.green  { background: #dcfce7; color: #16a34a; }
  .status-dot.purple { background: #f3e8ff; color: #7e22ce; }
  .status-dot.red    { background: #fee2e2; color: #dc2626; }

  .exam-title { font-size: 1rem; font-weight: 600; margin: 0; }
  .exam-meta  { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  .stats-row  { display: flex; gap: 1rem; padding: 0.75rem; background: var(--color-bg); border-radius: 0.5rem; }
  .stat       { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 0.1rem; }
  .sv         { font-size: 1.1rem; font-weight: 700; }
  .sl         { font-size: 0.7rem; color: var(--color-muted); text-transform: uppercase; }

  .card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: auto; }
  .btn-sm {
    padding: 0.35rem 0.75rem; border-radius: 0.4rem; font-size: 0.8rem;
    font-weight: 600; text-decoration: none; background: var(--color-primary);
    color: #fff; border: none; cursor: pointer;
  }
  .btn-sm.outline {
    background: none; border: 1px solid var(--color-border); color: var(--color-text);
  }

  .empty {
    text-align: center; padding: 4rem 2rem;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    color: var(--color-muted);
  }
</style>