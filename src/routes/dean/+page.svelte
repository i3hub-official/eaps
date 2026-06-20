<!-- src/routes/dean/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Users, Layers, ClipboardList, Clock, CheckCircle } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  function statusClass(s: string) {
    return { draft:'badge-draft', scheduled:'badge-scheduled', active:'badge-active', completed:'badge-completed', cancelled:'badge-cancelled' }[s] ?? 'badge-draft';
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Faculty Overview</h1>
    <p>Read-only view across all departments in your faculty.</p>
  </div>
</div>

<div class="stat-grid">
  <div class="stat-card"><div class="stat-icon"><Layers size={17} /></div><div class="stat-value">{data.deptCount}</div><div class="stat-label">Departments</div></div>
  <div class="stat-card"><div class="stat-icon"><Users size={17} /></div><div class="stat-value">{data.hodCount}</div><div class="stat-label">HODs</div></div>
  <div class="stat-card"><div class="stat-icon"><Users size={17} /></div><div class="stat-value">{data.lecturerCount}</div><div class="stat-label">Lecturers</div></div>
  <div class="stat-card"><div class="stat-icon"><ClipboardList size={17} /></div><div class="stat-value">{data.examCounts.active}</div><div class="stat-label">Live exams</div></div>
  <div class="stat-card"><div class="stat-icon"><Clock size={17} /></div><div class="stat-value">{data.examCounts.scheduled}</div><div class="stat-label">Scheduled</div></div>
  <div class="stat-card"><div class="stat-icon"><CheckCircle size={17} /></div><div class="stat-value">{data.examCounts.completed}</div><div class="stat-label">Completed</div></div>
</div>

<div class="table-card">
  <div class="table-head-row">
    <span class="table-title">Recent Exams (Faculty-wide)</span>
    <a href="/dean/exams" class="btn btn-outline" style="padding:.35rem .75rem;font-size:.75rem">View all</a>
  </div>
  <table class="data-table">
    <thead><tr><th>Exam</th><th>Department</th><th>Lecturer</th><th>Sessions</th><th>Status</th></tr></thead>
    <tbody>
      {#each data.recentExams as exam}
        <tr>
          <td>
            <a href="/dean/exams/{exam.id}" class="row-link">{exam.title}</a>
            <div class="sub-text">{exam.course.code}</div>
          </td>
          <td>{exam.course.department.name}</td>
          <td>{exam.lecturer.fullName}</td>
          <td>{exam._count.examSessions}</td>
          <td><span class="badge {statusClass(exam.status)}">{exam.status}</span></td>
        </tr>
      {:else}
        <tr><td colspan="5" class="empty-row">No exams yet.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .row-link{color:var(--p-accent);text-decoration:none;font-weight:600;}
  .row-link:hover{text-decoration:underline;}
  .sub-text{font-size:.72rem;color:var(--color-muted);margin-top:.1rem;}
</style>