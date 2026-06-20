<!-- src/routes/dean/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Printer } from '@lucide/svelte';
  let { data }: { data: PageData } = $props();
  const totalPages = $derived(Math.ceil(data.total / data.take));
  function setPage(p: number) { const u = new URL($page.url); u.searchParams.set('page',String(p)); goto(u.toString()); }
</script>
<div class="page-header">
  <div class="page-header-text"><h1>Faculty Results</h1><p>All completed exam results across your faculty.</p></div>
  <button class="btn btn-outline" onclick={() => window.print()}><Printer size={14} /> Print</button>
</div>
<div class="table-card">
  <table class="data-table">
    <thead><tr><th>Student</th><th>Exam</th><th>Dept</th><th>Course</th><th>Score</th><th>Grade</th><th>Result</th></tr></thead>
    <tbody>
      {#each data.results as r}
        <tr>
          <td><div class="fw">{r.student.fullName}</div><div class="sub">{r.student.matricNumber ?? '—'}</div></td>
          <td>{r.exam.title}</td>
          <td>{r.exam.course.department.name}</td>
          <td><span class="code">{r.exam.course.code}</span></td>
          <td>{r.percentage != null ? `${Number(r.percentage).toFixed(1)}%` : '—'}</td>
          <td>{r.grade ?? '—'}</td>
          <td><span class="badge" class:badge-active={r.passed} class:badge-cancelled={r.passed === false}>{r.passed == null ? '—' : r.passed ? 'Pass' : 'Fail'}</span></td>
        </tr>
      {:else}
        <tr><td colspan="7" class="empty-row">No results yet.</td></tr>
      {/each}
    </tbody>
  </table>
</div>
{#if totalPages > 1}
  <div class="pagination">
    <button class="btn btn-outline" disabled={data.page <= 1} onclick={() => setPage(data.page - 1)}>Previous</button>
    <span class="pg">{data.page} / {totalPages}</span>
    <button class="btn btn-outline" disabled={data.page >= totalPages} onclick={() => setPage(data.page + 1)}>Next</button>
  </div>
{/if}
<style>
  .fw{font-weight:600;} .sub,.pg{font-size:.75rem;color:var(--color-muted);}
  .code{font-size:.74rem;font-weight:700;color:#3b82f6;}
  .pagination{display:flex;align-items:center;gap:.75rem;justify-content:center;margin-top:1.25rem;}
  @media print{.btn,.pagination{display:none;}}
</style>
