<!-- src/routes/lecturer/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    PlusCircle, ClipboardList, BookOpen, Clock, Users,
    CheckCircle, TrendingUp, ChevronRight, BarChart2,
    AlertCircle, Layers, FileText, Activity
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exams, statsMap } = data;

  type StatusKey = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

  const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string; dot: string }> = {
    draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.1)', dot: '#94a3b8' },
    scheduled: { label: 'Scheduled', color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  dot: '#3b82f6' },
    active:    { label: 'Active',    color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  dot: '#22c55e' },
    completed: { label: 'Completed', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', dot: '#a78bfa' },
    cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  dot: '#f87171' },
  };

  function getMeta(status: string) {
    return STATUS_META[status as StatusKey] ?? STATUS_META.draft;
  }

  // Summary counts
  const totalExams     = $derived(exams.length);
  const activeCount    = $derived(exams.filter(e => e.status === 'active').length);
  const scheduledCount = $derived(exams.filter(e => e.status === 'scheduled').length);
  const draftCount     = $derived(exams.filter(e => e.status === 'draft').length);

  // Total students across all exams
  const totalStudents = $derived(
    Object.values(statsMap ?? {}).reduce((sum, s: any) => sum + (s?.total ?? 0), 0)
  );

  function formatDate(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTime(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // Sort: active first, then scheduled, draft, completed, cancelled
  const ORDER: Record<string, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 };
  const sortedExams = $derived(
    [...exams].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9))
  );
</script>

<svelte:head><title>Lecturer Dashboard — MOUAU eTest</title></svelte:head>

