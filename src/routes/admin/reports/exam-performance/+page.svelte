<!-- src/routes/admin/reports/exam-performance/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    ClipboardList, Search, ArrowUpDown,
    TrendingUp, Users, Award, AlertTriangle
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  // ── URL-driven filters (server does the work) ─────────────────────
  let searchQuery  = $state($page.url.searchParams.get('q')      ?? '');
  let statusFilter = $state($page.url.searchParams.get('status') ?? 'all');

  let debounce: ReturnType<typeof setTimeout> | null = null;

  function applyFilters() {
    const p = new URLSearchParams();
    if (searchQuery.trim())            p.set('q',      searchQuery.trim());
    if (statusFilter !== 'all')        p.set('status', statusFilter);
    goto(`?${p.toString()}`, { replaceState: true, keepFocus: true });
  }

  function onSearch() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 350);
  }

  // ── Summary stats (computed from whatever the server returned) ────
  const completed  = $derived(data.exams.filter(e => e.status === 'completed'));
  const totalStudents = $derived(data.exams.reduce((a, e) => a + e.students, 0));
  const avgScore   = $derived(
    completed.length
      ? completed.reduce((a, e) => a + e.avgScore, 0) / completed.length
      : 0
  );
  const avgPass    = $derived(
    completed.length
      ? completed.reduce((a, e) => a + e.passRate, 0) / completed.length
      : 0
  );

  const STATUS_LABEL: Record<string, string> = {
    completed: 'Completed', active: 'Active',
    scheduled: 'Scheduled', cancelled: 'Cancelled', draft: 'Draft',
  };
</script>

<svelte:head>
  <title>Exam Performance — MOUAU eTest</title>
</svelte:head>

