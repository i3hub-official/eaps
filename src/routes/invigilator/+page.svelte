<!-- src/routes/(invigilator)/invigilator/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  function fmtDate(d: Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
</script>

<svelte:head><title>Invigilator — MOUAU eTest</title></svelte:head>

<div class="page">
  <h1>Assigned Exams</h1>
  {#if data.exams.length === 0}
    <div class="empty">No exams assigned to you yet.</div>
  {:else}
    <div class="exam-list">
      {#each data.exams as exam}
        <div class="exam-row">
          <div>
            <span class="course">{exam.course.code}</span>
            <span class="title">{exam.title}</span>
            <span class="time">{fmtDate(exam.scheduledStart)}</span>
          </div>
          <a href="/invigilator/monitor/{exam.id}" class="monitor-btn">
            Monitor →
          </a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 800px; margin: 0 auto; }
  h1   { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.5rem; }
  .exam-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .exam-row {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem 1.25rem; gap: 1rem;
  }
  .exam-row > div { display: flex; flex-direction: column; gap: 0.2rem; }
  .course { font-size: 0.72rem; font-weight: 700; color: var(--color-primary); }
  .title  { font-size: 0.95rem; font-weight: 600; }
  .time   { font-size: 0.8rem; color: var(--color-muted); }
  .monitor-btn {
    padding: 0.5rem 1.25rem; background: var(--color-primary); color: #fff;
    border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; text-decoration: none;
    white-space: nowrap;
  }
  .empty { color: var(--color-muted); padding: 3rem; text-align: center; }
</style>