<!-- src/routes/exam-officer/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { ClipboardList, CheckCircle, Clock, Radio, FileText, BarChart2 } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  function statusClass(s: string) {
    return { draft:'badge-draft', scheduled:'badge-scheduled', active:'badge-active', completed:'badge-completed', cancelled:'badge-cancelled' }[s] ?? 'badge-draft';
  }

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>University Exam Overview</h1>
    <p>University-wide exam schedules and results.</p>
  </div>
</div>

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-icon"><ClipboardList size={17} /></div>
    <div class="stat-value">{data.examCounts.total}</div>
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
    <div class="stat-icon"><CheckCircle size={17} /></div>
    <div class="stat-value">{data.examCounts.completed}</div>
    <div class="stat-label">Completed</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><FileText size={17} /></div>
    <div class="stat-value">{data.examCounts.draft}</div>
    <div class="stat-label">Drafts</div>
  </div>
</div>

<div class="two-col">
  <!-- Recent exams -->
  <div class="table-card">
    <div class="table-head-row">
      <span class="table-title">Recent Exams</span>
      <a href="/exam-officer/exams" class="btn btn-outline" style="padding:.35rem .75rem;font-size:.75rem">View all</a>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>Exam</th><th>Faculty</th><th>Lecturer</th><th>Scheduled</th><th>Status</th></tr>
      </thead>
      <tbody>
        {#each data.recentExams as e}
          <tr>
            <td>
              <a href="/exam-officer/exams/{e.id}" class="row-link">{e.title}</a>
              <div class="sub">{e.course.code} · Sem {e.semester}</div>
            </td>
            <td>{e.course.department.college?.abbreviation ?? '—'}</td>
            <td>{e.lecturer.fullName}</td>
            <td>{fmt(e.scheduledStart)}</td>
            <td><span class="badge {statusClass(e.status)}">{e.status}</span></td>
          </tr>
        {:else}
          <tr><td colspan="5" class="empty-row">No exams yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Recent results -->
  <div class="table-card">
    <div class="table-head-row">
      <span class="table-title">Recent Results</span>
      <a href="/exam-officer/results" class="btn btn-outline" style="padding:.35rem .75rem;font-size:.75rem">View all</a>
    </div>
    <table class="data-table">
      <thead><tr><th>Student</th><th>Course</th><th>Score</th><th>Grade</th></tr></thead>
      <tbody>
        {#each data.recentResults as r}
          <tr>
            <td>
              <div class="fw">{r.student.fullName}</div>
              <div class="sub">{r.student.matricNumber ?? '—'}</div>
            </td>
            <td><span class="code">{r.exam.course.code}</span></td>
            <td>{r.percentage != null ? `${Number(r.percentage).toFixed(1)}%` : '—'}</td>
            <td>
              <span class="badge" class:badge-active={r.passed} class:badge-cancelled={r.passed === false}>
                {r.grade ?? '—'}
              </span>
            </td>
          </tr>
        {:else}
          <tr><td colspan="4" class="empty-row">No results yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
 @import '$lib/styles/portals.css';
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;}
  .row-link{color:var(--p-accent);text-decoration:none;font-weight:600;}
  .row-link:hover{text-decoration:underline;}
  .fw{font-weight:600;} .sub{font-size:.72rem;color:var(--color-muted);margin-top:.1rem;}
  .code{font-size:.74rem;font-weight:700;color:#3b82f6;}
  @media(max-width:900px){.two-col{grid-template-columns:1fr;}}
</style>
