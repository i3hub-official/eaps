<!-- src/routes/admin/exams/[examId]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ClipboardList, BookOpen, Users, Clock, Hash, CheckCircle,
    XCircle, AlertTriangle, Eye, Calendar, User, Play,
    Pause, Ban, RotateCcw, Trash2, ChevronDown,
    BarChart3, Award, Target, Shield, FileText
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exam, scoreStats, passCount } = data;

  let showDeleteConfirm = $state(false);
  let activeTab = $state<'overview'|'sessions'|'questions'>('overview');

  function statusColor(s: string) {
    return s === 'active'    ? 'badge-active'
      : s === 'completed' ? 'badge-completed'
      : s === 'scheduled' ? 'badge-scheduled'
      : s === 'cancelled' ? 'badge-cancelled'
      : 'badge-draft';
  }

  function sessionStatusColor(s: string) {
    return s === 'submitted'       ? 'badge-completed'
      : s === 'in_progress'     ? 'badge-active'
      : s === 'flagged'         ? 'badge-cancelled'
      : s === 'force_submitted' ? 'badge-scheduled'
      : 'badge-draft';
  }

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  }

  const totalSessions = exam.examSessions.length;
  const graded = exam.examSessions.filter(s => s.examResult).length;
  const passRate = graded > 0 ? Math.round((passCount / graded) * 100) : 0;
</script>

