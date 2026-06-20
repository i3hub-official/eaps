<!-- src/routes/vc-dvc/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Users, ClipboardList, CheckCircle, Clock, Radio, TrendingUp } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const total = $derived(data.passCount + data.failCount);
  const passRate = $derived(total > 0 ? ((data.passCount / total) * 100).toFixed(1) : '—');

  function statusClass(s: string) {
    return { draft:'badge-draft', scheduled:'badge-scheduled', active:'badge-active', completed:'badge-completed', cancelled:'badge-cancelled' }[s] ?? 'badge-draft';
  }

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' });
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>University Dashboard</h1>
    <p>High-level overview of academic examination activity.</p>
  </div>
</div>

<!-- Primary stats -->
<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-icon"><Users size={17} /></div>
    <div class="stat-value">{data.totalStudents.toLocaleString()}</div>
    <div class="stat-label">Active students</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><Users size={17} /></div>
    <div class="stat-value">{data.totalStaff.toLocaleString()}</div>
    <div class="stat-label">Academic staff</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><ClipboardList size={17} /></div>
    <div class="stat-value">{data.totalExams.toLocaleString()}</div>
    <div class="stat-label">Total exams</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><Radio size={17} /></div>
    <div class="stat-value">{data.examCounts.active}</div>
    <div class="stat-label">Live now</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><Clock size={17} /></div>
    <div class="stat-value">{data.examCounts.scheduled}</div>
    <div class="stat-label">Scheduled</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><TrendingUp size={17} /></div>
    <div class="stat-value">{passRate}{total > 0 ? '%' : ''}</div>
    <div class="stat-label">Pass rate</div>
  </div>
</div>

<div class="two-col">
  <!-- Faculty breakdown -->
  <div class="table-card">
    <div class="table-head-row"><span class="table-title">Exams by Faculty</span></div>
    <table class="data-table">
      <thead><tr><th>Faculty</th><th>Total</th><th>Live</th><th>Completed</th></tr></thead>
      <tbody>
        {#each data.collegeBreakdown as c}
          <tr>
            <td class="fw">{c.name}</td>
            <td>{c.total}</td>
            <td>
              {#if c.active > 0}
                <span class="badge badge-active">{c.active}</span>
              {:else}
                <span class="dim">0</span>
              {/if}
            </td>
            <td>{c.completed}</td>
          </tr>
        {:else}
          <tr><td colspan="4" class="empty-row">No data.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Recent exams -->
  <div class="table-card">
    <div class="table-head-row">
      <span class="table-title">Recent Exams</span>
      <a href="/vc-dvc/results" class="btn btn-outline" style="padding:.35rem .75rem;font-size:.75rem">Results</a>
    </div>
    <table class="data-table">
      <thead><tr><th>Exam</th><th>Faculty</th><th>Sessions</th><th>Status</th></tr></thead>
      <tbody>
        {#each data.recentExams as e}
          <tr>
            <td>
              <div class="fw">{e.title}</div>
              <div class="sub">{e.course.code}</div>
            </td>
            <td>{e.course.department.college?.abbreviation ?? '—'}</td>
            <td>{e._count.examSessions}</td>
            <td><span class="badge {statusClass(e.status)}">{e.status}</span></td>
          </tr>
        {:else}
          <tr><td colspan="4" class="empty-row">No exams yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Pass / fail bar -->
{#if total > 0}
  <div class="pf-card">
    <div class="pf-head">
      <span class="table-title">University Pass / Fail Ratio</span>
      <span class="pf-total">{total.toLocaleString()} results total</span>
    </div>
    <div class="pf-bar-wrap">
      <div class="pf-bar">
        <div class="pf-pass" style="width:{(data.passCount / total * 100).toFixed(1)}%"></div>
        <div class="pf-fail" style="width:{(data.failCount / total * 100).toFixed(1)}%"></div>
      </div>
      <div class="pf-legend">
        <span class="leg-pass">Pass: {data.passCount.toLocaleString()} ({(data.passCount/total*100).toFixed(1)}%)</span>
        <span class="leg-fail">Fail: {data.failCount.toLocaleString()} ({(data.failCount/total*100).toFixed(1)}%)</span>
      </div>
    </div>
  </div>
{/if}

<style>
 @import '$lib/styles/portals.css';
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem;}
  .fw{font-weight:600;} .sub,.dim{font-size:.74rem;color:var(--color-muted);}

  /* Pass/fail card */
  .pf-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:.875rem;padding:1.125rem 1.25rem;}
  .pf-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.875rem;}
  .pf-total{font-size:.76rem;color:var(--color-muted);}
  .pf-bar{height:12px;border-radius:6px;overflow:hidden;display:flex;background:var(--color-bg);}
  .pf-pass{background:#16a34a;transition:width .4s ease;}
  .pf-fail{background:#dc2626;transition:width .4s ease;}
  .pf-legend{display:flex;gap:1.5rem;margin-top:.625rem;font-size:.78rem;font-weight:600;}
  .leg-pass{color:#16a34a;} .leg-fail{color:#dc2626;}

  @media(max-width:860px){.two-col{grid-template-columns:1fr;}}
</style>