<div class="page">

  <header class="page-header">
    <div>
      <h1>Exam Performance</h1>
      <p class="subtitle">Results, scores, and completion metrics across all exams</p>
    </div>
    <span class="total-badge">{data.exams.length} exam{data.exams.length !== 1 ? 's' : ''}</span>
  </header>

  <!-- ── Summary cards ────────────────────────────────────────────── -->
  <div class="summary-row">
    <div class="summary-card">
      <div class="summary-icon"><ClipboardList size={18} /></div>
      <div>
        <span class="summary-value">{data.exams.length}</span>
        <span class="summary-label">Total exams</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon"><Users size={18} /></div>
      <div>
        <span class="summary-value">{totalStudents.toLocaleString()}</span>
        <span class="summary-label">Total sittings</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon"><Award size={18} /></div>
      <div>
        <span class="summary-value">{completed.length ? avgScore.toFixed(1) + '%' : '—'}</span>
        <span class="summary-label">Avg score</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon"><TrendingUp size={18} /></div>
      <div>
        <span class="summary-value">{completed.length ? avgPass.toFixed(1) + '%' : '—'}</span>
        <span class="summary-label">Avg pass rate</span>
      </div>
    </div>
  </div>

  <!-- ── Filters ───────────────────────────────────────────────────── -->
  <div class="filters">
    <div class="search-box">
      <Search size={15} />
      <input
        type="text"
        placeholder="Search exam or course code…"
        bind:value={searchQuery}
        oninput={onSearch}
      />
    </div>
    <select bind:value={statusFilter} onchange={applyFilters} class="status-select">
      <option value="all">All statuses</option>
      <option value="completed">Completed</option>
      <option value="active">Active</option>
      <option value="scheduled">Scheduled</option>
      <option value="draft">Draft</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>

  <!-- ── Table ─────────────────────────────────────────────────────── -->
  {#if data.exams.length === 0}
    <div class="empty">
      <p class="empty-title">No exams found</p>
      <p class="empty-sub">Try adjusting the search or status filter.</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Exam</th>
            <th>Date</th>
            <th>Students</th>
            <th>Avg score</th>
            <th>Pass rate</th>
            <th>Duration</th>
            <th>Violations</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each data.exams as exam (exam.id)}
            <tr>
              <!-- Exam title + course -->
              <td>
                <div class="exam-cell">
                  <span class="exam-title">{exam.title}</span>
                  <span class="exam-course">{exam.course}</span>
                </div>
              </td>

              <!-- Date -->
              <td class="td-muted">{exam.date}</td>

              <!-- Students -->
              <td class="td-center">{exam.students}</td>

              <!-- Avg score -->
              <td>
                {#if exam.students > 0 && exam.avgScore > 0}
                  <span
                    class="score-tag"
                    class:score-high={exam.avgScore >= 70}
                    class:score-mid={exam.avgScore >= 50 && exam.avgScore < 70}
                    class:score-low={exam.avgScore > 0 && exam.avgScore < 50}
                  >{exam.avgScore}%</span>
                {:else}
                  <span class="td-muted">—</span>
                {/if}
              </td>

              <!-- Pass rate bar -->
              <td>
                {#if exam.passRate > 0}
                  <div class="pass-bar">
                    <div class="pass-fill" style="width:{Math.min(exam.passRate, 100)}%"></div>
                    <span>{exam.passRate}%</span>
                  </div>
                {:else}
                  <span class="td-muted">—</span>
                {/if}
              </td>

              <!-- Duration -->
              <td class="td-muted">{exam.duration} min</td>

              <!-- Violations -->
              <td>
                <span class="viol" class:viol-alert={exam.violations > 5}>
                  {#if exam.violations > 5}<AlertTriangle size={12} />{/if}
                  {exam.violations}
                </span>
              </td>

              <!-- Status -->
              <td>
                <span class="status-tag status-{exam.status}">
                  {STATUS_LABEL[exam.status] ?? exam.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

</div>

<style>
  .page {
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Header */
  .page-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  h1 { font-size: 1.375rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { font-size: .825rem; color: var(--color-muted); margin-top: .2rem; }
  .total-badge {
    font-size: .72rem; font-weight: 600;
    padding: .25rem .75rem;
    background: var(--color-border); color: var(--color-muted);
    border-radius: 999px; white-space: nowrap; align-self: center;
  }

  /* Summary cards */
  .summary-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: .875rem;
  }
  @media (max-width: 768px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .summary-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .75rem; padding: 1rem;
    display: flex; align-items: center; gap: .75rem;
  }
  .summary-icon {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    background: rgba(59,130,246,.1); color: #3b82f6;
    display: flex; align-items: center; justify-content: center;
  }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.2rem; font-weight: 800; color: var(--color-text); letter-spacing: -.03em; }
  .summary-label { font-size: .68rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: .04em; margin-top: .1rem; }

  /* Filters */
  .filters { display: flex; gap: .75rem; flex-wrap: wrap; }
  .search-box {
    display: flex; align-items: center; gap: .5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .5rem; padding: .5rem .75rem;
    flex: 1; min-width: 200px; transition: border-color .15s;
  }
  .search-box:focus-within { border-color: #3b82f6; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .search-box input {
    border: none; background: none; outline: none;
    color: var(--color-text); font-size: .875rem; width: 100%; font-family: inherit;
  }
  .status-select {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .5rem; padding: .5rem .75rem;
    color: var(--color-text); font-size: .875rem;
    cursor: pointer; font-family: inherit; transition: border-color .15s;
  }
  .status-select:focus { outline: none; border-color: #3b82f6; }

  /* Empty */
  .empty {
    padding: 3rem 2rem; text-align: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .75rem; color: var(--color-muted);
  }
  .empty-title { font-weight: 600; font-size: .925rem; }
  .empty-sub   { font-size: .8rem; margin-top: .375rem; }

  /* Table */
  .table-wrap {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .75rem; overflow: hidden; overflow-x: auto;
  }
  .table {
    width: 100%; border-collapse: collapse;
    font-size: .8rem; white-space: nowrap;
  }
  .table th {
    text-align: left; padding: .75rem 1rem;
    font-size: .65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .05em; color: var(--color-muted);
    background: var(--color-bg); border-bottom: 1px solid var(--color-border);
  }
  .table td {
    padding: .875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text); vertical-align: middle;
  }
  .table tr:last-child td { border-bottom: none; }
  .table tbody tr:hover td {
    background: color-mix(in srgb, var(--color-surface) 50%, var(--color-bg));
  }

  .td-muted  { color: var(--color-muted); }
  .td-center { text-align: center; }

  .exam-cell { display: flex; flex-direction: column; gap: .15rem; }
  .exam-title  { font-weight: 600; font-size: .825rem; }
  .exam-course { font-size: .7rem; color: var(--color-muted); }

  /* Score tag */
  .score-tag {
    padding: .2rem .5rem; border-radius: .375rem;
    font-size: .75rem; font-weight: 600;
  }
  .score-high { background: rgba(22,163,74,.1);  color: #16a34a; }
  .score-mid  { background: rgba(245,158,11,.1); color: #d97706; }
  .score-low  { background: rgba(239,68,68,.1);  color: #ef4444; }

  /* Pass bar */
  .pass-bar { display: flex; align-items: center; gap: .5rem; min-width: 90px; }
  .pass-fill {
    flex: 1; height: 5px; background: #3b82f6;
    border-radius: 3px; min-width: 4px; max-width: 60px;
    transition: width .3s;
  }
  .pass-bar span { font-size: .75rem; font-weight: 600; min-width: 36px; }

  /* Violations */
  .viol {
    display: inline-flex; align-items: center; gap: .25rem;
    font-size: .75rem; font-weight: 600; color: var(--color-muted);
  }
  .viol-alert { color: #ef4444; }

  /* Status tags */
  .status-tag {
    padding: .2rem .6rem; border-radius: 999px;
    font-size: .68rem; font-weight: 600; text-transform: capitalize;
  }
  .status-completed { background: rgba(59,130,246,.1);  color: #3b82f6; }
  .status-active    { background: rgba(22,163,74,.1);  color: #16a34a; }
  .status-scheduled { background: rgba(99,102,241,.1); color: #6366f1; }
  .status-draft     { background: var(--color-border); color: var(--color-muted); }
  .status-cancelled { background: rgba(239,68,68,.1);  color: #ef4444; }
</style>