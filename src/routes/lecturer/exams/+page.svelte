<!-- src/routes/(lecturer)/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { exams } = data;

  let search = $state('');
  let filterStatus = $state('all');

  const filtered = $derived(exams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.course.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  }));

  const STATUS_COLOR: Record<string, string> = {
    draft: 'gray', scheduled: 'blue', active: 'green',
    completed: 'purple', cancelled: 'red',
  };

  function fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }
</script>

<svelte:head><title>Exams — Lecturer</title></svelte:head>

<div class="page">
  <div class="page-header">
    <h1>All Exams</h1>
    <a href="/lecturer/exams/new" class="btn-primary">+ New Exam</a>
  </div>

  <div class="filters">
    <input class="search" type="search" placeholder="Search title or course…" bind:value={search} />
    <div class="tabs">
      {#each ['all','draft','scheduled','active','completed'] as s}
        <button class="tab" class:active={filterStatus === s}
          onclick={() => { filterStatus = s; }} type="button">
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      {/each}
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Course</th><th>Title</th><th>Status</th>
          <th>Duration</th><th>Scheduled</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if filtered.length === 0}
          <tr><td colspan="6" class="empty">No exams found.</td></tr>
        {:else}
          {#each filtered as exam}
            <tr>
              <td><span class="course-badge">{exam.course.code}</span></td>
              <td class="title-cell">{exam.title}</td>
              <td><span class="status {STATUS_COLOR[exam.status]}">{exam.status}</span></td>
              <td>{exam.durationMinutes}m</td>
              <td class="mono">{fmtDate(exam.scheduledStart)}</td>
              <td class="actions-cell">
                <a href="/lecturer/exams/{exam.id}/questions" class="act">Questions</a>
                <a href="/lecturer/exams/{exam.id}/results"   class="act">Results</a>
                <a href="/lecturer/exams/{exam.id}/similarity" class="act">Similarity</a>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .btn-primary {
    padding: 0.6rem 1.25rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem;
    text-decoration: none;
  }
  .filters { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .search {
    padding: 0.45rem 0.875rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; outline: none; width: 240px;
  }
  .tabs { display: flex; gap: 0.35rem; }
  .tab {
    padding: 0.35rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 999px; font-size: 0.75rem; font-weight: 500;
    color: var(--color-muted); background: none; cursor: pointer;
  }
  .tab.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

  .table-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { padding: 0.75rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; background: var(--color-bg); }
  td { padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); }
  tr:hover td { background: var(--color-bg); }

  .course-badge {
    font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem;
    background: var(--color-primary-subtle); color: var(--color-primary); border-radius: 999px;
  }
  .title-cell { font-weight: 500; max-width: 280px; }
  .status {
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px;
    text-transform: capitalize;
  }
  .status.gray   { background: var(--color-border);  color: var(--color-muted); }
  .status.blue   { background: #dbeafe; color: #1d4ed8; }
  .status.green  { background: #dcfce7; color: #16a34a; }
  .status.purple { background: #f3e8ff; color: #7e22ce; }
  .status.red    { background: #fee2e2; color: #dc2626; }
  .mono { font-variant-numeric: tabular-nums; font-size: 0.82rem; }
  .actions-cell { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .act {
    padding: 0.25rem 0.6rem; background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.35rem; font-size: 0.75rem; font-weight: 500; text-decoration: none;
    color: var(--color-text);
  }
  .act:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .empty { text-align: center; color: var(--color-muted); padding: 2rem; }
</style>