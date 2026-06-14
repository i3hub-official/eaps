<!-- src/routes/invigilator/assignments/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ClipboardList, Calendar, Clock, Users, BookOpen,
    CheckCircle, PlayCircle, AlertTriangle, ChevronRight
  } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  const { categorised, assignments } = data;

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
      weekday: 'short', day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function statusBadge(status: string) {
    return status === 'active'    ? { cls: 'ab-active',    label: 'Live now' }
      : status === 'scheduled' ? { cls: 'ab-scheduled', label: 'Scheduled' }
      : status === 'completed' ? { cls: 'ab-done',      label: 'Completed' }
      : status === 'cancelled' ? { cls: 'ab-cancelled', label: 'Cancelled' }
      : { cls: 'ab-draft', label: status };
  }
</script>

<div class="assignments-page">

  <div class="page-header">
    <div class="ph-icon"><ClipboardList size={20} /></div>
    <div>
      <h1>My Assignments</h1>
      <p>All exams you have been assigned to invigilate</p>
    </div>
  </div>

  <!-- Summary chips -->
  <div class="summary-chips">
    <div class="sum-chip sum-active">
      <PlayCircle size={14} /> {categorised.active.length} Live
    </div>
    <div class="sum-chip sum-upcoming">
      <Clock size={14} /> {categorised.upcoming.length} Upcoming
    </div>
    <div class="sum-chip sum-done">
      <CheckCircle size={14} /> {categorised.completed.length} Completed
    </div>
    <div class="sum-chip sum-total">
      <ClipboardList size={14} /> {assignments.length} Total
    </div>
  </div>

  <!-- Active exams (most urgent) -->
  {#if categorised.active.length > 0}
    <div class="section">
      <h2 class="section-title active-title"><PlayCircle size={15} /> Live Now</h2>
      <div class="exam-cards">
        {#each categorised.active as a (a.id)}
          <button
            class="exam-card exam-card-active"
            onclick={() => goto(`/invigilator/monitor/${a.exam.id}`)}
          >
            <div class="ec-head">
              <span class="ec-course">{a.exam.course.code}</span>
              <span class="ab-active ab-badge">Live</span>
            </div>
            <div class="ec-title">{a.exam.title}</div>
            <div class="ec-meta">
              <span><BookOpen size={12} /> {[a.exam.lecturer.title, a.exam.lecturer.fullName].filter(Boolean).join(' ')}</span>
              <span><Users size={12} /> {a.exam._count.examSessions} students</span>
              <span><Clock size={12} /> {a.exam.durationMinutes}m</span>
            </div>
            <div class="ec-action">
              Open monitor <ChevronRight size={14} />
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Upcoming -->
  {#if categorised.upcoming.length > 0}
    <div class="section">
      <h2 class="section-title"><Calendar size={15} /> Upcoming</h2>
      <div class="table-card">
        <table class="assign-table">
          <thead>
            <tr><th>Exam</th><th>Course</th><th>Lecturer</th><th>Scheduled</th><th>Duration</th><th>Students</th><th></th></tr>
          </thead>
          <tbody>
            {#each categorised.upcoming as a (a.id)}
              <tr class="assign-row" onclick={() => goto(`/invigilator/${a.exam.id}`)}>
                <td>
                  <div class="td-title">{a.exam.title}</div>
                  <div class="td-session">{a.exam.session} · Sem {a.exam.semester}</div>
                </td>
                <td class="td-muted">{a.exam.course.code}</td>
                <td class="td-muted">{[a.exam.lecturer.title, a.exam.lecturer.fullName].filter(Boolean).join(' ')}</td>
                <td class="td-muted">{fmt(a.exam.scheduledStart)}</td>
                <td class="td-muted">{a.exam.durationMinutes}m</td>
                <td class="td-muted">{a.exam._count.examSessions}</td>
                <td><ChevronRight size={13} class="row-arrow" /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Completed -->
  {#if categorised.completed.length > 0}
    <div class="section">
      <h2 class="section-title"><CheckCircle size={15} /> Past Assignments</h2>
      <div class="table-card">
        <table class="assign-table">
          <thead>
            <tr><th>Exam</th><th>Course</th><th>Status</th><th>Date</th><th>Students</th><th></th></tr>
          </thead>
          <tbody>
            {#each categorised.completed as a (a.id)}
              {@const sb = statusBadge(a.exam.status)}
              <tr class="assign-row" onclick={() => goto(`/invigilator/${a.exam.id}/summary`)}>
                <td>
                  <div class="td-title">{a.exam.title}</div>
                  <div class="td-session">{a.exam.session} · Sem {a.exam.semester}</div>
                </td>
                <td class="td-muted">{a.exam.course.code}</td>
                <td><span class="assign-badge {sb.cls}">{sb.label}</span></td>
                <td class="td-muted">{fmt(a.exam.scheduledStart)}</td>
                <td class="td-muted">{a.exam._count.examSessions}</td>
                <td><ChevronRight size={13} class="row-arrow" /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if assignments.length === 0}
    <div class="empty">
      <ClipboardList size={36} />
      <p>No exam assignments yet.</p>
      <span>You will appear here once a lecturer assigns you to an exam.</span>
    </div>
  {/if}

</div>

<style>
  .assignments-page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: center; gap: .875rem; }
  .ph-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg, var(--iv-400), var(--iv-600)); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }

  /* Summary chips */
  .summary-chips { display: flex; gap: .75rem; flex-wrap: wrap; }
  .sum-chip { display: flex; align-items: center; gap: .5rem; padding: .5rem 1rem; border-radius: .625rem; font-size: .8rem; font-weight: 700; border: 1.5px solid; }
  .sum-active   { background: rgba(22,163,74,.08);  border-color: rgba(22,163,74,.3);  color: #16a34a; }
  .sum-upcoming { background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.3); color: #6366f1; }
  .sum-done     { background: rgba(14,165,233,.08); border-color: rgba(14,165,233,.3); color: #0ea5e9; }
  .sum-total    { background: var(--color-surface); border-color: var(--color-border); color: var(--color-muted); }

  .section { display: flex; flex-direction: column; gap: .75rem; }
  .section-title { display: flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: 700; color: var(--color-text); }
  .active-title { color: #16a34a; }

  /* Exam cards (active) */
  .exam-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: .875rem; }
  .exam-card {
    display: flex; flex-direction: column; gap: .625rem;
    padding: 1.25rem; border-radius: .875rem; cursor: pointer;
    text-align: left; font-family: inherit;
    border: 2px solid; transition: all .15s;
    background: none;
  }
  .exam-card-active {
    border-color: var(--iv-500); background: var(--iv-soft);
    box-shadow: 0 0 0 4px rgba(249,115,22,.08);
  }
  .exam-card-active:hover { background: rgba(249,115,22,.12); transform: translateY(-2px); }
  .ec-head { display: flex; align-items: center; justify-content: space-between; }
  .ec-course { font-size: .75rem; font-weight: 700; color: var(--color-muted); }
  .ab-badge { font-size: .65rem; font-weight: 800; padding: .2rem .5rem; border-radius: 2rem; text-transform: uppercase; letter-spacing: .04em; }
  .ab-active { background: var(--iv-soft); color: var(--iv-600); }
  .ec-title { font-size: .95rem; font-weight: 700; color: var(--color-text); }
  .ec-meta { display: flex; flex-wrap: wrap; gap: .75rem; font-size: .73rem; color: var(--color-muted); }
  .ec-meta span { display: flex; align-items: center; gap: .3rem; }
  .ec-action { display: flex; align-items: center; gap: .25rem; font-size: .78rem; font-weight: 700; color: var(--iv-600); margin-top: .25rem; }

  /* Table */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .assign-table { width: 100%; border-collapse: collapse; }
  .assign-table th { padding: .7rem 1rem; background: var(--color-bg); font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
  .assign-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .82rem; vertical-align: middle; }
  .assign-row { cursor: pointer; transition: background .1s; }
  .assign-row:hover { background: var(--color-surface-hover); }
  .assign-row:last-child td { border-bottom: none; }
  .td-title   { font-weight: 600; color: var(--color-text); }
  .td-session { font-size: .7rem; color: var(--color-muted); }
  .td-muted   { color: var(--color-muted); white-space: nowrap; font-size: .8rem; }
  .row-arrow  { color: var(--color-muted); }

  .assign-badge { font-size: .68rem; font-weight: 700; padding: .2rem .5rem; border-radius: 2rem; white-space: nowrap; }
  .ab-scheduled { background: rgba(99,102,241,.12);  color: #6366f1; }
  .ab-done      { background: rgba(14,165,233,.12);  color: #0ea5e9; }
  .ab-cancelled { background: rgba(220,38,38,.12);   color: #dc2626; }
  .ab-draft     { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  /* Empty */
  .empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem; color: var(--color-muted); text-align: center; }
  .empty p    { font-size: .95rem; font-weight: 600; color: var(--color-text); }
  .empty span { font-size: .82rem; }

  @media (max-width: 768px) {
    .assign-table th:nth-child(n+4), .assign-table td:nth-child(n+4) { display: none; }
  }
</style>
