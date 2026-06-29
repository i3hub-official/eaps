<!-- src/routes/lecturer/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    PlusCircle, ClipboardList, BookOpen, Clock, Users,
    CheckCircle, ChevronRight, BarChart2,
    AlertCircle, Layers, FileText, Activity, Zap,
    CalendarClock, FileEdit, XCircle, Eye, Edit, Trash2,
    Calendar, Award, HelpCircle, Copy, Link2, Settings,
    ShieldCheck, Timer, TrendingUp, Scale, Archive
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { exams, statsMap } = data;

  type StatusKey = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

  const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string; dot: string; icon: any; order: number }> = {
    draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.1)', dot: '#94a3b8', icon: FileEdit, order: 2 },
    scheduled: { label: 'Scheduled', color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  dot: '#3b82f6', icon: CalendarClock, order: 1 },
    active:    { label: 'Active',    color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  dot: '#22c55e', icon: Zap, order: 0 },
    completed: { label: 'Completed', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', dot: '#a78bfa', icon: CheckCircle, order: 3 },
    cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  dot: '#f87171', icon: XCircle, order: 4 },
  };

  function getMeta(status: string) {
    return STATUS_META[status as StatusKey] ?? STATUS_META.draft;
  }

  // ── Summary counts ────────────────────────────────────────────────────────
  const totalExams     = $derived(exams?.length ?? 0);
  const activeCount    = $derived(exams?.filter(e => e.status === 'active').length ?? 0);
  const scheduledCount = $derived(exams?.filter(e => e.status === 'scheduled').length ?? 0);
  const draftCount     = $derived(exams?.filter(e => e.status === 'draft').length ?? 0);
  const completedCount = $derived(exams?.filter(e => e.status === 'completed').length ?? 0);
  const cancelledCount = $derived(exams?.filter(e => e.status === 'cancelled').length ?? 0);

  const totalStudents = $derived(
    Object.values(statsMap ?? {}).reduce((sum: number, s: any) => sum + (s?.total ?? 0), 0)
  );

  // ── Active filter tab ─────────────────────────────────────────────────────
  type FilterKey = 'all' | StatusKey;
  let activeFilter = $state<FilterKey>('all');

  const FILTER_TABS: { key: FilterKey; label: string; icon: any; count: () => number; showAlways?: boolean }[] = [
    { key: 'all',       label: 'All Exams', icon: ClipboardList, count: () => totalExams, showAlways: true },
    { key: 'active',    label: 'Active', icon: Zap,           count: () => activeCount },
    { key: 'scheduled', label: 'Scheduled', icon: CalendarClock, count: () => scheduledCount },
    { key: 'draft',     label: 'Drafts',    icon: FileEdit,      count: () => draftCount },
    { key: 'completed', label: 'Completed', icon: CheckCircle,   count: () => completedCount },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle,       count: () => cancelledCount },
  ];

  // Sort by status order
  const sortedExams = $derived(
    [...(exams ?? [])]
      .filter(e => activeFilter === 'all' || e.status === activeFilter)
      .sort((a, b) => {
        const orderA = STATUS_META[a.status as StatusKey]?.order ?? 9;
        const orderB = STATUS_META[b.status as StatusKey]?.order ?? 9;
        return orderA - orderB;
      })
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDate(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTime(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(d: string | null | undefined) {
    if (!d) return null;
    return `${formatDate(d)} at ${formatTime(d)}`;
  }

  function getStatusLabel(status: string) {
    return STATUS_META[status as StatusKey]?.label ?? status;
  }

  function getStatusIcon(status: string) {
    return STATUS_META[status as StatusKey]?.icon ?? FileEdit;
  }

  // ── Check if exam has questions ──────────────────────────────────────────
  function hasQuestions(exam: any) {
    const s = (statsMap ?? {})[exam.id];
    return s?.total_questions > 0 || exam._count?.questions > 0 || exam.questions?.length > 0;
  }

  function getQuestionCount(exam: any) {
    const s = (statsMap ?? {})[exam.id];
    if (s?.total_questions !== undefined) return s.total_questions;
    return exam._count?.questions ?? exam.questions?.length ?? 0;
  }

  // ── Check if exam has results ────────────────────────────────────────────
  function hasResults(exam: any) {
    const s = (statsMap ?? {})[exam.id];
    return s && s.submitted > 0;
  }

  // ── Copy link ─────────────────────────────────────────────────────────────
  function copyExamLink(examId: string) {
    const url = `${window.location.origin}/student/exam/${examId}`;
    navigator.clipboard?.writeText(url).then(() => {
      showToast('Exam link copied to clipboard!', 'success');
    }).catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Exam link copied!', 'success');
    });
  }

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }
</script>