<div class="page">

   <!-- ── Summary cards ──────────────────────────────────────────── -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <Activity size={18} />
      </div>
      <div class="summary-body">
        <span class="summary-num">{activeCount}</span>
        <span class="summary-lbl">Active Exams</span>
      </div>
      {#if activeCount > 0}
        <div class="summary-live-dot"></div>
      {/if}
    </div>

    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(37,99,235,0.08); color: #2563eb;">
        <Clock size={18} />
      </div>
      <div class="summary-body">
        <span class="summary-num">{scheduledCount}</span>
        <span class="summary-lbl">Scheduled</span>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(100,116,139,0.1); color: #64748b;">
        <FileText size={18} />
      </div>
      <div class="summary-body">
        <span class="summary-num">{draftCount}</span>
        <span class="summary-lbl">Drafts</span>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(124,58,237,0.08); color: #7c3aed;">
        <Users size={18} />
      </div>
      <div class="summary-body">
        <span class="summary-num">{totalStudents}</span>
        <span class="summary-lbl">Total Attempts</span>
      </div>
    </div>
  </div>

  <!-- ── Exams section ──────────────────────────────────────────── -->
  <div class="section-header">
    <div class="section-title">
      <ClipboardList size={16} />
      <h2>My Exams</h2>
      <span class="section-count">{totalExams}</span>
    </div>
    <a href="/lecturer/exams" class="link-all">
      View all <ChevronRight size={13} />
    </a>
  </div>

  {#if sortedExams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><BookOpen size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No exams yet</p>
      <p class="empty-sub">Create your first exam to get started.</p>
      <a href="/lecturer/exams/create" class="btn-primary">
        <PlusCircle size={14} /> Create Exam
      </a>
    </div>
  {:else}
    <div class="exam-grid">
      {#each sortedExams as exam (exam.id)}
        {@const meta = getMeta(exam.status)}
        {@const s    = (statsMap ?? {})[exam.id]}
        <div class="exam-card" class:is-active={exam.status === 'active'}>

          <!-- Top bar accent for active -->
          {#if exam.status === 'active'}
            <div class="card-accent"></div>
          {/if}

          <div class="card-top">
            <span class="course-badge">{exam.course.code}</span>
            <span class="status-pill" style="background:{meta.bg}; color:{meta.color};">
              <span class="status-pip" style="background:{meta.dot};"></span>
              {meta.label}
            </span>
          </div>

          <h2 class="exam-title">{exam.title}</h2>

          <div class="exam-meta-row">
            <span class="meta-chip"><Clock size={11} /> {exam.durationMinutes}min</span>
            <span class="meta-chip"><Layers size={11} /> {exam.totalMarks} marks</span>
            <span class="meta-chip"><CheckCircle size={11} /> Pass {exam.passMark}</span>
          </div>

          {#if exam.scheduledStart}
            <div class="schedule-row">
              <span class="schedule-label">
                {exam.status === 'active' ? 'Started' : 'Scheduled'}
              </span>
              <span class="schedule-val">
                {formatDate(exam.scheduledStart)} · {formatTime(exam.scheduledStart)}
              </span>
            </div>
          {/if}

          {#if s && (s.total > 0)}
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-val">{s.total}</span>
                <span class="stat-label">Students</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-val">{s.submitted ?? 0}</span>
                <span class="stat-label">Submitted</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-val" class:good-score={(s.avg_pct ?? 0) >= 50}>
                  {s.avg_pct ?? 0}%
                </span>
                <span class="stat-label">Avg Score</span>
              </div>
            </div>
          {:else if s}
            <div class="no-attempts">
              <AlertCircle size={12} /> No attempts yet
            </div>
          {/if}

          <div class="card-actions">
            <a href="/lecturer/exams/{exam.id}/questions" class="action-btn">
              <FileText size={13} /> Questions
            </a>
            <a href="/lecturer/results/{exam.id}" class="action-btn">
              <BarChart2 size={13} /> Results
            </a>
            <a href="/lecturer/exams/{exam.id}" class="action-btn outline">
              Manage <ChevronRight size={12} />
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}

</div>

<style>
  /* ── Tokens ──────────────────────────────────────────────────── */
  :root {
    --lc-soft: rgba(99, 102, 241, 0.08);
    --lc-500: #6366f1;
    --lc-600: #4f46e5;
    --lc-700: #4338ca;
  }

  .page {
    padding: 2rem 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (min-width: 1024px) {
    .page { padding: 2rem 2.5rem; }
  }

  /* ── Header ──────────────────────────────────────────────────── */
  .page-header {
    display: flex; justify-content: space-between;
    align-items: flex-start; gap: 1rem; flex-wrap: wrap;
  }

  .header-text h1 {
    font-size: 1.4rem; font-weight: 800; color: var(--color-text);
    margin: 0; letter-spacing: -0.02em;
  }

  .sub {
    font-size: 0.82rem; color: var(--color-muted);
    margin: 0.2rem 0 0;
  }
  .sub strong { color: var(--color-text); font-weight: 700; }

  /* ── Primary button ──────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .btn-primary:hover {
    background: var(--lc-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
  }

  /* ── Summary cards ───────────────────────────────────────────── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.875rem;
  }

  @media (max-width: 768px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 420px) { .summary-grid { grid-template-columns: 1fr 1fr; } }

  .summary-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1rem 1.125rem;
    display: flex; align-items: center; gap: 0.875rem;
    position: relative; overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .summary-card:hover {
    border-color: rgba(79, 70, 229, 0.3);
    box-shadow: 0 2px 12px rgba(79, 70, 229, 0.06);
  }

  .summary-icon {
    width: 38px; height: 38px; border-radius: 0.625rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }

  .summary-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .summary-num { font-size: 1.35rem; font-weight: 900; color: var(--color-text); line-height: 1; letter-spacing: -0.03em; }
  .summary-lbl { font-size: 0.68rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  .summary-live-dot {
    position: absolute; top: 0.75rem; right: 0.75rem;
    width: 8px; height: 8px; border-radius: 50%;
    background: #22c55e;
    animation: live-pulse 2s ease-in-out infinite;
  }
  @keyframes live-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
  }

  /* ── Section header ──────────────────────────────────────────── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  }

  .section-title {
    display: flex; align-items: center; gap: 0.5rem;
    color: var(--color-text);
  }
  .section-title h2 { font-size: 0.95rem; font-weight: 700; margin: 0; }
  .section-title :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .section-count {
    font-size: 0.7rem; font-weight: 700;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .link-all {
    display: flex; align-items: center; gap: 0.2rem;
    font-size: 0.75rem; font-weight: 600; color: var(--lc-600);
    text-decoration: none; transition: gap 0.15s;
  }
  .link-all:hover { gap: 0.35rem; }

  /* ── Exam grid ───────────────────────────────────────────────── */
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  /* ── Exam card ───────────────────────────────────────────────── */
  .exam-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.125rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    position: relative; overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  .exam-card:hover {
    border-color: rgba(79, 70, 229, 0.25);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }

  .exam-card.is-active {
    border-color: rgba(79, 70, 229, 0.35);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.06);
  }

  .card-accent {
    position: absolute; top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--lc-600), var(--lc-500), #818cf8);
  }

  /* Card top */
  .card-top {
    display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft);
    color: var(--lc-600); border-radius: 999px;
    letter-spacing: 0.04em;
  }

  .status-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem;
    border-radius: 999px; text-transform: capitalize; white-space: nowrap;
  }
  .status-pip {
    width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  }

  .exam-title {
    font-size: 0.9rem; font-weight: 700;
    color: var(--color-text); margin: 0;
    line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  /* Meta chips */
  .exam-meta-row {
    display: flex; flex-wrap: wrap; gap: 0.4rem;
  }

  .meta-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 600; padding: 0.2rem 0.55rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 999px; color: var(--color-muted);
  }

  /* Schedule row */
  .schedule-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    background: var(--color-bg); border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }
  .schedule-label { font-size: 0.65rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .schedule-val   { font-size: 0.75rem; font-weight: 600; color: var(--color-text); }

  /* Stats row */
  .stats-row {
    display: flex; align-items: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.625rem; overflow: hidden;
  }

  .stat-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 0.1rem; padding: 0.55rem 0.5rem;
  }
  .stat-val   { font-size: 0.95rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .stat-val.good-score { color: var(--lc-600); }
  .stat-label { font-size: 0.6rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .stat-divider { width: 1px; height: 28px; background: var(--color-border); flex-shrink: 0; }

  .no-attempts {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.72rem; color: var(--color-muted);
    padding: 0.4rem 0.625rem;
    background: var(--color-bg); border-radius: 0.45rem;
    border: 1px solid var(--color-border);
  }

  /* Actions */
  .card-actions {
    display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: auto; padding-top: 0.25rem;
  }

  .action-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    font-family: inherit; transition: background 0.15s;
    white-space: nowrap;
  }
  .action-btn:hover { background: var(--lc-700); }

  .action-btn.outline {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    margin-left: auto;
  }
  .action-btn.outline:hover {
    border-color: var(--lc-600); color: var(--lc-600);
    background: var(--lc-soft);
  }

  /* ── Empty state ─────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    border-style: dashed;
  }

  .empty-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--lc-soft); border: 1px solid rgba(79, 70, 229, 0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600); margin-bottom: 0.25rem;
  }

  .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub   { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
</style>