<div class="detail-page">

  <!-- Header -->
  <div class="detail-header">
    <div class="dh-left">
      <div class="dh-icon"><ClipboardList size={20} /></div>
      <div>
        <div class="dh-breadcrumb"><a href="/admin/exams">Exams</a> / {exam.course.code}</div>
        <h1 class="dh-title">{exam.title}</h1>
        <div class="dh-meta">
          <span><BookOpen size={12} /> {exam.course.code} — {exam.course.title}</span>
          <span><User size={12} /> {exam.lecturer.fullName}</span>
          <span><Calendar size={12} /> {exam.session} · Sem {exam.semester}</span>
        </div>
      </div>
    </div>
    <div class="dh-actions">
      <span class="exam-status-badge {statusColor(exam.status)}">{exam.status}</span>

      <!-- Status switcher -->
      <form method="POST" action="?/updateStatus" use:enhance class="status-form">
        <select name="status" onchange={(e) => (e.target as HTMLFormElement).form?.requestSubmit()}>
          {#each ['draft','scheduled','active','completed','cancelled'] as s}
            <option value={s} selected={exam.status === s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          {/each}
        </select>
      </form>

      <button class="btn-danger-outline" onclick={() => showDeleteConfirm = true}>
        <Trash2 size={14} /> Delete
      </button>
    </div>
  </div>

  <!-- Stat cards -->
  <div class="stats-grid">
    {#each [
      { icon: Hash,         label: 'Questions',   val: exam._count.questions,    cls: 'si-blue' },
      { icon: Users,        label: 'Sessions',    val: totalSessions,            cls: 'si-purple' },
      { icon: CheckCircle,  label: 'Graded',      val: graded,                   cls: 'si-green' },
      { icon: Target,       label: 'Pass Rate',   val: `${passRate}%`,           cls: 'si-teal' },
      { icon: BarChart3,    label: 'Avg Score',   val: scoreStats._avg.percentage ? `${Number(scoreStats._avg.percentage).toFixed(1)}%` : '—', cls: 'si-orange' },
      { icon: Clock,        label: 'Duration',    val: `${exam.durationMinutes}m`, cls: 'si-gray' },
    ] as s}
      <div class="stat-card">
        <div class="stat-icon {s.cls}"><s.icon size={16} /></div>
        <div>
          <div class="stat-val">{s.val}</div>
          <div class="stat-lbl">{s.label}</div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Tabs -->
  <div class="tabs">
    {#each [
      { key: 'overview',   label: 'Overview',  icon: Eye },
      { key: 'sessions',   label: `Sessions (${totalSessions})`, icon: Users },
      { key: 'questions',  label: `Questions (${exam._count.questions})`, icon: Hash },
    ] as tab}
      <button
        class="tab"
        class:tab-active={activeTab === tab.key}
        onclick={() => activeTab = tab.key as any}
      >
        <tab.icon size={14} /> {tab.label}
      </button>
    {/each}
  </div>

  <!-- Overview tab -->
  {#if activeTab === 'overview'}
    <div class="cards-row">
      <div class="card">
        <div class="card-head"><BookOpen size={15} /> Exam Configuration</div>
        <div class="info-grid">
          <span class="ig-label">Total Marks</span><span>{exam.totalMarks}</span>
          <span class="ig-label">Pass Mark</span><span>{exam.passMark}</span>
          <span class="ig-label">Max Violations</span><span>{exam.maxViolations}</span>
          <span class="ig-label">Late Entry</span><span>{exam.allowLateEntry ? `Yes (${exam.lateEntryMinutes}m)` : 'No'}</span>
          <span class="ig-label">Randomize Q</span><span>{exam.randomizeQuestions ? 'Yes' : 'No'}</span>
          <span class="ig-label">Randomize Opts</span><span>{exam.randomizeOptions ? 'Yes' : 'No'}</span>
          <span class="ig-label">Show Results</span><span>{exam.showResultAfter ? 'Immediately' : 'After review'}</span>
          <span class="ig-label">Target Levels</span><span>{exam.levels?.length ? exam.levels.join(', ') : 'All'}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><Calendar size={15} /> Schedule</div>
        <div class="info-grid">
          <span class="ig-label">Scheduled Start</span><span>{fmt(exam.scheduledStart)}</span>
          <span class="ig-label">Scheduled End</span><span>{fmt(exam.scheduledEnd)}</span>
          <span class="ig-label">Created</span><span>{fmt(exam.createdAt)}</span>
          <span class="ig-label">Last Updated</span><span>{fmt(exam.updatedAt)}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><Shield size={15} /> Invigilators</div>
        {#if exam.invigilators.length === 0}
          <p class="card-empty">No invigilators assigned</p>
        {:else}
          <div class="invig-list">
            {#each exam.invigilators as inv}
              <div class="invig-item">
                <div class="invig-avatar">{inv.invigilator.fullName.charAt(0)}</div>
                <div>
                  <div class="invig-name">{inv.invigilator.fullName}</div>
                  <div class="invig-email">{inv.invigilator.email}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  <!-- Sessions tab -->
  {:else if activeTab === 'sessions'}
    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr><th>Student</th><th>Status</th><th>Score</th><th>Grade</th><th>Violations</th><th>Submitted</th></tr>
        </thead>
        <tbody>
          {#each exam.examSessions as sess}
            <tr>
              <td>
                <div class="student-name">{sess.student.fullName}</div>
                <div class="student-matric">{sess.student.matricNumber ?? '—'}</div>
              </td>
              <td><span class="status-badge {sessionStatusColor(sess.status)}">{sess.status.replace(/_/g,' ')}</span></td>
              <td class="td-num">{sess.examResult?.percentage != null ? `${Number(sess.examResult.percentage).toFixed(1)}%` : '—'}</td>
              <td class="td-num">{sess.examResult?.grade ?? '—'}</td>
              <td class="td-num {sess._count.violations > 0 ? 'td-warn' : ''}">{sess._count.violations}</td>
              <td class="td-muted">{fmt(sess.submittedAt)}</td>
            </tr>
          {/each}
          {#if exam.examSessions.length === 0}
            <tr><td colspan="6" class="empty-row">No sessions yet</td></tr>
          {/if}
        </tbody>
      </table>
    </div>

  <!-- Questions tab -->
  {:else if activeTab === 'questions'}
    <div class="questions-list">
      {#each exam.questions as q, i}
        <div class="question-card">
          <div class="q-header">
            <span class="q-num">Q{i + 1}</span>
            <span class="q-type">{q.type === 'mcq' ? 'MCQ' : 'Fill in blank'}</span>
            <span class="q-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            <span class="q-answers td-muted">{q._count.studentAnswers} answered</span>
          </div>
          <div class="q-body">{q.body}</div>
          {#if q.options.length > 0}
            <div class="q-options">
              {#each q.options as opt}
                <div class="q-option" class:q-correct={opt.isCorrect}>
                  {#if opt.isCorrect}<CheckCircle size={12} />{:else}<span class="q-dot"></span>{/if}
                  {opt.optionText}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
      {#if exam.questions.length === 0}
        <div class="empty-state">
          <Hash size={32} />
          <p>No questions added yet</p>
        </div>
      {/if}
    </div>
  {/if}

</div>

<!-- Delete confirm -->
{#if showDeleteConfirm}
  <div class="modal-bg" onclick={() => showDeleteConfirm = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <AlertTriangle size={28} class="modal-warn-icon" />
      <h2>Delete Exam?</h2>
      <p>This will permanently delete the exam and all associated questions, sessions, and results. This cannot be undone.</p>
      <div class="modal-btns">
        <button class="btn-ghost" onclick={() => showDeleteConfirm = false}>Cancel</button>
        <form method="POST" action="?/delete" use:enhance style="flex:1;display:flex;">
          <button type="submit" class="btn-danger" style="flex:1;">Delete Exam</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .detail-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* Header */
  .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .dh-left { display: flex; align-items: flex-start; gap: .875rem; }
  .dh-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg,#0ea5e9,#0284c7); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .dh-breadcrumb { font-size: .72rem; color: var(--color-muted); margin-bottom: .25rem; }
  .dh-breadcrumb a { color: #16a34a; text-decoration: none; }
  .dh-title { font-size: 1.15rem; font-weight: 800; color: var(--color-text); line-height: 1.3; }
  .dh-meta { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: .375rem; font-size: .75rem; color: var(--color-muted); }
  .dh-meta span { display: flex; align-items: center; gap: .3rem; }
  .dh-actions { display: flex; align-items: center; gap: .625rem; flex-wrap: wrap; }

  .exam-status-badge { font-size: .72rem; font-weight: 700; padding: .3rem .75rem; border-radius: 2rem; text-transform: capitalize; }
  .badge-active    { background: rgba(22,163,74,.12);  color: #16a34a; }
  .badge-completed { background: rgba(59,130,246,.12); color: #3b82f6; }
  .badge-scheduled { background: rgba(168,85,247,.12); color: #a855f7; }
  .badge-cancelled { background: rgba(239,68,68,.12);  color: #ef4444; }
  .badge-draft     { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  .status-form select {
    padding: .4rem .75rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    font-size: .8rem; color: var(--color-text); cursor: pointer; font-family: inherit;
  }
  .btn-danger-outline { display: flex; align-items: center; gap: .375rem; padding: .45rem .875rem; background: none; border: 1px solid rgba(220,38,38,.4); border-radius: .5rem; color: #dc2626; font-size: .8rem; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-danger-outline:hover { background: rgba(220,38,38,.06); }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .875rem; }
  .stat-card { display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .75rem; }
  .stat-icon { width: 36px; height: 36px; border-radius: .5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .si-blue   { background: rgba(59,130,246,.12);  color: #3b82f6; }
  .si-purple { background: rgba(168,85,247,.12);  color: #a855f7; }
  .si-green  { background: rgba(22,163,74,.12);   color: #16a34a; }
  .si-teal   { background: rgba(20,184,166,.12);  color: #14b8a6; }
  .si-orange { background: rgba(249,115,22,.12);  color: #f97316; }
  .si-gray   { background: var(--color-bg); color: var(--color-muted); }
  .stat-val  { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  .stat-lbl  { font-size: .7rem; color: var(--color-muted); }

  /* Tabs */
  .tabs { display: flex; gap: .375rem; border-bottom: 2px solid var(--color-border); padding-bottom: 0; }
  .tab { display: flex; align-items: center; gap: .375rem; padding: .6rem 1rem; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: .82rem; font-weight: 600; color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all .15s; }
  .tab:hover { color: var(--color-text); }
  .tab-active { color: #16a34a; border-bottom-color: #16a34a; }

  /* Cards row */
  .cards-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: .5rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }
  .card-empty { padding: 1.5rem; font-size: .82rem; color: var(--color-muted); text-align: center; }

  .info-grid { display: grid; grid-template-columns: auto 1fr; gap: .625rem 1rem; padding: 1rem 1.25rem; font-size: .82rem; }
  .ig-label { color: var(--color-muted); font-size: .75rem; white-space: nowrap; }

  /* Invigilators */
  .invig-list { display: flex; flex-direction: column; gap: .125rem; padding: .75rem; }
  .invig-item { display: flex; align-items: center; gap: .625rem; padding: .5rem; border-radius: .5rem; }
  .invig-item:hover { background: var(--color-bg); }
  .invig-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,#16a34a,#15803d); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: .75rem; flex-shrink: 0; }
  .invig-name { font-size: .82rem; font-weight: 600; color: var(--color-text); }
  .invig-email { font-size: .7rem; color: var(--color-muted); }

  /* Table card */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { padding: .75rem 1rem; background: var(--color-bg); font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); }
  .data-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .82rem; vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .student-name { font-weight: 600; color: var(--color-text); }
  .student-matric { font-size: .7rem; color: var(--color-muted); }
  .status-badge { font-size: .68rem; font-weight: 700; padding: .2rem .5rem; border-radius: 2rem; text-transform: capitalize; }
  .td-num { font-weight: 600; color: var(--color-text); }
  .td-warn { color: #dc2626; }
  .td-muted { color: var(--color-muted); font-size: .8rem; }
  .empty-row { text-align: center; color: var(--color-muted); padding: 2rem; }

  /* Questions */
  .questions-list { display: flex; flex-direction: column; gap: .75rem; }
  .question-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .75rem; padding: 1rem 1.25rem; }
  .q-header { display: flex; align-items: center; gap: .75rem; margin-bottom: .625rem; }
  .q-num { font-size: .72rem; font-weight: 800; background: var(--color-bg); border: 1px solid var(--color-border); padding: .15rem .5rem; border-radius: .375rem; }
  .q-type { font-size: .68rem; font-weight: 700; background: rgba(59,130,246,.1); color: #3b82f6; padding: .15rem .5rem; border-radius: .375rem; }
  .q-marks { font-size: .72rem; color: var(--color-muted); margin-left: auto; }
  .q-answers { font-size: .72rem; }
  .q-body { font-size: .85rem; color: var(--color-text); line-height: 1.5; margin-bottom: .625rem; }
  .q-options { display: flex; flex-direction: column; gap: .375rem; }
  .q-option { display: flex; align-items: center; gap: .5rem; font-size: .8rem; padding: .4rem .625rem; border-radius: .375rem; color: var(--color-muted); }
  .q-option.q-correct { background: rgba(22,163,74,.08); color: #16a34a; font-weight: 600; }
  .q-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; }

  /* Empty */
  .empty-state { padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--color-muted); }

  /* Buttons */
  .btn-ghost {
    display: flex; align-items: center; gap: .5rem;
    padding: .6rem 1.25rem; background: transparent;
    border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: .5rem; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .btn-danger { padding: .6rem; background: #dc2626; border: none; border-radius: .5rem; color: white; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit; }

  /* Modal */
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1rem; padding: 2rem 1.75rem 1.5rem; width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: .875rem; box-shadow: 0 20px 60px rgba(0,0,0,.25); text-align: center; }
  .modal :global(.modal-warn-icon) { color: #dc2626; }
  .modal h2 { font-size: 1.05rem; font-weight: 700; }
  .modal p { font-size: .82rem; color: var(--color-muted); line-height: 1.55; }
  .modal-btns { display: flex; gap: .625rem; width: 100%; }

  @media (max-width: 768px) {
    .cards-row { grid-template-columns: 1fr; }
  }
</style>