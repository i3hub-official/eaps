<!-- src/routes/hod/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Users, ClipboardList, CheckCircle, Clock, BarChart2, BookOpen } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusClass(s: string) {
    return { draft:'badge-draft', scheduled:'badge-scheduled', active:'badge-active', completed:'badge-completed', cancelled:'badge-cancelled' }[s] ?? 'badge-draft';
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Department Overview</h1>
    <p>Real-time snapshot of your department's exam activity.</p>
  </div>
</div>

<!-- Stats -->
<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-icon"><Users size={17} /></div>
    <div class="stat-value">{data.lecturerCount}</div>
    <div class="stat-label">Active lecturers</div>
  </div>
  <div class="stat-card">
    <div class="stat-icon"><ClipboardList size={17} /></div>
    <div class="stat-value">{data.examCounts.active}</div>
    <div class="stat-label">Live exams</div>
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
</div>

<div class="two-col">
  <!-- Recent exams -->
  <div class="table-card">
    <div class="table-head-row">
      <span class="table-title"><BookOpen size={14} style="display:inline;vertical-align:middle;margin-right:.35rem" />Recent Exams</span>
      <a href="/hod/exams" class="btn btn-outline" style="padding:.35rem .75rem;font-size:.75rem">View all</a>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Exam</th>
          <th>Lecturer</th>
          <th>Status</th>
          <th>Sessions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.recentExams as exam}
          <tr>
            <td>
              <a href="/hod/exams/{exam.id}" class="row-link">{exam.title}</a>
              <div class="sub-text">{exam.course.code}</div>
            </td>
            <td>{exam.lecturer.fullName}</td>
            <td><span class="badge {statusClass(exam.status)}">{exam.status}</span></td>
            <td>{exam._count.examSessions}</td>
          </tr>
        {:else}
          <tr><td colspan="4" class="empty-row">No exams yet.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Recent results -->
  <div class="table-card">
    <div class="table-head-row">
      <span class="table-title"><BarChart2 size={14} style="display:inline;vertical-align:middle;margin-right:.35rem" />Recent Results</span>
      <a href="/hod/results" class="btn btn-outline" style="padding:.35rem .75rem;font-size:.75rem">View all</a>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>Student</th><th>Course</th><th>Score</th><th>Grade</th></tr>
      </thead>
      <tbody>
        {#each data.recentResults as r}
          <tr>
            <td>
              <div>{r.student.fullName}</div>
              <div class="sub-text">{r.student.matricNumber ?? '—'}</div>
            </td>
            <td>{r.exam.course.code}</td>
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
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
  .row-link { color:var(--p-accent); text-decoration:none; font-weight:600; }
  .row-link:hover { text-decoration:underline; }
  .sub-text { font-size:.72rem; color:var(--color-muted); margin-top:.1rem; }
  @media(max-width:900px){ .two-col{grid-template-columns:1fr;} }
</style>