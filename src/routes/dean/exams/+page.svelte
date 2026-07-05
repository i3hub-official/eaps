<!-- src/routes/dean/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Filter, Printer, ShieldCheck } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const totalPages = $derived(Math.ceil(data.total / data.take));
  const statuses   = ['', 'draft', 'scheduled', 'active', 'completed', 'cancelled'];

  function statusClass(s: string) {
    return { draft:'badge-draft', scheduled:'badge-scheduled', active:'badge-active', completed:'badge-completed', cancelled:'badge-cancelled' }[s] ?? 'badge-draft';
  }
  function setStatus(s: string) { const u = new URL($page.url); s ? u.searchParams.set('status',s) : u.searchParams.delete('status'); u.searchParams.delete('page'); goto(u.toString()); }
  function setPage(p: number)   { const u = new URL($page.url); u.searchParams.set('page',String(p)); goto(u.toString()); }
  function fmt(d: Date|string|null) { return d ? new Date(d).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}) : '—'; }
</script>

<div class="page-header">
  <div class="page-header-text"><h1>Faculty Exams</h1><p>All exams across your faculty — read only.</p></div>
  <div class="header-actions">
    <a href="/dean/exam-authority" class="btn btn-outline"><ShieldCheck size={14} /> Manage Exam Authority</a>
    <button class="btn btn-outline" onclick={() => window.print()}><Printer size={14} /> Print</button>
  </div>
</div>

<div class="filter-row">
  <Filter size={13} />
  {#each statuses as s}
    <button class="filter-pill" class:active={data.status === s} onclick={() => setStatus(s)}>{s || 'All'}</button>
  {/each}
</div>

<div class="table-card">
  <table class="data-table">
    <thead><tr><th>Exam</th><th>Dept</th><th>Course</th><th>Lecturer</th><th>Scheduled</th><th>Sessions</th><th>Status</th></tr></thead>
    <tbody>
      {#each data.exams as e}
        <tr>
          <td><a href="/dean/exams/{e.id}" class="row-link">{e.title}</a></td>
          <td>{e.course.department.name}</td>
          <td><span class="code-chip">{e.course.code}</span></td>
          <td>{e.lecturer.fullName}</td>
          <td>{fmt(e.scheduledStart)}</td>
          <td>{e._count.examSessions}</td>
          <td><span class="badge {statusClass(e.status)}">{e.status}</span></td>
        </tr>
      {:else}
        <tr><td colspan="7" class="empty-row">No exams found.</td></tr>
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
 @import '$lib/styles/portals.css';
 .header-actions { display: flex; gap: 0.5rem; }
  .filter-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;}
  .filter-pill{padding:.3rem .75rem;border:1px solid var(--color-border);border-radius:2rem;font-size:.76rem;font-weight:600;background:none;color:var(--color-muted);cursor:pointer;font-family:inherit;transition:all .15s;text-transform:capitalize;}
  .filter-pill.active{background:var(--p-accent-dim);border-color:var(--p-accent);color:var(--p-accent);}
  .row-link{color:var(--p-accent);text-decoration:none;font-weight:600;}
  .row-link:hover{text-decoration:underline;}
  .code-chip{font-size:.74rem;font-weight:700;color:#3b82f6;}
  .pagination{display:flex;align-items:center;gap:.75rem;justify-content:center;margin-top:1.25rem;}
  .page-info{font-size:.8rem;color:var(--color-muted);}
  @media print{.btn,.filter-row,.pagination{display:none;}}
</style>