<svelte:head><title>My Exams — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<Zap size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">

  <!-- ── Summary cards ──────────────────────────────────────────────────── -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <Activity size={18} />
      </div>
      <div class="summary-body">
        <span class="summary-num">{activeCount}</span>
        <span class="summary-lbl">Active</span>
      </div>
      {#if activeCount > 0}
        <div class="summary-live-dot"></div>
      {/if}
    </div>

    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(37,99,235,0.08); color: #2563eb;">
        <CalendarClock size={18} />
      </div>
      <div class="summary-body">
        <span class="summary-num">{scheduledCount}</span>
        <span class="summary-lbl">Scheduled</span>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-icon" style="background: rgba(100,116,139,0.1); color: #64748b;">
        <FileEdit size={18} />
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
        <span class="summary-lbl">Students</span>
      </div>
    </div>
  </div>

  <!-- ── Exams section header ────────────────────────────────────────────── -->
  <div class="section-header">
    <div class="section-title">
      <ClipboardList size={16} />
      <h2>My Exams</h2>
      <span class="section-count">{sortedExams.length}</span>
    </div>
    <div class="header-actions">
      <a href="/lecturer/exams/archived" class="btn-secondary">
        <Archive size={13} /> Archived
      </a>
      <a href="/lecturer/exams/create" class="btn-primary">
        <PlusCircle size={13} /> Create Exam
      </a>
    </div>
  </div>

  <!-- ── Filter tabs ─────────────────────────────────────────────────────── -->
  <div class="filter-tabs">
    {#each FILTER_TABS as tab}
      {@const count = tab.count()}
      {#if count > 0 || tab.showAlways}
        <button
          type="button"
          class="filter-tab"
          class:active={activeFilter === tab.key}
          class:tab-active={tab.key === 'active'}
          class:tab-scheduled={tab.key === 'scheduled'}
          class:tab-draft={tab.key === 'draft'}
          class:tab-completed={tab.key === 'completed'}
          class:tab-cancelled={tab.key === 'cancelled'}
          onclick={() => (activeFilter = tab.key)}
        >
          <tab.icon size={13} strokeWidth={2} />
          {tab.label}
          <span class="tab-count">{count}</span>
        </button>
      {/if}
    {/each}
  </div>

  <!-- ── Exam grid ────────────────────────────────────────────────────────── -->
  {#if sortedExams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><BookOpen size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">
        {activeFilter === 'all' ? 'No exams yet' : `No ${activeFilter} exams`}
      </p>
      <p class="empty-sub">
        {activeFilter === 'all'
          ? 'Create your first exam to get started.'
          : `You have no exams with status "${getStatusLabel(activeFilter)}".`}
      </p>
      {#if activeFilter === 'all'}
        <a href="/lecturer/exams/create" class="btn-primary">
          <PlusCircle size={14} /> Create Exam
        </a>
      {:else}
        <button type="button" class="btn-ghost" onclick={() => (activeFilter = 'all')}>
          View all exams
        </button>
      {/if}
    </div>
  {:else}
    <div class="exam-grid">
      {#each sortedExams as exam (exam.id)}
        {@const meta = getMeta(exam.status)}
        {@const s    = (statsMap ?? {})[exam.id]}
        {@const hasQ = hasQuestions(exam)}
        {@const qCount = getQuestionCount(exam)}
        {@const hasR = hasResults(exam)}
        {@const StatusIcon = getStatusIcon(exam.status)}
        {@const marksPerQuestion = exam.totalMarks && exam.questionsToPresent ? (exam.totalMarks / exam.questionsToPresent) : 0}
        
        <div class="exam-card" class:is-active={exam.status === 'active'} class:is-cancelled={exam.status === 'cancelled'}>

          {#if exam.status === 'active'}
            <div class="card-accent"></div>
          {/if}

          <div class="card-top">
            <span class="course-badge">{exam.course?.code ?? exam.courseCode}</span>
            <span class="status-pill" style="background:{meta.bg}; color:{meta.color};">
              <span class="status-pip" style="background:{meta.dot};"></span>
              {meta.label}
              <StatusIcon size={11} style="margin-left:2px;" />
            </span>
          </div>

          <h3 class="exam-title">{exam.title}</h3>

          <!-- Exam Details Row -->
          <div class="exam-meta-row">
            <span class="meta-chip"><Timer size={11} /> {exam.durationMinutes}m</span>
            <span class="meta-chip"><Award size={11} /> {exam.totalMarks} marks</span>
            <span class="meta-chip"><Scale size={11} /> {exam.passMark} pass</span>
            {#if exam.questionsToPresent}
              <span class="meta-chip"><HelpCircle size={11} /> {exam.questionsToPresent} Qs</span>
            {/if}
            {#if marksPerQuestion > 0}
              <span class="meta-chip"><TrendingUp size={11} /> {marksPerQuestion.toFixed(1)} ea</span>
            {/if}
          </div>

          <!-- Schedule -->
          {#if exam.scheduledStart}
            <div class="schedule-row">
              <span class="schedule-label">
                {exam.status === 'active' ? 'Started' : 'Scheduled'}
              </span>
              <span class="schedule-val">
                <Calendar size={11} style="display:inline;vertical-align:middle;margin-right:4px;" />
                {formatDateTime(exam.scheduledStart)}
              </span>
            </div>
          {/if}

          <!-- Question Status -->
          <div class="question-status">
            {#if hasQ}
              <span class="status-badge ready">
                <CheckCircle size={12} /> {qCount} question{qCount !== 1 ? 's' : ''}
              </span>
            {:else}
              <span class="status-badge missing">
                <AlertCircle size={12} /> No questions
                <a href="/lecturer/exams/{exam.id}/questions" class="add-questions-link">Add</a>
              </span>
            {/if}
          </div>

          <!-- Stats -->
          {#if s && s.total > 0}
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
              <AlertCircle size={12} /> No attempts
            </div>
          {/if}

          <!-- Actions -->
          <div class="card-actions">
            <a href="/lecturer/exams/{exam.id}/questions" class="action-btn">
              <HelpCircle size={13} /> Questions
            </a>
            <a href="/lecturer/results/{exam.id}" class="action-btn" class:disabled={!hasR}>
              <BarChart2 size={13} /> Results
            </a>
            <a href="/lecturer/exams/{exam.id}" class="action-btn outline">
              Manage <ChevronRight size={12} />
            </a>
            {#if exam.status === 'draft'}
              <a href="/lecturer/exams/{exam.id}/edit" class="action-btn outline">
                <Edit size={13} />
              </a>
            {/if}
            <button 
              class="action-btn outline" 
              onclick={() => copyExamLink(exam.id)}
              title="Copy student access link"
            >
              <Link2 size={13} />
            </button>
            {#if exam.status === 'active' && hasR}
              <a href="/lecturer/exams/{exam.id}/monitor" class="action-btn outline">
                <Activity size={13} />
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- ── Quick Actions ────────────────────────────────────────────────────── -->
  <div class="quick-actions">
    <h3>Quick Actions</h3>
    <div class="quick-grid">
      <a href="/lecturer/exams/create" class="quick-card">
        <PlusCircle size={20} />
        <span>New Exam</span>
      </a>
      <a href="/lecturer/exams/drafts" class="quick-card">
        <FileEdit size={20} />
        <span>My Drafts</span>
      </a>
      <a href="/lecturer/exams/archived" class="quick-card">
        <Archive size={20} />
        <span>Archived</span>
      </a>
      <a href="/lecturer/results" class="quick-card">
        <BarChart2 size={20} />
        <span>Results</span>
      </a>
    </div>
  </div>

</div>

<style>
  :root {
    --lc-soft: rgba(99,102,241,0.08);
    --lc-500: #6366f1;
    --lc-600: #4f46e5;
    --lc-700: #4338ca;
  }

  .page {
    padding: 2rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  @media (min-width: 1024px) { .page { padding: 2rem 2.5rem; } }

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

  /* ── Summary cards ────────────────────────────────────────────────────── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.875rem;
  }
  @media (max-width: 768px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) { .summary-grid { grid-template-columns: 1fr 1fr; } }

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
    border-color: rgba(79,70,229,0.3);
    box-shadow: 0 2px 12px rgba(79,70,229,0.06);
  }
  .summary-icon {
    width: 38px; height: 38px; border-radius: 0.625rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .summary-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .summary-num  { font-size: 1.35rem; font-weight: 900; color: var(--color-text); line-height: 1; letter-spacing: -0.03em; }
  .summary-lbl  { font-size: 0.68rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
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

  /* ── Section header ───────────────────────────────────────────────────── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    flex-wrap: wrap;
  }
  .section-title {
    display: flex; align-items: center; gap: 0.5rem; color: var(--color-text);
  }
  .section-title h2 { font-size: 0.95rem; font-weight: 700; margin: 0; }
  .section-count {
    font-size: 0.7rem; font-weight: 700;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); padding: 0.1rem 0.5rem; border-radius: 999px;
  }

  .header-actions {
    display: flex; gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* ── Buttons ────────────────────────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .btn-primary:hover {
    background: var(--lc-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(79,70,229,0.3);
  }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    color: var(--color-text);
    cursor: pointer; font-family: inherit;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }

  /* ── Filter tabs ──────────────────────────────────────────────────────── */
  .filter-tabs {
    display: flex; gap: 0.375rem; flex-wrap: wrap;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.375rem;
  }

  .filter-tab {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.45rem 0.875rem;
    border-radius: 0.5rem;
    border: none; background: none; cursor: pointer;
    font-size: 0.78rem; font-weight: 600;
    color: var(--color-muted); font-family: inherit;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .filter-tab:hover { background: var(--color-bg); color: var(--color-text); }
  .filter-tab.active {
    background: var(--lc-soft);
    color: var(--lc-600);
    font-weight: 700;
  }
  .filter-tab.active.tab-active    { background: rgba(22,163,74,0.1);  color: #16a34a; }
  .filter-tab.active.tab-scheduled { background: rgba(37,99,235,0.08); color: #2563eb; }
  .filter-tab.active.tab-draft     { background: rgba(100,116,139,0.1);color: #64748b; }
  .filter-tab.active.tab-completed { background: rgba(124,58,237,0.08); color: #7c3aed; }
  .filter-tab.active.tab-cancelled { background: rgba(220,38,38,0.08); color: #dc2626; }

  .tab-count {
    font-size: 0.62rem; font-weight: 800;
    padding: 0.05rem 0.35rem; border-radius: 999px;
    background: var(--color-border);
    color: var(--color-muted);
    transition: background 0.15s, color 0.15s;
  }
  .filter-tab.active .tab-count {
    background: currentColor;
    color: #fff;
    opacity: 0.9;
  }

  /* ── Exam grid ────────────────────────────────────────────────────────── */
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1rem;
  }

  /* ── Exam card ────────────────────────────────────────────────────────── */
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
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }
  .exam-card.is-active {
    border-color: rgba(79,70,229,0.35);
    box-shadow: 0 0 0 3px rgba(79,70,229,0.06);
  }
  .exam-card.is-cancelled {
    border-left: 3px solid #dc2626;
  }
  .card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--lc-600), var(--lc-500), #818cf8);
  }
  .card-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px; letter-spacing: 0.04em;
  }
  .status-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem;
    border-radius: 999px; text-transform: capitalize; white-space: nowrap;
  }
  .status-pip { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .exam-title {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .exam-meta-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .meta-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 600; padding: 0.2rem 0.55rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 999px; color: var(--color-muted);
  }
  .schedule-row {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border);
  }
  .schedule-label { font-size: 0.65rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .schedule-val   { font-size: 0.75rem; font-weight: 600; color: var(--color-text); }

  /* Question Status */
  .question-status { margin-top: -0.25rem; }
  .status-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }
  .status-badge.ready {
    background: rgba(22,163,74,0.08); color: #16a34a;
  }
  .status-badge.missing {
    background: rgba(220,38,38,0.08); color: #dc2626;
  }
  .add-questions-link {
    margin-left: 0.3rem;
    color: var(--lc-600);
    text-decoration: none;
    font-weight: 700;
  }
  .add-questions-link:hover {
    text-decoration: underline;
  }

  .stats-row {
    display: flex; align-items: center;
    background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.625rem; overflow: hidden;
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
    background: var(--color-bg); border-radius: 0.45rem; border: 1px solid var(--color-border);
  }
  .card-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: auto; padding-top: 0.25rem; }
  .action-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: background 0.15s, opacity 0.15s; white-space: nowrap;
  }
  .action-btn:hover { background: var(--lc-700); }
  .action-btn.disabled { opacity: 0.5; pointer-events: none; cursor: not-allowed; }
  .action-btn.outline {
    background: transparent; border: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .action-btn.outline:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  /* ── Empty state ──────────────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
    background: var(--color-surface); border: 1.5px dashed var(--color-border);
    border-radius: 0.875rem;
  }
  .empty-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--lc-soft); border: 1px solid rgba(79,70,229,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600); margin-bottom: 0.25rem;
  }
  .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub   { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  /* ── Quick Actions ────────────────────────────────────────────────────── */
  .quick-actions { margin-top: 0.5rem; }
  .quick-actions h3 {
    font-size: 0.8rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
    margin: 0 0 0.75rem;
  }
  .quick-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
  }
  .quick-card {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    color: var(--color-text);
    text-decoration: none;
    font-weight: 600; font-size: 0.82rem;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  .quick-card:hover {
    border-color: var(--lc-600);
    box-shadow: 0 2px 12px rgba(79,70,229,0.06);
    transform: translateY(-1px);
    color: var(--lc-600);
  }
  .quick-card svg { color: var(--lc-600); }

  /* ── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .exam-grid { grid-template-columns: 1fr; }
    .header-actions { width: 100%; }
    .header-actions .btn-primary,
    .header-actions .btn-secondary { flex: 1; justify-content: center; }
    .section-header { flex-direction: column; align-items: stretch; }
  }

  @media (max-width: 480px) {
    .filter-tabs { flex-direction: column; }
    .filter-tab { justify-content: center; }
    .quick-grid { grid-template-columns: 1fr 1fr; }
  }
</style>