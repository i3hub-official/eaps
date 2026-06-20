<!-- src/routes/hod/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { BarChart2, Printer } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const totalPages = $derived(Math.ceil(data.total / data.take));

  function setPage(p: number) {
    const u = new URL($page.url); u.searchParams.set('page', String(p)); goto(u.toString());
  }

  function secs(s: number | null) {
    if (!s) return '—';
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}m ${sec}s`;
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Exam Results</h1>
    <p>All completed exam results across your department.</p>
  </div>
  <button class="btn btn-outline" onclick={() => window.print()}><Printer size={14} /> Print</button>
</div>

<div class="table-card">
  <table class="data-table">
    <thead>
      <tr>
        <th>Student</th><th>Exam</th><th>Course</th>
        <th>Score</th><th>Grade</th><th>Time taken</th><th>Violations</th><th>Result</th>
      </tr>
    </thead>
    <tbody>
      {#each data.results as r}
        <tr>
          <td>
            <div class="fw">{r.student.fullName}</div>
            <div class="sub-text">{r.student.matricNumber ?? '—'}</div>
          </td>
          <td>{r.exam.title}</td>
          <td><span class="code-chip">{r.exam.course.code}</span></td>
          <td>{r.percentage != null ? `${Number(r.percentage).toFixed(1)}%` : '—'}</td>
          <td>{r.grade ?? '—'}</td>
          <td>{secs(r.timeTakenSecs)}</td>
          <td>{r.violationCount}</td>
          <td>
            <span class="badge" class:badge-active={r.passed} class:badge-cancelled={r.passed === false}>
              {r.passed == null ? '—' : r.passed ? 'Pass' : 'Fail'}
            </span>
          </td>
        </tr>
      {:else}
        <tr><td colspan="8" class="empty-row">No results yet.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

{#if totalPages > 1}
  <div class="pagination">
    <button class="btn btn-outline" disabled={data.page <= 1} onclick={() => setPage(data.page - 1)}>Previous</button>
    <span class="page-info">Page {data.page} of {totalPages}</span>
    <button class="btn btn-outline" disabled={data.page >= totalPages} onclick={() => setPage(data.page + 1)}>Next</button>
  </div>
{/if}

<style>
  .fw { font-weight:600; }
  .sub-text { font-size:.72rem; color:var(--color-muted); }
  .code-chip { font-size:.74rem; font-weight:700; color:#3b82f6; }
  .pagination { display:flex; align-items:center; gap:.75rem; justify-content:center; margin-top:1.25rem; }
  .page-info { font-size:.8rem; color:var(--color-muted); }
  @media print { .btn { display:none; } }
</style>
