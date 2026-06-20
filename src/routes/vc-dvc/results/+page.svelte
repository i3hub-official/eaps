<!-- src/routes/vc-dvc/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Printer } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const totalPages = $derived(Math.ceil(data.total / data.take));

  function nav(params: Record<string, string>) {
    const u = new URL($page.url);
    for (const [k, v] of Object.entries(params)) { v ? u.searchParams.set(k, v) : u.searchParams.delete(k); }
    u.searchParams.delete('page'); goto(u.toString());
  }

  function setPage(p: number) { const u = new URL($page.url); u.searchParams.set('page', String(p)); goto(u.toString()); }
</script>

<div class="page-header">
  <div class="page-header-text"><h1>University Results</h1><p>Read-only view of all exam results.</p></div>
  <button class="btn btn-outline" onclick={() => window.print()}><Printer size={14} /> Print</button>
</div>

<div class="filters">
  <div class="filter-row">
    <span class="filter-label">Result:</span>
    {#each [['','All'],['true','Pass'],['false','Fail']] as [v, l]}
      <button class="filter-pill" class:active={data.passed === v} onclick={() => nav({ passed: v })}>{l}</button>
    {/each}
  </div>
  {#if data.sessions.length > 0}
    <div class="filter-row">
      <span class="filter-label">Session:</span>
      <button class="filter-pill" class:active={!data.session} onclick={() => nav({ session: '' })}>All</button>
      {#each data.sessions as s}
        <button class="filter-pill" class:active={data.session === s} onclick={() => nav({ session: s })}>{s}</button>
      {/each}
    </div>
  {/if}
</div>

<div class="table-card">
  <div class="table-head-row"><span class="table-title">{data.total.toLocaleString()} results</span></div>
  <table class="data-table">
    <thead><tr><th>Student</th><th>Exam</th><th>Faculty</th><th>Course</th><th>Session</th><th>Score</th><th>Grade</th><th>Result</th></tr></thead>
    <tbody>
      {#each data.results as r}
        <tr>
          <td><div class="fw">{r.student.fullName}</div><div class="sub">{r.student.matricNumber ?? '—'}</div></td>
          <td>{r.exam.title}</td>
          <td>{r.exam.course.department.college?.abbreviation ?? '—'}</td>
          <td><span class="code">{r.exam.course.code}</span></td>
          <td>{r.exam.session}</td>
          <td>{r.percentage != null ? `${Number(r.percentage).toFixed(1)}%` : '—'}</td>
          <td>{r.grade ?? '—'}</td>
          <td><span class="badge" class:badge-active={r.passed} class:badge-cancelled={r.passed === false}>{r.passed == null ? '—' : r.passed ? 'Pass' : 'Fail'}</span></td>
        </tr>
      {:else}
        <tr><td colspan="8" class="empty-row">No results found.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

{#if totalPages > 1}
  <div class="pagination">
    <button class="btn btn-outline" disabled={data.page <= 1} onclick={() => setPage(data.page - 1)}>Previous</button>
    <span class="pg">Page {data.page} of {totalPages}</span>
    <button class="btn btn-outline" disabled={data.page >= totalPages} onclick={() => setPage(data.page + 1)}>Next</button>
  </div>
{/if}

<style>
 @import '$lib/styles/portals.css';
  .filters{display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem;}
  .filter-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;}
  .filter-label{font-size:.74rem;color:var(--color-muted);font-weight:600;}
  .filter-pill{padding:.28rem .7rem;border:1px solid var(--color-border);border-radius:2rem;font-size:.74rem;font-weight:600;background:none;color:var(--color-muted);cursor:pointer;font-family:inherit;transition:all .15s;}
  .filter-pill.active{background:var(--p-accent-dim);border-color:var(--p-accent);color:var(--p-accent);}
  .fw{font-weight:600;} .sub{font-size:.72rem;color:var(--color-muted);}
  .code{font-size:.74rem;font-weight:700;color:#3b82f6;}
  .pagination{display:flex;align-items:center;gap:.75rem;justify-content:center;margin-top:1.25rem;}
  .pg{font-size:.8rem;color:var(--color-muted);}
  @media print{.btn,.filters,.pagination{display:none;}}
</style>
