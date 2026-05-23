<!-- src/routes/(student)/dashboard/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { user, exams, results, enrolled } = data;

  function fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', scheduled: 'Upcoming', active: 'Active Now',
    completed: 'Ended', cancelled: 'Cancelled',
  };
  const STATUS_COLOR: Record<string, string> = {
    scheduled: 'blue', active: 'green', completed: 'gray',
    cancelled: 'red', draft: 'gray',
  };

  const GRADE_COLOR: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#9333ea', E: '#dc2626', F: '#dc2626',
  };
</script>

<svelte:head><title>Dashboard — MOUAU eTest</title></svelte:head>

<div class="page">
  <!-- Greeting -->
  <div class="greeting">
    <div>
      <h1>Hello, {user.fullName.split(' ')[0]} 👋</h1>
      <p class="sub">{user.matricNumber ?? user.email}</p>
    </div>
    {#if !enrolled}
      <a href="/enroll" class="enroll-banner">
        ⚠️ Face enrollment required before taking exams
      </a>
    {/if}
  </div>

  <!-- Available exams -->
  <section>
    <h2>Available Exams</h2>
    {#if exams.length === 0}
      <div class="empty-card">No exams scheduled for your courses yet.</div>
    {:else}
      <div class="exam-grid">
        {#each exams as exam}
          <div class="exam-card" class:active={exam.status === 'active'}>
            <div class="card-top">
              <span class="course-badge">{exam.course.code}</span>
              <span class="status-chip {STATUS_COLOR[exam.status]}">
                {STATUS_LABEL[exam.status]}
              </span>
            </div>
            <h3>{exam.title}</h3>
            <div class="exam-meta">
              <span>⏱ {exam.durationMinutes} min</span>
              <span>📝 {exam.totalMarks} marks</span>
              <span>🎯 Pass: {exam.passMark}</span>
            </div>
            {#if exam.scheduledStart}
              <p class="exam-time">Starts: {fmtDate(exam.scheduledStart)}</p>
            {/if}
            {#if exam.status === 'active'}
              <a href="/exam/{exam.id}" class="start-btn">
                {enrolled ? 'Start Exam →' : 'Enroll Face First'}
              </a>
            {:else}
              <span class="start-btn disabled">{STATUS_LABEL[exam.status]}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Past results -->
  {#if results.length > 0}
    <section>
      <h2>My Results</h2>
      <div class="results-list">
        {#each results as r}
          <div class="result-row">
            <div class="result-info">
              <span class="result-course">{r.exam.course.code}</span>
              <span class="result-title">{r.exam.title}</span>
            </div>
            <div class="result-stats">
              <span class="result-score">{Number(r.percentage ?? 0).toFixed(1)}%</span>
              <span class="result-grade" style="color:{GRADE_COLOR[r.grade ?? 'F']}">{r.grade ?? '—'}</span>
              <span class="pass-badge" class:pass={r.passed} class:fail={!r.passed}>
                {r.passed ? 'Pass' : 'Fail'}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }

  .greeting { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
  h1  { font-size: 1.5rem; font-weight: 700; margin: 0; }
  .sub { color: var(--color-muted); font-size: 0.9rem; margin: 0.25rem 0 0; }

  .enroll-banner {
    padding: 0.6rem 1rem; background: #fef3c7; color: #92400e;
    border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600;
    text-decoration: none; border: 1px solid #fcd34d;
  }

  h2 { font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem; }

  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .exam-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }
  .exam-card.active { border-color: #16a34a; box-shadow: 0 0 0 3px #dcfce7; }

  .card-top { display: flex; justify-content: space-between; align-items: center; }
  .course-badge {
    font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem;
    background: var(--color-primary-subtle); color: var(--color-primary); border-radius: 999px;
  }
  .status-chip { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px; }
  .status-chip.blue  { background: #dbeafe; color: #1d4ed8; }
  .status-chip.green { background: #dcfce7; color: #16a34a; }
  .status-chip.gray  { background: var(--color-border); color: var(--color-muted); }
  .status-chip.red   { background: #fee2e2; color: #dc2626; }

  h3 { font-size: 0.95rem; font-weight: 600; margin: 0; line-height: 1.4; }

  .exam-meta { display: flex; gap: 0.75rem; font-size: 0.8rem; color: var(--color-muted); flex-wrap: wrap; }
  .exam-time { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  .start-btn {
    display: block; text-align: center; padding: 0.65rem;
    background: var(--color-primary); color: #fff; border-radius: 0.5rem;
    font-weight: 600; font-size: 0.9rem; text-decoration: none;
    margin-top: auto; transition: opacity 0.15s;
  }
  .start-btn:hover  { opacity: 0.9; }
  .start-btn.disabled {
    background: var(--color-border); color: var(--color-muted); cursor: default;
  }

  .empty-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 2rem; text-align: center; color: var(--color-muted);
    font-size: 0.9rem;
  }

  /* Results */
  .results-list {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .result-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--color-border); gap: 1rem;
  }
  .result-row:last-child { border-bottom: none; }

  .result-info { display: flex; flex-direction: column; gap: 0.2rem; }
  .result-course { font-size: 0.72rem; font-weight: 700; color: var(--color-primary); }
  .result-title  { font-size: 0.875rem; font-weight: 500; }

  .result-stats { display: flex; align-items: center; gap: 0.875rem; }
  .result-score { font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .result-grade { font-size: 1.2rem; font-weight: 800; }

  .pass-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px; }
  .pass-badge.pass { background: #dcfce7; color: #16a34a; }
  .pass-badge.fail { background: #fee2e2; color: #dc2626; }
</style>