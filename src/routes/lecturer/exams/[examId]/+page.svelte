<!-- src/routes/lecturer/exams/[examId]/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import {
    ChevronLeft, FileText, Users, Clock, BarChart2,
    Edit, Trash2, Copy, Link2, Eye, Settings,
    AlertCircle, CheckCircle, XCircle, Activity,
    Calendar, Award, HelpCircle, TrendingUp,
    PlusCircle, Download, Printer, Send, ShieldCheck, Zap, Loader2
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Local, client-controlled mirror of exam status so the UI updates
  // the instant an action succeeds — no waiting on a full page reload.
  let exam = $state(data.exam);
  let stats = $derived(data.stats);
  let recentSubmissions = $derived(data.recentSubmissions);
  let violationStats = $derived(data.violationStats);
  let questionCount = $derived(data.questionCount);
  let sessionCount = $derived(data.sessionCount);

  // Keep the local exam mirror in sync whenever fresh server data arrives
  // (e.g. on navigation back to this page).
  $effect(() => {
    exam = data.exam;
  });

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

  const statusColor = {
    draft: 'text-slate-500 bg-slate-100',
    scheduled: 'text-blue-600 bg-blue-50',
    active: 'text-green-600 bg-green-50',
    completed: 'text-purple-600 bg-purple-50',
    cancelled: 'text-red-600 bg-red-50',
  };

  const statusLabel = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  // ── Toast system ──────────────────────────────────────────────────────────
  // Toasts are only ever pushed explicitly from action callbacks below —
  // never from a reactive $effect watching `form` — so a single submit
  // can never produce more than one toast no matter how many times
  // surrounding state re-renders.
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  function copyExamLink() {
    const url = `${window.location.origin}/student/exam/${exam.id}`;
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

  // ── Action state ──────────────────────────────────────────────────────────
  let publishing = $state(false);
  let activating = $state(false);
  let completing = $state(false);
  let cancelling = $state(false);

  const canPublish  = $derived(exam.status === 'draft');
  const canActivate = $derived(exam.status === 'scheduled');
  const canComplete = $derived(exam.status === 'active');
  const canCancel   = $derived(exam.status === 'draft' || exam.status === 'scheduled');

  // ── Confirm dialogs ───────────────────────────────────────────────────────
  function confirmPublish() {
    return confirm(
      `Publish "${exam.title}"?\n\nThis moves the exam from Draft to Scheduled and locks in the question count (${questionCount} question${questionCount === 1 ? '' : 's'}). Students will be able to see it is scheduled.`
    );
  }

  function confirmActivate() {
    return confirm(
      `Activate "${exam.title}" now?\n\nStudents who are eligible will be able to start the exam immediately. This cannot be undone.`
    );
  }

  function confirmComplete() {
    return confirm(
      `End "${exam.title}" now?\n\nThis will close the exam to new entries and force-submit any sessions still in progress. This cannot be undone.`
    );
  }

  function confirmCancel() {
    return confirm(
      `Cancel "${exam.title}"?\n\nThis exam will be marked as cancelled and removed from student dashboards. This cannot be undone.`
    );
  }

  // ── Generic submit handler factory ───────────────────────────────────────
  // Each action: confirms → sets its own loading flag → submits →
  // on success updates the local `exam.status` optimistically (instant UI)
  // and shows exactly one toast → on failure shows exactly one error toast.
  function makeHandler(opts: {
    confirmFn: () => boolean;
    setLoading: (v: boolean) => void;
    nextStatus?: typeof exam.status;
    successMessage: string;
  }) {
    return () => {
      if (!opts.confirmFn()) {
        return ({ cancel }: { cancel: () => void }) => cancel();
      }
      opts.setLoading(true);
      return async ({ result }: { result: { type: string; data?: any } }) => {
        opts.setLoading(false);
        if (result.type === 'success') {
          if (opts.nextStatus) exam = { ...exam, status: opts.nextStatus };
          showToast(result.data?.message ?? opts.successMessage, 'success');
        } else if (result.type === 'failure') {
          showToast(result.data?.error ?? 'Action failed.', 'warn', 4000);
        } else if (result.type === 'error') {
          showToast('Something went wrong. Please try again.', 'warn', 4000);
        }
      };
    };
  }

  const handlePublish = makeHandler({
    confirmFn: confirmPublish,
    setLoading: (v) => (publishing = v),
    nextStatus: 'scheduled',
    successMessage: 'Exam published successfully!',
  });

  const handleActivate = makeHandler({
    confirmFn: confirmActivate,
    setLoading: (v) => (activating = v),
    nextStatus: 'active',
    successMessage: 'Exam activated successfully!',
  });

  const handleComplete = makeHandler({
    confirmFn: confirmComplete,
    setLoading: (v) => (completing = v),
    nextStatus: 'completed',
    successMessage: 'Exam completed successfully!',
  });

  const handleCancel = makeHandler({
    confirmFn: confirmCancel,
    setLoading: (v) => (cancelling = v),
    nextStatus: 'cancelled',
    successMessage: 'Exam cancelled successfully!',
  });
</script>

<svelte:head><title>{exam.title} — MOUAU eTest</title></svelte:head>

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
    <div class="header-top">
      <a href="/lecturer/exams" class="back-link">
        <ChevronLeft size={14} /> Back to Exams
      </a>
      <div class="header-actions">
        <button class="btn-ghost" onclick={copyExamLink}>
          <Link2 size={14} /> Copy Link
        </button>
        <a href={`/lecturer/exams/${exam.id}/edit`} class="btn-secondary">
          <Edit size={14} /> Edit
        </a>

        {#if canPublish}
          <form method="POST" action="?/publish" use:enhance={handlePublish}>
            <button class="btn-publish" disabled={publishing || questionCount === 0}
              title={questionCount === 0 ? 'Add at least one question before publishing' : 'Publish this exam'}>
              {#if publishing}
                <Loader2 size={14} class="spin" /> Publishing…
              {:else}
                <Send size={14} /> Publish Exam
              {/if}
            </button>
          </form>
        {/if}

        {#if canActivate}
          <form method="POST" action="?/activate" use:enhance={handleActivate}>
            <button class="btn-activate" disabled={activating}>
              {#if activating}
                <Loader2 size={14} class="spin" /> Activating…
              {:else}
                <Activity size={14} /> Activate Now
              {/if}
            </button>
          </form>
        {/if}

        {#if canComplete}
          <form method="POST" action="?/complete" use:enhance={handleComplete}>
            <button class="btn-complete" disabled={completing}>
              {#if completing}
                <Loader2 size={14} class="spin" /> Completing…
              {:else}
                <CheckCircle size={14} /> End Exam
              {/if}
            </button>
          </form>
        {/if}

        {#if canCancel}
          <form method="POST" action="?/cancel" use:enhance={handleCancel}>
            <button class="btn-danger" disabled={cancelling}>
              {#if cancelling}
                <Loader2 size={14} class="spin" />
              {:else}
                <Trash2 size={14} />
              {/if}
              Cancel
            </button>
          </form>
        {/if}
      </div>
    </div>

    <div class="header-main">
      <div>
        <div class="exam-badges">
          <span class="course-badge">{exam.course?.code}</span>
          <span class="status-badge {statusColor[exam.status]}">
            {statusLabel[exam.status]}
          </span>
        </div>
        <h1>{exam.title}</h1>
        <p class="exam-subtitle">{exam.course?.title}</p>
      </div>
      <div class="header-stats">
        <div class="header-stat">
          <span class="stat-number">{questionCount}</span>
          <span class="stat-label">Questions</span>
        </div>
        <div class="stat-divider"></div>
        <div class="header-stat">
          <span class="stat-number">{sessionCount}</span>
          <span class="stat-label">Students</span>
        </div>
        <div class="stat-divider"></div>
        <div class="header-stat">
          <span class="stat-number">{exam.totalMarks}</span>
          <span class="stat-label">Total Marks</span>
        </div>
      </div>
    </div>

    {#if canPublish && questionCount === 0}
      <div class="publish-warning" transition:fly={{ y: -6, duration: 180 }}>
        <AlertCircle size={14} />
        This exam is still a draft and has no questions. Add questions before publishing.
      </div>
    {/if}
  </div>

  <!-- Quick Stats Grid -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.total}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.submitted}</span>
        <span class="stat-label">Submitted</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <Activity size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.in_progress}</span>
        <span class="stat-label">In Progress</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(124,58,237,0.1); color: #7c3aed;">
        <BarChart2 size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.avg_score}%</span>
        <span class="stat-label">Average Score</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <ShieldCheck size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{violationStats.total_violations}</span>
        <span class="stat-label">Total Violations</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.pass_count}/{stats.fail_count}</span>
        <span class="stat-label">Pass/Fail</span>
      </div>
    </div>
  </div>

  <!-- Details Grid -->
  <div class="details-grid">
    <div class="details-card">
      <h3>Exam Details</h3>
      <div class="details-list">
        <div class="detail-row">
          <span class="detail-label">Duration</span>
          <span class="detail-value">{exam.durationMinutes} minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Marks</span>
          <span class="detail-value">{exam.totalMarks}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Pass Mark</span>
          <span class="detail-value">{exam.passMark} ({Math.round((exam.passMark / exam.totalMarks) * 100)}%)</span>
        </div>
        {#if exam.questionsToPresent}
          <div class="detail-row">
            <span class="detail-label">Questions Per Student</span>
            <span class="detail-value">{exam.questionsToPresent}</span>
          </div>
        {/if}
        {#if exam.marksPerQuestion}
          <div class="detail-row">
            <span class="detail-label">Marks Per Question</span>
            <span class="detail-value">{exam.marksPerQuestion.toFixed(2)}</span>
          </div>
        {/if}
        <div class="detail-row">
          <span class="detail-label">Semester</span>
          <span class="detail-value">Semester {exam.semester}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Session</span>
          <span class="detail-value">{exam.session}</span>
        </div>
      </div>
    </div>

    <div class="details-card">
      <h3>Schedule</h3>
      {#if exam.scheduledStart}
        <div class="schedule-item">
          <div class="schedule-icon"><Calendar size={16} /></div>
          <div>
            <div class="schedule-label">Starts</div>
            <div class="schedule-value">{formatDateTime(exam.scheduledStart)}</div>
          </div>
        </div>
      {/if}
      {#if exam.scheduledEnd}
        <div class="schedule-item">
          <div class="schedule-icon"><Calendar size={16} /></div>
          <div>
            <div class="schedule-label">Ends</div>
            <div class="schedule-value">{formatDateTime(exam.scheduledEnd)}</div>
          </div>
        </div>
      {/if}
      {#if exam.allowLateEntry}
        <div class="schedule-item">
          <div class="schedule-icon"><Clock size={16} /></div>
          <div>
            <div class="schedule-label">Late Entry</div>
            <div class="schedule-value">Allowed up to {exam.lateEntryMinutes} minutes after start</div>
          </div>
        </div>
      {/if}
      <div class="schedule-item">
        <div class="schedule-icon"><ShieldCheck size={16} /></div>
        <div>
          <div class="schedule-label">Randomization</div>
          <div class="schedule-value">
            {#if exam.randomizeQuestions && exam.randomizeOptions}
              Questions & Options
            {:else if exam.randomizeQuestions}
              Questions Only
            {:else if exam.randomizeOptions}
              Options Only
            {:else}
              None
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="details-card actions-card">
      <h3>Quick Actions</h3>
      <div class="action-grid">
        <a href={`/lecturer/exams/${exam.id}/questions`} class="action-item">
          <HelpCircle size={18} />
          <span>Manage Questions</span>
        </a>
        <a href={`/lecturer/results/by-exam/${exam.id}`} class="action-item">
          <BarChart2 size={18} />
          <span>View Results</span>
        </a>
        <a href={`/lecturer/exams/${exam.id}/ca`} class="action-item">
          <FileText size={18} />
          <span>CA Management</span>
        </a>
        <button class="action-item" onclick={copyExamLink}>
          <Link2 size={18} />
          <span>Copy Exam Link</span>
        </button>
        {#if exam.status === 'active'}
          <a href={`/invigilator/monitor/${exam.id}`} class="action-item">
            <Eye size={18} />
            <span>Monitor Exam</span>
          </a>
        {/if}
        <a href={`/lecturer/exams/${exam.id}/export`} class="action-item">
          <Download size={18} />
          <span>Export Data</span>
        </a>
      </div>
    </div>

    {#if recentSubmissions.length > 0}
      <div class="details-card submissions-card">
        <h3>Recent Submissions</h3>
        <div class="submissions-list">
          {#each recentSubmissions as submission}
            <div class="submission-item">
              <div class="submission-info">
                <span class="submission-name">{submission.studentName}</span>
                <span class="submission-email">{submission.studentEmail}</span>
              </div>
              <div class="submission-meta">
                <span class="submission-score" class:pass={submission.score >= 40}>
                  {submission.score}%
                </span>
                <span class="submission-time">{formatDateTime(submission.submittedAt)}</span>
              </div>
            </div>
          {/each}
        </div>
        {#if stats.submitted > 10}
          <a href={`/lecturer/results/by-exam/${exam.id}`} class="view-all-link">
            View all {stats.submitted} submissions →
          </a>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes spin { to { transform: rotate(360deg); } }
  :global(.spin) { animation: spin 1s linear infinite; }

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

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .header-actions {
    display: flex; gap: 0.5rem;
    flex-wrap: wrap;
  }

  .header-actions form { display: inline-flex; margin: 0; }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    background: transparent; border: 1px solid var(--color-border);
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;
    color: var(--color-text); cursor: pointer;
    transition: all 0.15s;
  }
  .btn-ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    background: var(--lc-soft); border: 1px solid var(--lc-600);
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;
    color: var(--lc-600); text-decoration: none; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-secondary:hover { background: var(--lc-600); color: white; }

  .btn-publish {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.9rem;
    background: #4f46e5; border: 1px solid #4f46e5;
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700;
    color: white; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-publish:hover:not(:disabled) { background: #4338ca; border-color: #4338ca; }
  .btn-publish:disabled { opacity: 0.55; cursor: not-allowed; }

  .btn-activate {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.9rem;
    background: #16a34a; border: 1px solid #16a34a;
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700;
    color: white; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-activate:hover:not(:disabled) { background: #15803d; border-color: #15803d; }
  .btn-activate:disabled { opacity: 0.55; cursor: not-allowed; }

  .btn-complete {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.9rem;
    background: #7c3aed; border: 1px solid #7c3aed;
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700;
    color: white; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-complete:hover:not(:disabled) { background: #6d28d9; border-color: #6d28d9; }
  .btn-complete:disabled { opacity: 0.55; cursor: not-allowed; }

  .btn-danger {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    background: rgba(220,38,38,0.1); border: 1px solid #dc2626;
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;
    color: #dc2626; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-danger:hover:not(:disabled) { background: #dc2626; color: white; }
  .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }

  .publish-warning {
    display: flex; align-items: center; gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.625rem 0.875rem;
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: 0.6rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: #92400e;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 1rem;
  }

  .exam-badges {
    display: flex; gap: 0.5rem; margin-bottom: 0.5rem;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .status-badge {
    font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .exam-subtitle {
    font-size: 0.875rem; color: var(--color-muted); margin: 0;
  }

  .header-stats {
    display: flex; align-items: center; gap: 1.5rem;
    flex-shrink: 0;
  }

  .header-stat {
    display: flex; flex-direction: column; align-items: center;
  }

  .stat-number {
    font-size: 1.25rem; font-weight: 800; color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.65rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  .stat-divider {
    width: 1px; height: 2.5rem; background: var(--color-border);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex; align-items: center; gap: 0.75rem;
    transition: border-color 0.15s;
  }
  .stat-card:hover { border-color: rgba(79,70,229,0.3); }

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

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .details-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.25rem;
  }

  .details-card h3 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    margin: 0 0 1rem;
  }

  .details-list {
    display: flex; flex-direction: column; gap: 0.5rem;
  }

  .detail-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .detail-row:last-child { border-bottom: none; }

  .detail-label {
    font-size: 0.75rem; color: var(--color-muted);
  }

  .detail-value {
    font-size: 0.75rem; font-weight: 600; color: var(--color-text);
  }

  .schedule-item {
    display: flex; gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .schedule-item:last-child { border-bottom: none; }

  .schedule-icon {
    width: 32px; height: 32px; border-radius: 0.4rem;
    background: var(--lc-soft); color: var(--lc-600);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .schedule-label {
    font-size: 0.65rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .schedule-value {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }

  .actions-card {
    grid-column: 1 / -1;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .action-item {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    text-decoration: none; color: var(--color-text);
    font-size: 0.8rem; font-weight: 600;
    transition: all 0.15s;
    cursor: pointer;
  }
  .action-item:hover {
    border-color: var(--lc-600);
    color: var(--lc-600);
    background: var(--lc-soft);
  }
  .action-item svg { color: var(--lc-600); flex-shrink: 0; }

  .submissions-card {
    grid-column: 1 / -1;
  }

  .submissions-list {
    display: flex; flex-direction: column; gap: 0.5rem;
  }

  .submission-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .submission-info {
    display: flex; flex-direction: column;
  }

  .submission-name {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }

  .submission-email {
    font-size: 0.7rem; color: var(--color-muted);
  }

  .submission-meta {
    display: flex; align-items: center; gap: 1rem;
  }

  .submission-score {
    font-size: 0.9rem; font-weight: 800; color: #dc2626;
  }
  .submission-score.pass { color: #16a34a; }

  .submission-time {
    font-size: 0.7rem; color: var(--color-muted);
  }

  .view-all-link {
    display: block; margin-top: 0.75rem;
    text-align: center; font-size: 0.8rem; font-weight: 600;
    color: var(--lc-600); text-decoration: none;
  }
  .view-all-link:hover { text-decoration: underline; }

  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .details-grid { grid-template-columns: 1fr; }
    .header-main { flex-direction: column; }
    .header-stats { width: 100%; justify-content: space-around; }
    .header-top { flex-direction: column; gap: 0.5rem; align-items: stretch; }
    .header-actions { flex-wrap: wrap; }
    .action-grid { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .action-grid { grid-template-columns: 1fr; }
  }
</style>