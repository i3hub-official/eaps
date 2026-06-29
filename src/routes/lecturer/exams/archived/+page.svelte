<!-- src/routes/lecturer/exams/archived/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { 
    Archive, Calendar, Clock, Users, 
    ChevronRight, Eye, RotateCcw, Trash2,
    AlertCircle, CheckCircle, BookOpen, FileText,
    XCircle, BarChart2
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { archived, statsMap, cancelledCount, completedCount, totalArchived } = data;

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

  function formatDateFull(d: string | null | undefined) {
    if (!d) return 'Not scheduled';
    return new Date(d).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getQuestionCount(exam: any) {
    return exam._count?.questions || 0;
  }

  function getStudentCount(exam: any) {
    const stats = (statsMap ?? {})[exam.id];
    return stats?.total || 0;
  }

  function getStatusLabel(status: string) {
    const labels = {
      cancelled: 'Cancelled',
      completed: 'Completed'
    };
    return labels[status] || status;
  }

  function getStatusColor(status: string) {
    const colors = {
      cancelled: 'bg-red-50 text-red-600 border-red-200',
      completed: 'bg-blue-50 text-blue-600 border-blue-200'
    };
    return colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  }

  function getStatusIcon(status: string) {
    return status === 'cancelled' ? XCircle : CheckCircle;
  }

  let filterStatus = $state<'all' | 'cancelled' | 'completed'>('all');

  const filteredExams = $derived(
    archived.filter(e => filterStatus === 'all' || e.status === filterStatus)
  );

  // ── Restore exam (unarchive) ─────────────────────────────────────────────
  async function restoreExam(examId: string) {
    if (!confirm('Restore this exam from archive? It will be moved back to drafts.')) return;
    
    try {
      const response = await fetch(`/api/lecturer/exams/${examId}/restore`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showToast('Exam restored successfully!', 'success');
        window.location.reload();
      } else {
        showToast('Failed to restore exam', 'warn');
      }
    } catch {
      showToast('An error occurred', 'warn');
    }
  }

  // ── Permanently delete exam ──────────────────────────────────────────────
  async function deleteExamPermanently(examId: string) {
    if (!confirm('⚠️ Permanently delete this exam? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/lecturer/exams/${examId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showToast('Exam deleted permanently', 'success');
        window.location.reload();
      } else {
        showToast('Failed to delete exam', 'warn');
      }
    } catch {
      showToast('An error occurred', 'warn');
    }
  }
</script>

<svelte:head><title>Archived Exams — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<Archive size={13} />{/if}
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
          <Archive size={16} />
          <span>Archive</span>
        </div>
        <h1>Archived Exams</h1>
        <p class="subtitle">{totalArchived} archived exam{totalArchived !== 1 ? 's' : ''}</p>
      </div>
      <a href="/lecturer/exams" class="btn-secondary">
        <Eye size={14} /> View All Exams
      </a>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <XCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{cancelledCount}</span>
        <span class="stat-label">Cancelled</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{completedCount}</span>
        <span class="stat-label">Completed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(100,116,139,0.1); color: #64748b;">
        <FileText size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">
          {archived.reduce((acc, e) => acc + getQuestionCount(e), 0)}
        </span>
        <span class="stat-label">Total Questions</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">
          {archived.reduce((acc, e) => acc + getStudentCount(e), 0)}
        </span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
  </div>

  <!-- Filter Tabs -->
  <div class="filter-tabs">
    <button 
      class="filter-tab" 
      class:active={filterStatus === 'all'}
      onclick={() => filterStatus = 'all'}
    >
      All ({totalArchived})
    </button>
    <button 
      class="filter-tab" 
      class:active={filterStatus === 'cancelled'}
      class:tab-cancelled={filterStatus === 'cancelled'}
      onclick={() => filterStatus = 'cancelled'}
    >
      <XCircle size={13} /> Cancelled ({cancelledCount})
    </button>
    <button 
      class="filter-tab" 
      class:active={filterStatus === 'completed'}
      class:tab-completed={filterStatus === 'completed'}
      onclick={() => filterStatus = 'completed'}
    >
      <CheckCircle size={13} /> Completed ({completedCount})
    </button>
  </div>

  <!-- Archived List -->
  {#if filteredExams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><Archive size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No archived exams</p>
      <p class="empty-sub">
        {filterStatus === 'all' 
          ? 'Exams that are cancelled or completed will appear here.'
          : `No ${filterStatus} exams in archive.`}
      </p>
      <a href="/lecturer/exams" class="btn-secondary">
        View Active Exams
      </a>
    </div>
  {:else}
    <div class="exams-grid">
      {#each filteredExams as exam}
        {@const statusIcon = getStatusIcon(exam.status)}
        
        <div class="exam-card" class:is-cancelled={exam.status === 'cancelled'}>
          <div class="card-top">
            <div class="card-left">
              <span class="course-badge">{exam.course?.code}</span>
              <span class="status-badge {getStatusColor(exam.status)}">
                <statusIcon size={11} />
                {getStatusLabel(exam.status)}
              </span>
            </div>
            <span class="archive-date">
              <Clock size={11} />
              {formatDate(exam.updatedAt)}
            </span>
          </div>
          
          <h3 class="exam-title">{exam.title}</h3>
          <p class="exam-course">{exam.course?.title}</p>
          
          <div class="exam-meta">
            <span class="meta-item">
              <FileText size={12} /> {getQuestionCount(exam)} questions
            </span>
            <span class="meta-item">
              <Users size={12} /> {getStudentCount(exam)} students
            </span>
            {#if exam.scheduledStart}
              <span class="meta-item">
                <Calendar size={12} /> {formatDate(exam.scheduledStart)}
              </span>
            {/if}
            {#if exam.scheduledEnd}
              <span class="meta-item">
                <Clock size={12} /> {formatDate(exam.scheduledEnd)}
              </span>
            {/if}
          </div>

          {#if statsMap[exam.id]?.submitted > 0}
            <div class="exam-stats">
              <div class="stat-row">
                <span class="stat-label-small">Submitted</span>
                <span class="stat-value-small">{statsMap[exam.id].submitted}</span>
              </div>
              <div class="stat-divider-small"></div>
              <div class="stat-row">
                <span class="stat-label-small">Avg Score</span>
                <span class="stat-value-small">{statsMap[exam.id].avgScore}%</span>
              </div>
            </div>
          {/if}

          <div class="exam-actions">
            <button 
              class="action-btn restore" 
              onclick={() => restoreExam(exam.id)}
              title="Restore from archive"
            >
              <RotateCcw size={14} /> Restore
            </button>
            <a href={`/lecturer/exams/${exam.id}`} class="action-btn outline">
              View <ChevronRight size={12} />
            </a>
            <button 
              class="action-btn danger" 
              onclick={() => deleteExamPermanently(exam.id)}
              title="Permanently delete"
            >
              <Trash2 size={14} />
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
  }
  .filter-tab:hover { background: var(--color-bg); color: var(--color-text); }
  .filter-tab.active { background: var(--lc-soft); color: var(--lc-600); font-weight: 700; }
  .filter-tab.tab-cancelled.active { background: rgba(220,38,38,0.08); color: #dc2626; }
  .filter-tab.tab-completed.active { background: rgba(37,99,235,0.08); color: #2563eb; }

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
  .exam-card.is-cancelled {
    border-left: 3px solid #dc2626;
  }

  .card-top {
    display: flex; justify-content: space-between; align-items: center;
  }

  .card-left {
    display: flex; align-items: center; gap: 0.5rem;
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
  }

  .bg-red-50 { background: rgba(220,38,38,0.08); color: #dc2626; border: 1px solid rgba(220,38,38,0.15); }
  .bg-blue-50 { background: rgba(37,99,235,0.08); color: #2563eb; border: 1px solid rgba(37,99,235,0.15); }
  .bg-gray-50 { background: rgba(100,116,139,0.08); color: #64748b; border: 1px solid rgba(100,116,139,0.15); }

  .archive-date {
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
    display: flex; gap: 0.75rem; flex-wrap: wrap;
  }

  .meta-item {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }

  .exam-stats {
    display: flex; align-items: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem;
  }

  .stat-row {
    display: flex; flex-direction: column; align-items: center;
    flex: 1; gap: 0.1rem;
  }

  .stat-label-small {
    font-size: 0.55rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .stat-value-small {
    font-size: 0.85rem; font-weight: 800; color: var(--color-text);
  }

  .stat-divider-small {
    width: 1px; height: 24px; background: var(--color-border);
  }

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
  .action-btn.restore {
    background: rgba(22,163,74,0.1); color: #16a34a;
  }
  .action-btn.restore:hover { background: #16a34a; color: white; }
  .action-btn.danger {
    background: rgba(220,38,38,0.08); color: #dc2626;
  }
  .action-btn.danger:hover { background: #dc2626; color: white; }
  .action-btn.outline {
    background: transparent; border: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .action-btn.outline:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  @media (max-width: 768px) {
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .exams-grid { grid-template-columns: 1fr; }
    .card-top { flex-wrap: wrap; gap: 0.5rem; }
  }
</style>