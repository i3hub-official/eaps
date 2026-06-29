<!-- src/routes/lecturer/exams/completed/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    CheckCircle, Clock, Users, FileText,
    ChevronRight, Eye, Link2, AlertCircle,
    Calendar, Award, HelpCircle, Timer,
    TrendingUp, Scale, BarChart2, Archive,
    PlusCircle, XCircle, Activity
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { exams, statsMap, completedCount, totalStudents, totalPassed, totalFailed } = data;

  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return 'N/A';
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
    return exam._count?.questions || 0;
  }

  function getStudentCount(exam: any) {
    const stats = (statsMap ?? {})[exam.id];
    return stats?.total || 0;
  }

  function getPassRate(exam: any) {
    const stats = (statsMap ?? {})[exam.id];
    if (!stats || stats.submitted === 0) return 0;
    return Math.round((stats.passCount / stats.submitted) * 100);
  }

  function copyExamLink(examId: string) {
    const url = `${window.location.origin}/student/exam/${examId}`;
    navigator.clipboard?.writeText(url).then(() => {
      showToast('Exam link copied!', 'success');
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

  function archiveExam(examId: string) {
    if (!confirm('Archive this exam? It will be moved to archived exams.')) return;
    showToast('Exam archived!', 'success');
  }
</script>

<svelte:head><title>Completed Exams — MOUAU eTest</title></svelte:head>

<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<CheckCircle size={13} />{/if}
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
          <CheckCircle size={16} />
          <span>Completed</span>
        </div>
        <h1>Completed Exams</h1>
        <p class="subtitle">{completedCount} completed exam{completedCount !== 1 ? 's' : ''} • {totalStudents} students assessed</p>
      </div>
      <div class="header-actions">
        <a href="/lecturer/exams/archived" class="btn-secondary">
          <Archive size={14} /> Archived
        </a>
        <a href="/lecturer/exams/create" class="btn-primary">
          <PlusCircle size={14} /> Create Exam
        </a>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(124,58,237,0.1); color: #7c3aed;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{completedCount}</span>
        <span class="stat-label">Completed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <TrendingUp size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalPassed}</span>
        <span class="stat-label">Passed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <XCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalFailed}</span>
        <span class="stat-label">Failed</span>
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
  {#if exams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><CheckCircle size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No completed exams</p>
      <p class="empty-sub">Exams that have been completed will appear here.</p>
      <a href="/lecturer/exams/scheduled" class="btn-secondary">
        View Scheduled Exams
      </a>
    </div>
  {:else}
    <div class="exams-grid">
      {#each exams as exam}
        {@const stats = (statsMap ?? {})[exam.id]}
        {@const passRate = getPassRate(exam)}
        
        <div class="exam-card">
          <div class="card-top">
            <span class="course-badge">{exam.course?.code}</span>
            <span class="status-badge completed">
              <CheckCircle size={10} />
              Completed
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
              <FileText size={12} /> {getQuestionCount(exam)} Qs
            </span>
            <span class="meta-item">
              <Users size={12} /> {getStudentCount(exam)} students
            </span>
          </div>

          <!-- Schedule Info -->
          {#if exam.scheduledEnd}
            <div class="schedule-info">
              <span class="schedule-label">Ended</span>
              <span class="schedule-value">{formatDateTime(exam.scheduledEnd)}</span>
            </div>
          {/if}

          <!-- Results Summary -->
          {#if stats && stats.submitted > 0}
            <div class="results-summary">
              <div class="result-item">
                <span class="result-label">Avg Score</span>
                <span class="result-value">{stats.avgScore}%</span>
              </div>
              <div class="result-divider"></div>
              <div class="result-item">
                <span class="result-label">Pass Rate</span>
                <span class="result-value" class:high={passRate >= 60} class:low={passRate < 40}>
                  {passRate}%
                </span>
              </div>
              <div class="result-divider"></div>
              <div class="result-item">
                <span class="result-label">Pass/Fail</span>
                <span class="result-value">
                  <span class="pass">{stats.passCount}</span>/
                  <span class="fail">{stats.failCount}</span>
                </span>
              </div>
            </div>
          {:else}
            <div class="no-submissions">
              <AlertCircle size={12} /> No submissions
            </div>
          {/if}

          <div class="exam-actions">
            <a href={`/lecturer/results/${exam.id}`} class="action-btn primary">
              <BarChart2 size={13} /> Results
            </a>
            <a href={`/lecturer/exams/${exam.id}`} class="action-btn outline">
              Manage <ChevronRight size={12} />
            </a>
            <button 
              class="action-btn outline" 
              onclick={() => copyExamLink(exam.id)}
              title="Copy link"
            >
              <Link2 size={13} />
            </button>
            <button 
              class="action-btn outline" 
              onclick={() => archiveExam(exam.id)}
              title="Archive"
            >
              <Archive size={13} />
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
    letter-spacing: 0.05em; color: #7c3aed;
    padding: 0.2rem 0.6rem;
    background: rgba(124,58,237,0.08);
    border-radius: 999px;
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
    transition: all 0.15s;
  }
  .exam-card:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }

  .card-top {
    display: flex; justify-content: space-between; align-items: center;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .status-badge.completed {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(124,58,237,0.08); color: #7c3aed;
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

  .schedule-info {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.35rem 0.6rem;
    background: var(--color-bg); border-radius: 0.4rem;
    border: 1px solid var(--color-border);
    font-size: 0.7rem;
  }
  .schedule-label { font-weight: 600; color: var(--color-muted); }
  .schedule-value { font-weight: 600; color: var(--color-text); }

  .results-summary {
    display: flex; align-items: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem;
  }

  .result-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 0.1rem;
  }
  .result-label {
    font-size: 0.55rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .result-value {
    font-size: 0.85rem; font-weight: 800; color: var(--color-text);
  }
  .result-value.high { color: #16a34a; }
  .result-value.low { color: #dc2626; }

  .result-divider {
    width: 1px; height: 24px; background: var(--color-border);
  }

  .pass { color: #16a34a; }
  .fail { color: #dc2626; }

  .no-submissions {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; color: var(--color-muted);
    padding: 0.3rem 0.6rem;
    background: var(--color-bg); border-radius: 0.4rem;
    border: 1px solid var(--color-border);
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
    .results-summary { flex-wrap: wrap; gap: 0.5rem; }
    .result-divider { display: none; }
  }
</style>