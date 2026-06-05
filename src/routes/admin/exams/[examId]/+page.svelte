<!-- src/routes/admin/exams/[examId]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ClipboardList, BookOpen, Users, Clock, Hash, CheckCircle,
    AlertTriangle, Eye, Calendar, User, ChevronLeft,
    Trash2, BarChart3, Target, Shield, Loader2, X
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exam, scoreStats, passCount } = data;

  let showDeleteConfirm = $state(false);
  let activeTab = $state<'overview'|'sessions'>('overview');
  let loadingAction = $state<string | null>(null);
  let statusUpdating = $state(false);

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
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const totalSessions = exam?.examSessions?.length ?? 0;
  const graded = exam?.examSessions?.filter((s: any) => s.examResult).length ?? 0;
  const passRate = graded > 0 ? Math.round((passCount / graded) * 100) : 0;

  function handleStatusChange(e: Event) {
    const form = (e.target as HTMLSelectElement).closest('form') as HTMLFormElement;
    if (form) {
      statusUpdating = true;
      form.requestSubmit();
    }
  }

  function handleDeleteEnhance() {
    return () => {
      loadingAction = 'delete';
      return async ({ update }: { update: () => Promise<void> }) => {
        await update();
        loadingAction = null;
        showDeleteConfirm = false;
      };
    };
  }
</script>

<svelte:head><title>{exam?.title ?? 'Exam'} — MOUAU eTest Admin</title></svelte:head>

