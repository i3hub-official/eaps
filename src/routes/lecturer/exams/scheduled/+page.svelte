<!-- src/routes/lecturer/exams/scheduled/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    CalendarClock, Clock, Users, FileText,
    ChevronRight, Eye, Edit, Link2,
    AlertCircle, CheckCircle, Calendar,
    Award, HelpCircle, Timer, PlusCircle, Scale,
    Zap, BarChart2
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  
  // SAFE: Use defaults for all data
  const exams = data?.exams ?? [];
  const statsMap = data?.statsMap ?? {};
  const scheduledCount = data?.scheduledCount ?? 0;
  const upcomingCount = data?.upcomingCount ?? 0;

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return 'Not scheduled';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getQuestionCount(exam: any) {
    return exam?._count?.questions || 0;
  }

  function getStudentCount(exam: any) {
    const stats = (statsMap ?? {})[exam?.id] || {};
    return stats?.total || 0;
  }

  function getDaysUntil(date: string | null | undefined) {
    if (!date) return null;
    const now = new Date();
    const target = new Date(date);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getStatusText(days: number | null) {
    if (days === null) return 'No date set';
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  }

  function getStatusColor(days: number | null) {
    if (days === null) return 'var(--color-muted)';
    if (days < 0) return '#dc2626';
    if (days <= 3) return '#d97706';
    return '#16a34a';
  }

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

  // Calculate total questions and students safely
  const totalQuestions = $derived(
    exams.reduce((acc, e) => acc + getQuestionCount(e), 0)
  );
  
  const totalStudents = $derived(
    exams.reduce((acc, e) => acc + getStudentCount(e), 0)
  );
</script>

<svelte:head><title>Scheduled Exams — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<CalendarClock size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <div class="header-badge">
          <CalendarClock size={16} />
          <span>Scheduled</span>
        </div>
        <h1>Scheduled Exams</h1>
        <p class="subtitle">{scheduledCount} scheduled exam{scheduledCount !== 1 ? 's' : ''} • {upcomingCount} upcoming in 7 days</p>
      </div>
      <div class="header-actions">
        <a href="/lecturer/exams" class="btn-secondary">
          <Eye size={14} /> All Exams
        </a>
        <a href="/lecturer/exams/create" class="btn-primary">
          <FileText size={14} /> Create Exam
        </a>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
        <CalendarClock size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{scheduledCount}</span>
        <span class="stat-label">Total Scheduled</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <Zap size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{upcomingCount}</span>
        <span class="stat-label">Upcoming (7 days)</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(100,116,139,0.1); color: #64748b;">
        <FileText size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalQuestions}</span>
        <span class="stat-label">Total Questions</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalStudents}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
  </div>

  <!-- Exams List -->
  {#if !exams || exams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><CalendarClock size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No scheduled exams</p>
      <p class="empty-sub">Create and schedule an exam to see it here.</p>
      <a href="/lecturer/exams/create" class="btn-primary">
        <PlusCircle size={14} /> Create Exam
      </a>
    </div>
  {:else}
    <div class="exams-grid">
      {#each exams as exam}
        {@const daysUntil = getDaysUntil(exam.scheduledStart)}
        {@const statusColor = getStatusColor(daysUntil)}
        {@const statusText = getStatusText(daysUntil)}
        {@const hasQ = getQuestionCount(exam) > 0}
        {@const studentCount = getStudentCount(exam)}
        
        <div class="exam-card" class:is-urgent={daysUntil !== null && daysUntil <= 3 && daysUntil >= 0}>
          <div class="card-top">
            <div class="card-left">
              <span class="course-badge">{exam.course?.code}</span>
              <span class="status-badge" style="background:{statusColor}15; color:{statusColor}; border-color:{statusColor}30;">
                <Clock size={10} />
                {statusText}
              </span>
            </div>
            <span class="exam-date">
              <Calendar size={11} />
              {formatDate(exam.scheduledStart)}
            </span>
          </div>
          
          <h3 class="exam-title">{exam.title}</h3>
          <p class="exam-course">{exam.course?.title}</p>
          
          <div class="exam-meta">
            <span class="meta-item">
              <Timer size={12} /> {exam.durationMinutes}m
            </span>
            <span class="meta-item">
              <Award size={12} /> {exam.totalMarks} marks
            </span>
            <span class="meta-item">
              <Scale size={12} /> {exam.passMark} pass
            </span>
            <span class="meta-item">
              <FileText size={12} /> {getQuestionCount(exam)} Qs
            </span>
            <span class="meta-item">
              <Users size={12} /> {studentCount} students
            </span>
          </div>

          <!-- Schedule Time -->
          {#if exam.scheduledStart}
            <div class="schedule-time">
              <Clock size={12} />
              <span>{formatDateTime(exam.scheduledStart)}</span>
            </div>
          {/if}

          <!-- Question Status -->
          <div class="question-status">
            {#if hasQ}
              <span class="status-badge ready">
                <CheckCircle size={12} /> Questions ready
              </span>
            {:else}
              <span class="status-badge missing">
                <AlertCircle size={12} /> No questions
                <a href="/lecturer/exams/{exam.id}/questions" class="add-link">Add</a>
              </span>
            {/if}
            {#if studentCount > 0}
              <span class="status-badge info">
                <Users size={12} /> {studentCount} enrolled
              </span>
            {/if}
          </div>

          <div class="exam-actions">
            <a href={`/lecturer/exams/${exam.id}`} class="action-btn primary">
              Manage <ChevronRight size={12} />
            </a>
            <a href={`/lecturer/exams/${exam.id}/questions`} class="action-btn outline">
              <HelpCircle size={13} />
            </a>
            <button 
              class="action-btn outline" 
              onclick={() => copyExamLink(exam.id)}
              title="Copy link"
            >
              <Link2 size={13} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
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

  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: center;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); transform: translateY(-1px); }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .stat-content {
    display: flex; flex-direction: column;
  }

  .stat-value {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.6rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

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

  .empty-title {
    font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0;
  }
  .empty-sub {
    font-size: 0.82rem; color: var(--color-muted); margin: 0;
  }

  .exams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1rem;
  }

  .exam-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.125rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  .exam-card:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }
  .exam-card.is-urgent {
    border-left: 3px solid #d97706;
  }

  .card-top {
    display: flex; justify-content: space-between; align-items: center;
  }

  .card-left {
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .status-badge {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.5rem;
    border-radius: 999px;
    border: 1px solid;
  }

  .exam-date {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.65rem; font-weight: 600; color: var(--color-muted);
  }

  .exam-title {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  .exam-course {
    font-size: 0.78rem; color: var(--color-muted); margin: -0.25rem 0 0;
  }

  .exam-meta {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .meta-item {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }

  .schedule-time {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.6rem;
    background: var(--color-bg); border-radius: 0.4rem;
    font-size: 0.75rem; font-weight: 600; color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .question-status {
    display: flex; gap: 0.4rem; flex-wrap: wrap;
  }
  .question-status .status-badge {
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    border: none;
  }
  .question-status .status-badge.ready {
    background: rgba(22,163,74,0.08); color: #16a34a;
  }
  .question-status .status-badge.missing {
    background: rgba(220,38,38,0.08); color: #dc2626;
  }
  .question-status .status-badge.info {
    background: rgba(99,102,241,0.08); color: #4f46e5;
  }

  .add-link {
    margin-left: 0.2rem;
    color: var(--lc-600);
    text-decoration: none;
    font-weight: 700;
  }
  .add-link:hover { text-decoration: underline; }

  .exam-actions {
    display: flex; gap: 0.4rem; margin-top: auto; padding-top: 0.25rem;
  }

  .action-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
    border: none;
  }
  .action-btn.primary {
    background: var(--lc-600); color: white;
  }
  .action-btn.primary:hover { background: var(--lc-700); }
  .action-btn.outline {
    background: transparent; border: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .action-btn.outline:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  @media (max-width: 768px) {
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .exams-grid { grid-template-columns: 1fr; }
    .header-actions { display: flex; flex-wrap: wrap; }
    .header-actions .btn-primary,
    .header-actions .btn-secondary { flex: 1; justify-content: center; }
  }
</style>