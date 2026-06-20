<!-- src/routes/exam-officer/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Search, Download, Printer } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  let searchVal = $state(data.search);
  const totalPages = $derived(Math.ceil(data.total / data.take));

  function nav(params: Record<string, string>) {
    const u = new URL($page.url);
    for (const [k, v] of Object.entries(params)) {
      v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
    }
    u.searchParams.delete('page');
    goto(u.toString());
  }

  function setPage(p: number) {
    const u = new URL($page.url); u.searchParams.set('page', String(p)); goto(u.toString());
  }

  function onSearch(e: Event) { e.preventDefault(); nav({ q: searchVal }); }

  function secs(s: number | null) {
    if (!s) return '—';
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  function exportCsv() {
    const headers = ['Student','Matric','Exam','Course','Faculty','Session','Score%','Grade','Time','Violations','Result'];
    const rows = data.results.map(r => [
      `"${r.student.fullName}"`,
      r.student.matricNumber ?? '',
      `"${r.exam.title}"`,
      r.exam.course.code,
      r.exam.course.department.college?.abbreviation ?? '',
      r.exam.session,
      r.percentage != null ? Number(r.percentage).toFixed(1) : '',
      r.grade ?? '',
      secs(r.timeTakenSecs),
      r.violationCount,
      r.passed == null ? '' : r.passed ? 'Pass' : 'Fail',
    ].join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Exam Results</h1>
    <p>University-wide results — read only.</p>
  </div>
  <div class="hdr-actions">
    <button class="btn btn-outline" onclick={exportCsv}><Download size={14} /> Export CSV</button>
    <button class="btn btn-outline" onclick={() => window.print()}><Printer size={14} /> Print</button>
  </div>
</div>

<div class="filters">
  <form onsubmit={onSearch} class="search-box">
    <Search size={13} />
    <input placeholder="Search student, matric, exam…" bind:value={searchVal} />
    <button type="submit">Go</button>
  </form>

  <div class="filter-row">
    <span class="filter-label">Result:</span>
    {#each [['', 'All'], ['true', 'Pass'], ['false', 'Fail']] as [v, l]}
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
  <div class="table-head-row"><span class="table-title">{data.total} result{data.total !== 1 ? 's' : ''}</span></div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Student</th><th>Exam</th><th>Faculty</th><th>Course</th>
        <th>Score</th><th>Grade</th><th>Time</th><th>Violations</th><th>Result</th>
      </tr>
    </thead>
    <tbody>
      {#each data.results as r}
        <tr>
          <td>
            <div class="fw">{r.student.fullName}</div>
            <div class="sub">{r.student.matricNumber ?? '—'}</div>
          </td>
          <td>{r.exam.title}</td>
          <td>{r.exam.course.department.college?.abbreviation ?? '—'}</td>
          <td><span class="code">{r.exam.course.code}</span></td>
          <td>{r.percentage != null ? `${Number(r.percentage).toFixed(1)}%` : '—'}</td>
          <td>{r.grade ?? '—'}</td>
          <td>{secs(r.timeTakenSecs)}</td>
          <td class:warn={r.violationCount > 0}>{r.violationCount}</td>
          <td>
            <span class="badge" class:badge-active={r.passed} class:badge-cancelled={r.passed === false}>
              {r.passed == null ? '—' : r.passed ? 'Pass' : 'Fail'}
            </span>
          </td>
        </tr>
      {:else}
        <tr><td colspan="9" class="empty-row">No results found.</td></tr>
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
  .hdr-actions{display:flex;gap:.625rem;}
  .filters{display:flex;flex-direction:column;gap:.625rem;margin-bottom:1rem;}
  .search-box{display:flex;align-items:center;gap:.5rem;padding:.45rem .875rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:.5rem;max-width:360px;}
  .search-box input{flex:1;border:none;background:none;outline:none;font-size:.82rem;color:var(--color-text);font-family:inherit;}
  .search-box button{padding:.25rem .6rem;background:var(--p-accent);color:white;border:none;border-radius:.35rem;font-size:.76rem;font-weight:600;cursor:pointer;}
  .filter-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;}
  .filter-label{font-size:.74rem;color:var(--color-muted);font-weight:600;}
  .filter-pill{padding:.28rem .7rem;border:1px solid var(--color-border);border-radius:2rem;font-size:.74rem;font-weight:600;background:none;color:var(--color-muted);cursor:pointer;font-family:inherit;transition:all .15s;}
  .filter-pill.active{background:var(--p-accent-dim);border-color:var(--p-accent);color:var(--p-accent);}
  .fw{font-weight:600;} .sub{font-size:.72rem;color:var(--color-muted);}
  .code{font-size:.74rem;font-weight:700;color:#3b82f6;}
  .warn{color:#dc2626;font-weight:700;}
  .pagination{display:flex;align-items:center;gap:.75rem;justify-content:center;margin-top:1.25rem;}
  .pg{font-size:.8rem;color:var(--color-muted);}
  @media print{.hdr-actions,.filters,.pagination{display:none;}}
</style>
