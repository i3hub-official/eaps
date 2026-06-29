<!-- src/routes/lecturer/exams/active/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Zap, Clock, Users, FileText, Activity,
    ChevronRight, Eye, Link2, AlertCircle,
    CheckCircle, Calendar, Award, HelpCircle,
    Timer, TrendingUp, Scale, BarChart2,
    ShieldCheck, PlusCircle
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  
  // Safely access data with defaults
  const exams = data?.exams ?? [];
  const statsMap = data?.statsMap ?? {};
  const activeCount = data?.activeCount ?? 0;
  const liveSessions = data?.liveSessions ?? 0;
  const totalStudents = data?.totalStudents ?? 0;

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
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
    const stats = statsMap[exam?.id] || {};
    return stats?.total || 0;
  }

  function getProgress(exam: any) {
    const stats = statsMap[exam?.id] || {};
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.submitted / stats.total) * 100);
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

  // Safe calculation of total violations with null check
  const totalViolations = $derived(
    Object.values(statsMap || {}).reduce((acc: number, s: any) => acc + (s?.violations || 0), 0)
  );
</script>

<svelte:head><title>Active Exams — MOUAU eTest</title></svelte:head>

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
  <!-- Header -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <div class="header-badge live">
          <div class="live-dot"></div>
          <span>Live</span>
        </div>
        <h1>Active Exams</h1>
        <p class="subtitle">{activeCount} active exam{activeCount !== 1 ? 's' : ''} • {liveSessions} students currently taking exams</p>
      </div>
      <div class="header-actions">
        <a href="/lecturer/exams" class="btn-secondary">
          <Eye size={14} /> All Exams
        </a>
        <a href="/lecturer/exams/create" class="btn-primary">
          <PlusCircle size={14} /> Create Exam
        </a>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card live">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <Zap size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{activeCount}</span>
        <span class="stat-label">Active Exams</span>
      </div>
      <div class="live-indicator"></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <Activity size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{liveSessions}</span>
        <span class="stat-label">Live Students</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalStudents}</span>
        <span class="stat-label">Total Enrolled</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <ShieldCheck size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalViolations}</span>
        <span class="stat-label">Total Violations</span>
      </div>
    </div>
  </div>

  <!-- Exams List -->
  {#if !exams || exams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><Zap size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No active exams</p>
      <p class="empty-sub">Exams that are currently running will appear here.</p>
      <a href="/lecturer/exams/scheduled" class="btn-secondary">
        View Scheduled Exams
      </a>
    </div>
  {:else}
    <div class="exams-grid">
      {#each exams as exam}
        {@const stats = statsMap[exam.id] || {}}
        {@const progress = getProgress(exam)}
        {@const hasQ = getQuestionCount(exam) > 0}
        
        <div class="exam-card live">
          <div class="live-badge">
            <div class="live-dot-small"></div>
            LIVE
          </div>

          <div class="card-top">
            <span class="course-badge">{exam.course?.code}</span>
            <span class="exam-time">
              <Clock size={11} />
              Started {formatDateTime(exam.scheduledStart)}
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
          </div>

          <!-- Progress -->
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">Progress</span>
              <span class="progress-value">{progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:{progress}%"></div>
            </div>
            <div class="progress-stats">
              <span class="stat-chip">
                <CheckCircle size={10} /> {stats?.submitted || 0} submitted
              </span>
              <span class="stat-chip">
                <Activity size={10} /> {stats?.inProgress || 0} in progress
              </span>
              <span class="stat-chip">
                <Clock size={10} /> {stats?.notStarted || 0} not started
              </span>
            </div>
          </div>

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
            {#if stats?.violations > 0}
              <span class="status-badge violation">
                <ShieldCheck size={12} /> {stats.violations} violations
              </span>
            {/if}
          </div>

          <div class="exam-actions">
            <a href={`/lecturer/exams/${exam.id}/monitor`} class="action-btn primary">
              <Activity size={13} /> Monitor
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

  @keyframes live-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

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
    letter-spacing: 0.05em; padding: 0.2rem 0.6rem;
    background: rgba(22,163,74,0.1); color: #16a34a;
    border-radius: 999px;
    margin-bottom: 0.5rem;
  }
  .header-badge.live { background: rgba(22,163,74,0.12); color: #16a34a; }
  .live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #22c55e;
    animation: live-pulse 1.5s ease-in-out infinite;
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
    position: relative;
    overflow: hidden;
  }
  .stat-card.live { border-color: rgba(22,163,74,0.3); }

  .live-indicator {
    position: absolute; top: 0; right: 0;
    width: 4px; height: 100%;
    background: #22c55e;
    animation: live-pulse 2s ease-in-out infinite;
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
    position: relative;
  }
  .exam-card:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }
  .exam-card.live {
    border-color: rgba(22,163,74,0.3);
    border-left: 3px solid #22c55e;
  }

  .live-badge {
    position: absolute; top: 0; right: 0;
    padding: 0.2rem 0.6rem;
    background: #22c55e; color: white;
    font-size: 0.6rem; font-weight: 800;
    border-radius: 0 0.5rem 0 0.5rem;
    letter-spacing: 0.04em;
    display: flex; align-items: center; gap: 0.3rem;
  }
  .live-dot-small {
    width: 4px; height: 4px; border-radius: 50%;
    background: white;
    animation: live-pulse 1s ease-in-out infinite;
  }

  .card-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 0.5rem;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .exam-time {
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

  .progress-section {
    background: var(--color-bg);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
  }

  .progress-header {
    display: flex; justify-content: space-between; font-size: 0.7rem;
    margin-bottom: 0.3rem;
  }
  .progress-label { font-weight: 600; color: var(--color-muted); }
  .progress-value { font-weight: 800; color: var(--color-text); }

  .progress-track {
    height: 4px; background: var(--color-border); border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.4rem;
  }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a);
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .progress-stats {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }
  .stat-chip {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.6rem; font-weight: 600; color: var(--color-muted);
  }

  .question-status {
    display: flex; gap: 0.4rem; flex-wrap: wrap;
  }
  .question-status .status-badge {
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    border-radius: 999px;
    display: inline-flex; align-items: center; gap: 0.3rem;
  }
  .question-status .status-badge.ready {
    background: rgba(22,163,74,0.08); color: #16a34a;
  }
  .question-status .status-badge.missing {
    background: rgba(220,38,38,0.08); color: #dc2626;
  }
  .question-status .status-badge.violation {
    background: rgba(220,38,38,0.08); color: #dc2626;
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