<div class="detail-page">

  <!-- Header -->
  <div class="detail-header">
    <div class="dh-left">
      <a href="/admin/exams" class="back-link">
        <ChevronLeft size={16} /> Exams
      </a>
      <div class="dh-icon"><ClipboardList size={20} /></div>
      <div>
        <h1 class="dh-title">{exam?.title ?? 'Untitled Exam'}</h1>
        <div class="dh-meta">
          <span><BookOpen size={12} /> {exam?.course?.code ?? '—'} — {exam?.course?.title ?? ''}</span>
          <span><User size={12} /> {exam?.lecturer?.fullName ?? '—'}</span>
          <span><Calendar size={12} /> {exam?.session ?? '—'} · Sem {exam?.semester ?? '—'}</span>
        </div>
      </div>
    </div>
    <div class="dh-actions">
      <span class="exam-status-badge {statusColor(exam?.status ?? 'draft')}">{exam?.status ?? 'draft'}</span>

      <form method="POST" action="?/updateStatus" use:enhance={() => { statusUpdating = true; return async ({ update }) => { await update(); statusUpdating = false; }; }}>
        <div class="status-select-wrap">
          <select name="status" onchange={handleStatusChange} disabled={statusUpdating}>
            {#each ['draft','scheduled','active','completed','cancelled'] as s}
              <option value={s} selected={exam?.status === s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            {/each}
          </select>
          {#if statusUpdating}
            <span class="status-spin"><Loader2 size={14} class="spin" /></span>
          {/if}
        </div>
      </form>

      <button class="btn-danger-outline" onclick={() => showDeleteConfirm = true}>
        <Trash2 size={14} /> Delete
      </button>
    </div>
  </div>

  <!-- Stat cards -->
  <div class="stats-grid">
    {#each [
      { icon: Hash,         label: 'Questions',   val: exam?._count?.questions ?? 0,    cls: 'si-blue' },
      { icon: Users,        label: 'Sessions',    val: totalSessions,                   cls: 'si-purple' },
      { icon: CheckCircle,  label: 'Graded',      val: graded,                          cls: 'si-green' },
      { icon: Target,       label: 'Pass Rate',   val: `${passRate}%`,                  cls: 'si-teal' },
      { icon: BarChart3,    label: 'Avg Score',   val: scoreStats?._avg?.percentage ? `${Number(scoreStats._avg.percentage).toFixed(1)}%` : '—', cls: 'si-orange' },
      { icon: Clock,        label: 'Duration',    val: `${exam?.durationMinutes ?? '—'}m`, cls: 'si-gray' },
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
      { key: 'overview' as const,  label: 'Overview',  icon: Eye },
      { key: 'sessions' as const,  label: `Sessions (${totalSessions})`, icon: Users },
    ] as tab}
      <button
        class="tab"
        class:tab-active={activeTab === tab.key}
        onclick={() => activeTab = tab.key}
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
          <span class="ig-label">Total Marks</span><span>{exam?.totalMarks ?? '—'}</span>
          <span class="ig-label">Pass Mark</span><span>{exam?.passMark ?? '—'}</span>
          <span class="ig-label">Max Violations</span><span>{exam?.maxViolations ?? '—'}</span>
          <span class="ig-label">Late Entry</span><span>{exam?.allowLateEntry ? `Yes (${exam?.lateEntryMinutes ?? 0}m)` : 'No'}</span>
          <span class="ig-label">Randomize Q</span><span>{exam?.randomizeQuestions ? 'Yes' : 'No'}</span>
          <span class="ig-label">Randomize Opts</span><span>{exam?.randomizeOptions ? 'Yes' : 'No'}</span>
          <span class="ig-label">Show Results</span><span>{exam?.showResultAfter ? 'Immediately' : 'After review'}</span>
          <span class="ig-label">Target Levels</span><span>{exam?.levels?.length ? exam.levels.join(', ') : 'All'}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><Calendar size={15} /> Schedule</div>
        <div class="info-grid">
          <span class="ig-label">Scheduled Start</span><span>{fmt(exam?.scheduledStart)}</span>
          <span class="ig-label">Scheduled End</span><span>{fmt(exam?.scheduledEnd)}</span>
          <span class="ig-label">Created</span><span>{fmt(exam?.createdAt)}</span>
          <span class="ig-label">Last Updated</span><span>{fmt(exam?.updatedAt)}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><Shield size={15} /> Invigilators</div>
        {#if !exam?.invigilators?.length}
          <div class="card-empty">
            <Users size={24} class="empty-icon" />
            <p>No invigilators assigned</p>
          </div>
        {:else}
          <div class="invig-list">
            {#each exam.invigilators as inv}
              <div class="invig-item">
                <div class="invig-avatar">{inv.invigilator?.fullName?.charAt(0)?.toUpperCase() ?? '?'}</div>
                <div>
                  <div class="invig-name">{inv.invigilator?.fullName ?? 'Unknown'}</div>
                  <div class="invig-email">{inv.invigilator?.email ?? '—'}</div>
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
      {#if !exam?.examSessions?.length}
        <div class="empty-state">
          <Users size={40} class="empty-icon" />
          <p class="empty-title">No sessions yet</p>
          <p class="empty-desc">Student sessions will appear here once the exam is active.</p>
        </div>
      {:else}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th class="numeric">Score</th>
                <th class="numeric">Grade</th>
                <th class="numeric">Violations</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {#each exam.examSessions as sess}
                <tr>
                  <td>
                    <div class="student-cell">
                      <div class="student-avatar">{sess.student?.fullName?.charAt(0)?.toUpperCase() ?? '?'}</div>
                      <div>
                        <div class="student-name">{sess.student?.fullName ?? 'Unknown'}</div>
                        <div class="student-matric">{sess.student?.matricNumber ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="status-badge {sessionStatusColor(sess.status)}">{sess.status?.replace(/_/g,' ') ?? '—'}</span></td>
                  <td class="td-num">{sess.examResult?.percentage != null ? `${Number(sess.examResult.percentage).toFixed(1)}%` : '—'}</td>
                  <td class="td-num">{sess.examResult?.grade ?? '—'}</td>
                  <td class="td-num {sess._count?.violations > 0 ? 'td-warn' : ''}">{sess._count?.violations ?? 0}</td>
                  <td class="td-muted">{fmt(sess.submittedAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}

</div>

<!-- Delete confirm -->
{#if showDeleteConfirm}
  <div class="modal-bg" onclick={() => showDeleteConfirm = false} role="dialog" aria-modal="true" aria-labelledby="delete-title">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-icon-wrap danger"><AlertTriangle size={28} /></div>
      <h2 id="delete-title">Delete Exam?</h2>
      <p class="delete-desc">This will permanently delete <strong>{exam?.title ?? 'this exam'}</strong> and all associated sessions and results.</p>
      <div class="warning-box">
        <AlertTriangle size={16} />
        <span>This action cannot be undone.</span>
      </div>
      <div class="modal-btns">
        <button class="btn-ghost" onclick={() => showDeleteConfirm = false}>Cancel</button>
        <form method="POST" action="?/delete" use:enhance={handleDeleteEnhance()} style="display:contents">
          <button type="submit" class="btn-danger" disabled={loadingAction === 'delete'}>
            {#if loadingAction === 'delete'}
              <Loader2 size={14} class="spin" /> Deleting...
            {:else}
              <Trash2 size={14} /> Yes, Delete
            {/if}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .detail-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Header ──────────────────────────────────────────────────── */
  .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .dh-left { display: flex; align-items: flex-start; gap: .875rem; flex-wrap: wrap; }
  .back-link {
    display: inline-flex; align-items: center; gap: .25rem;
    font-size: .78rem; color: var(--color-muted); text-decoration: none;
    font-weight: 500; transition: color .15s; width: 100%; margin-bottom: .25rem;
  }
  .back-link:hover { color: #3b82f6; }
  .dh-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .dh-title { font-size: 1.2rem; font-weight: 800; color: var(--color-text); line-height: 1.3; margin: 0; }
  .dh-meta { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: .375rem; font-size: .75rem; color: var(--color-muted); }
  .dh-meta span { display: flex; align-items: center; gap: .3rem; }
  .dh-actions { display: flex; align-items: center; gap: .625rem; flex-wrap: wrap; }

  .exam-status-badge { font-size: .72rem; font-weight: 700; padding: .3rem .75rem; border-radius: 2rem; text-transform: capitalize; white-space: nowrap; }
  .badge-active    { background: rgba(22,163,74,.12);  color: #16a34a; }
  .badge-completed { background: rgba(59,130,246,.12); color: #3b82f6; }
  .badge-scheduled { background: rgba(139,92,246,.12); color: #8b5cf6; }
  .badge-cancelled { background: rgba(239,68,68,.12);  color: #ef4444; }
  .badge-draft     { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  .status-select-wrap { position: relative; display: flex; align-items: center; }
  .status-select-wrap select {
    padding: .45rem 2rem .45rem .75rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    font-size: .8rem; color: var(--color-text); cursor: pointer; font-family: inherit;
    appearance: none; -webkit-appearance: none;
    transition: border-color .15s;
  }
  .status-select-wrap select:focus { outline: none; border-color: #3b82f6; }
  .status-select-wrap select:disabled { opacity: .6; cursor: not-allowed; }
  .status-spin { position: absolute; right: .5rem; color: #3b82f6; }

  .btn-danger-outline {
    display: flex; align-items: center; gap: .375rem;
    padding: .45rem .875rem; background: none;
    border: 1px solid rgba(220,38,38,.4); border-radius: .5rem;
    color: #dc2626; font-size: .8rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: all .15s;
  }
  .btn-danger-outline:hover { background: rgba(220,38,38,.08); border-color: #dc2626; }

  /* ── Stats ───────────────────────────────────────────────────── */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .875rem; }
  .stat-card { display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .75rem; transition: transform .15s, box-shadow .15s; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
  .stat-icon { width: 36px; height: 36px; border-radius: .5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .si-blue   { background: rgba(59,130,246,.12);  color: #3b82f6; }
  .si-purple { background: rgba(139,92,246,.12);  color: #8b5cf6; }
  .si-green  { background: rgba(22,163,74,.12);   color: #16a34a; }
  .si-teal   { background: rgba(20,184,166,.12);  color: #14b8a6; }
  .si-orange { background: rgba(249,115,22,.12);  color: #f97316; }
  .si-gray   { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .stat-val  { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  .stat-lbl  { font-size: .7rem; color: var(--color-muted); }

  /* ── Tabs ────────────────────────────────────────────────────── */
  .tabs { display: flex; gap: .375rem; border-bottom: 2px solid var(--color-border); padding-bottom: 0; }
  .tab { display: flex; align-items: center; gap: .375rem; padding: .6rem 1rem; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: .82rem; font-weight: 600; color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all .15s; }
  .tab:hover { color: var(--color-text); }
  .tab-active { color: #3b82f6; border-bottom-color: #3b82f6; }
  /* ── Cards Row ───────────────────────────────────────────────── */
  .cards-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-size: .82rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: .25rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .625rem 1rem;
    font-size: .78rem;
  }

  .info-grid .ig-label {
    color: var(--color-muted);
    font-weight: 500;
  }

  .info-grid span:nth-child(even) {
    color: var(--color-text);
    font-weight: 600;
    text-align: right;
  }

  .card-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    padding: 2rem;
    color: var(--color-muted);
    text-align: center;
  }

  .card-empty :global(.empty-icon) {
    opacity: .4;
  }

  .invig-list {
    display: flex;
    flex-direction: column;
    gap: .75rem;
  }

  .invig-item {
    display: flex;
    align-items: center;
    gap: .75rem;
  }

  .invig-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .invig-name {
    font-size: .8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .invig-email {
    font-size: .72rem;
    color: var(--color-muted);
  }

  /* ── Table ───────────────────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .75rem;
    overflow: hidden;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: .8rem;
  }

  .data-table thead {
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .data-table th {
    padding: .75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-muted);
    font-size: .72rem;
    text-transform: uppercase;
    letter-spacing: .025em;
    white-space: nowrap;
  }

  .data-table th.numeric {
    text-align: right;
  }

  .data-table tbody tr {
    border-bottom: 1px solid var(--color-border);
    transition: background .1s;
  }

  .data-table tbody tr:last-child {
    border-bottom: none;
  }

  .data-table tbody tr:hover {
    background: rgba(59, 130, 246, .04);
  }

  .data-table td {
    padding: .875rem 1rem;
    color: var(--color-text);
    vertical-align: middle;
  }

  .td-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .td-warn {
    color: #f97316;
    font-weight: 700;
  }

  .td-muted {
    color: var(--color-muted);
    font-size: .75rem;
    white-space: nowrap;
  }

  .student-cell {
    display: flex;
    align-items: center;
    gap: .75rem;
  }

  .student-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .student-name {
    font-weight: 600;
    color: var(--color-text);
    font-size: .82rem;
  }

  .student-matric {
    font-size: .72rem;
    color: var(--color-muted);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: .25rem;
    padding: .25rem .625rem;
    border-radius: 2rem;
    font-size: .72rem;
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
  }

  /* ── Empty State ───────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--color-muted);
  }

  .empty-state :global(.empty-icon) {
    opacity: .35;
    margin-bottom: .75rem;
  }

  .empty-title {
    font-size: .9rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 .25rem;
  }

  .empty-desc {
    font-size: .78rem;
    margin: 0;
    max-width: 280px;
  }

  /* ── Modal ─────────────────────────────────────────────────── */
  .modal-bg {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
    animation: fadeIn .15s ease;
  }

  .modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, .2);
    animation: scaleIn .15s ease;
  }

  .modal-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: .75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .modal-icon-wrap.danger {
    background: rgba(220, 38, 38, .12);
    color: #dc2626;
  }

  .modal h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 .5rem;
  }

  .delete-desc {
    font-size: .82rem;
    color: var(--color-muted);
    line-height: 1.5;
    margin: 0 0 1rem;
  }

  .warning-box {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .75rem;
    background: rgba(234, 179, 8, .1);
    border: 1px solid rgba(234, 179, 8, .2);
    border-radius: .5rem;
    font-size: .78rem;
    color: #a16207;
    margin-bottom: 1.25rem;
  }

  .modal-btns {
    display: flex;
    justify-content: flex-end;
    gap: .625rem;
  }

  .btn-ghost {
    padding: .5rem 1rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: .5rem;
    font-size: .8rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all .15s;
  }

  .btn-ghost:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .btn-danger {
    display: flex;
    align-items: center;
    gap: .375rem;
    padding: .5rem 1rem;
    background: #dc2626;
    border: none;
    border-radius: .5rem;
    font-size: .8rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: background .15s;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }

  .btn-danger:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  /* ── Utilities ─────────────────────────────────────────────── */
  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(.95); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ── Responsive ────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .dh-left {
      width: 100%;
    }

    .dh-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .info-grid {
      grid-template-columns: 1fr 1fr;
    }

    .data-table th,
    .data-table td {
      padding: .625rem .75rem;
    }
  }
</style>