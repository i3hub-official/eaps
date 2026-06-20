<!-- src/routes/exam-officer/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Search, Filter, Printer, Download } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchVal = $state(data.search);
  const totalPages = $derived(Math.ceil(data.total / data.take));
  const statuses   = ['', 'draft', 'scheduled', 'active', 'completed', 'cancelled'];

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

  function onSearch(e: Event) {
    e.preventDefault();
    nav({ q: searchVal });
  }

  function statusClass(s: string) {
    return { draft:'badge-draft', scheduled:'badge-scheduled', active:'badge-active', completed:'badge-completed', cancelled:'badge-cancelled' }[s] ?? 'badge-draft';
  }

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  // CSV export
  function exportCsv() {
    const headers = ['Title','Course','Department','Faculty','Lecturer','Session','Semester','Scheduled','Duration','Sessions','Status'];
    const rows = data.exams.map(e => [
      `"${e.title}"`,
      e.course.code,
      `"${e.course.department.name}"`,
      `"${e.course.department.college?.abbreviation ?? ''}"`,
      `"${e.lecturer.fullName}"`,
      e.session,
      e.semester,
      e.scheduledStart ? new Date(e.scheduledStart).toISOString() : '',
      e.durationMinutes,
      e._count.examSessions,
      e.status,
    ].join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'exam-schedule.csv'; a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Exam Schedule</h1>
    <p>University-wide exam list — read only.</p>
  </div>
  <div class="hdr-actions">
    <button class="btn btn-outline" onclick={exportCsv}><Download size={14} /> Export CSV</button>
    <button class="btn btn-outline" onclick={() => window.print()}><Printer size={14} /> Print</button>
  </div>
</div>

<!-- Filters -->
<div class="filters">
  <form onsubmit={onSearch} class="search-box">
    <Search size={13} />
    <input placeholder="Search exams…" bind:value={searchVal} />
    <button type="submit">Go</button>
  </form>

  <div class="filter-row">
    <Filter size={13} />
    {#each statuses as s}
      <button class="filter-pill" class:active={data.status === s} onclick={() => nav({ status: s })}>
        {s || 'All'}
      </button>
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
  <div class="table-head-row">
    <span class="table-title">{data.total} exam{data.total !== 1 ? 's' : ''}</span>
  </div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Exam</th><th>Faculty</th><th>Dept</th><th>Course</th>
        <th>Lecturer</th><th>Scheduled</th><th>Duration</th>
        <th>Sessions</th><th>Invigilators</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      {#each data.exams as e}
        <tr>
          <td>
            <a href="/exam-officer/exams/{e.id}" class="row-link">{e.title}</a>
            <div class="sub">{e.session} · Sem {e.semester}</div>
          </td>
          <td>{e.course.department.college?.abbreviation ?? '—'}</td>
          <td><span class="code">{e.course.department.code}</span></td>
          <td><span class="code">{e.course.code}</span></td>
          <td>{e.lecturer.fullName}</td>
          <td>{fmt(e.scheduledStart)}</td>
          <td>{e.durationMinutes} min</td>
          <td>{e._count.examSessions}</td>
          <td>{e._count.invigilators}</td>
          <td><span class="badge {statusClass(e.status)}">{e.status}</span></td>
        </tr>
      {:else}
        <tr><td colspan="10" class="empty-row">No exams found.</td></tr>
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
  .hdr-actions{display:flex;gap:.625rem;align-items:center;}
  .filters{display:flex;flex-direction:column;gap:.625rem;margin-bottom:1rem;}
  .search-box{display:flex;align-items:center;gap:.5rem;padding:.45rem .875rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:.5rem;max-width:340px;}
  .search-box input{flex:1;border:none;background:none;outline:none;font-size:.82rem;color:var(--color-text);font-family:inherit;}
  .search-box button{padding:.25rem .6rem;background:var(--p-accent);color:white;border:none;border-radius:.35rem;font-size:.76rem;font-weight:600;cursor:pointer;}
  .filter-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;}
  .filter-label{font-size:.74rem;color:var(--color-muted);font-weight:600;}
  .filter-pill{padding:.28rem .7rem;border:1px solid var(--color-border);border-radius:2rem;font-size:.74rem;font-weight:600;background:none;color:var(--color-muted);cursor:pointer;font-family:inherit;transition:all .15s;text-transform:capitalize;}
  .filter-pill.active{background:var(--p-accent-dim);border-color:var(--p-accent);color:var(--p-accent);}
  .row-link{color:var(--p-accent);text-decoration:none;font-weight:600;}
  .row-link:hover{text-decoration:underline;}
  .sub{font-size:.72rem;color:var(--color-muted);margin-top:.1rem;}
  .code{font-size:.74rem;font-weight:700;color:#3b82f6;}
  .pagination{display:flex;align-items:center;gap:.75rem;justify-content:center;margin-top:1.25rem;}
  .pg{font-size:.8rem;color:var(--color-muted);}
  @media print{.hdr-actions,.filters,.pagination{display:none;}}
</style>
