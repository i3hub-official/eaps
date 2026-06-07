<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();
  const { user, exams, results, enrolled } = data;

  // ── Modal states ───────────────────────────────────────────────────────────
  let showEnrollmentModal = $state(false);
  let showVerifyModal = $state(false);
  let pendingExamId = $state<string | null>(null);

  // ── Toast notification state ───────────────────────────────────────────────
  let showToast = $state(false);
  let toastMessage = $state('');
  let toastType = $state<'success' | 'info' | 'warning'>('success');

  function fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtRelative(d: Date | null | undefined) {
    if (!d) return '';
    const diff = new Date(d).getTime() - Date.now();
    const mins = Math.floor(Math.abs(diff) / 60_000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (diff < 0)   return 'ended';
    if (mins < 60)  return `in ${mins}m`;
    if (hrs  < 24)  return `in ${hrs}h`;
    return `in ${days}d`;
  }

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', scheduled: 'Upcoming', active: 'Live',
    completed: 'Ended', cancelled: 'Cancelled',
  };

  const GRADE_COLOR: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#9333ea', E: '#dc2626', F: '#dc2626',
  };

  // return all names of the user except the first one, which is often the surname in many cultures
    const fullName    = user.fullName.trim().split(/\s+/).slice(0).join(' ') || user.fullName;
    const matricNumber = user.matricNumber ?? '—';
  const liveExams  = exams.filter(e => e.status === 'active');
  const upcoming   = exams.filter(e => e.status === 'scheduled');
  const otherExams = exams.filter(e => e.status !== 'active' && e.status !== 'scheduled');
  const avgScore   = results.length
    ? results.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / results.length
    : 0;

  // Handle URL params for redirects from exam guard
  onMount(() => {
    const url = new URL(window.location.href);
    const enroll = url.searchParams.get('enroll');
    const verify = url.searchParams.get('verify');
    const exam = url.searchParams.get('exam');

    if (enroll === 'required') {
      pendingExamId = exam;
      showEnrollmentModal = true;
      window.history.replaceState({}, '', '/student');
    } else if (verify === 'required') {
      pendingExamId = exam;
      showVerifyModal = true;
      window.history.replaceState({}, '', '/student');
    }
  });

  function handleEnrollmentComplete() {
    showEnrollmentModal = false;
    showToast = true;
    toastType = 'success';
    toastMessage = 'Face enrollment completed! You can now verify to enter exams.';
    setTimeout(() => showToast = false, 5000);
    // Refresh page data to update enrolled status
    window.location.reload();
  }

  function handleVerified() {
    showVerifyModal = false;
    if (pendingExamId) {
      window.location.href = `/student/exam/${pendingExamId}`;
    }
    pendingExamId = null;
  }

  function enterExam(examId: string) {
    if (!enrolled) {
      pendingExamId = examId;
      showEnrollmentModal = true;
      return;
    }
    pendingExamId = examId;
    showVerifyModal = true;
  }

  function closeToast() {
    showToast = false;
  }
</script>

<svelte:head><title>Dashboard — MOUAU eTest</title></svelte:head>

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<!-- MODALS - Rendered at top level, no wrapper divs                             -->
<!-- ═══════════════════════════════════════════════════════════════════════════ -->

<FaceEnrollmentModal 
  bind:open={showEnrollmentModal}
  onClose={() => { showEnrollmentModal = false; pendingExamId = null; }}
  onComplete={handleEnrollmentComplete}
/>

<FaceVerifyModal
  bind:open={showVerifyModal}
  examId={pendingExamId ?? ''}
  onClose={() => { showVerifyModal = false; pendingExamId = null; }}
  onVerified={handleVerified}
/>

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<!-- TOAST - Fixed position, high z-index                                        -->
<!-- ═══════════════════════════════════════════════════════════════════════════ -->

{#if showToast}
  <div class="toast-container">
    <div class="toast" class:toast-{toastType} role="alert">
      <div class="toast-icon">
        {#if toastType === 'success'}
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M16.25 6.25L8.125 14.375L3.75 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {:else if toastType === 'info'}
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 6.25V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="10" cy="13.75" r="0.625" fill="currentColor"/>
          </svg>
        {:else}
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 6.25V10.625" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="10" cy="13.75" r="0.625" fill="currentColor"/>
          </svg>
        {/if}
      </div>
      <span class="toast-message">{toastMessage}</span>
      <button class="toast-close" onclick={closeToast} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
          <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<!-- MAIN CONTENT - Normal flow, no special handling needed                      -->
<!-- The modal's internal backdrop covers this when open                       -->
<!-- ═══════════════════════════════════════════════════════════════════════════ -->

<div class="page">
  <div class="content">

    <!-- ── Greeting ───────────────────────────────────────────────────────── -->
    <div class="greeting-row">
      <div>
        <h1><span class="accent">{fullName}</span></h1>
        <h2><span class="sub">{matricNumber}</span></h2>
        <p class="sub">
          {#if liveExams.length > 0}
            <span class="sub-urgent">{liveExams.length} exam{liveExams.length > 1 ? 's' : ''} live right now — enter immediately</span>
          {:else if upcoming.length > 0}
            {upcoming.length} exam{upcoming.length > 1 ? 's' : ''} scheduled · Stay ready
          {:else}
            No exams scheduled yet
          {/if}
        </p>
      </div>

      {#if !enrolled}
        <button class="enroll-alert" onclick={() => showEnrollmentModal = true}>
          <span class="enroll-alert-dot"></span>
          <div>
            <strong>Face verification required</strong>
            <span>Complete before sitting any exam</span>
          </div>
          <svg class="enroll-arrow" viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {:else}
        <div class="enrolled-badge">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M8 1.5L13 4.5V8C13 11.5 10.5 13.5 8 14C5.5 13.5 3 11.5 3 8V4.5L8 1.5Z"
              stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" stroke-width="1.3"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Face Verified & Enrolled
        </div>
      {/if}
    </div>

    <!-- ── Stats ──────────────────────────────────────────────────────────── -->
    <div class="stats">
      <div class="stat">
        <span class="stat-n">{exams.length}</span>
        <span class="stat-l">Exams</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <span class="stat-n" class:stat-live={liveExams.length > 0}>{liveExams.length}</span>
        <span class="stat-l">Live now</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <span class="stat-n">{upcoming.length}</span>
        <span class="stat-l">Upcoming</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <span class="stat-n">{results.length}</span>
        <span class="stat-l">Results</span>
      </div>
      {#if results.length > 0}
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-n">{avgScore.toFixed(0)}%</span>
          <span class="stat-l">Avg score</span>
        </div>
      {/if}
    </div>

    <!-- ── Live exams ─────────────────────────────────────────────────────── -->
    {#if liveExams.length > 0}
      <section>
        <div class="sec-head">
          <span class="live-dot"></span>
          <h2>Live Now</h2>
        </div>
        <div class="card-grid">
          {#each liveExams as exam}
            <div class="card card--live">
              <div class="card-header">
                <span class="code-tag">{exam.course.code}</span>
                <span class="live-tag">LIVE</span>
              </div>
              <h3>{exam.title}</h3>
              <div class="card-meta">
                <span>{exam.durationMinutes} min</span>
                <span class="meta-sep">·</span>
                <span>{exam.totalMarks} marks</span>
                <span class="meta-sep">·</span>
                <span>Pass {exam.passMark}</span>
              </div>
              <button class="card-btn card-btn--enter" onclick={() => enterExam(exam.id)}>
                Enter Exam
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Upcoming exams ───────────────────────────────────────────────────── -->
    {#if upcoming.length > 0}
      <section>
        <div class="sec-head"><h2>Upcoming</h2></div>
        <div class="card-grid">
          {#each upcoming as exam}
            <div class="card card--upcoming">
              <div class="card-header">
                <span class="code-tag">{exam.course.code}</span>
                <span class="time-tag">{fmtRelative(exam.scheduledStart)}</span>
              </div>
              <h3>{exam.title}</h3>
              <div class="card-meta">
                <span>{exam.durationMinutes} min</span>
                <span class="meta-sep">·</span>
                <span>{exam.totalMarks} marks</span>
              </div>
              {#if exam.scheduledStart}
                <p class="card-date">{fmtDate(exam.scheduledStart)}</p>
              {/if}
              <span class="card-btn card-btn--waiting">Not started</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── All other exams ────────────────────────────────────────────────── -->
    {#if otherExams.length > 0}
      <section>
        <div class="sec-head"><h2>All Exams</h2></div>
        <div class="list-card">
          {#each otherExams as exam}
            <div class="list-row">
              <span class="code-tag sm">{exam.course.code}</span>
              <div class="list-info">
                <span class="list-title">{exam.title}</span>
                {#if exam.scheduledStart}
                  <span class="list-date">{fmtDate(exam.scheduledStart)}</span>
                {/if}
              </div>
              <span class="status-tag status-{exam.status}">{STATUS_LABEL[exam.status]}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Empty ──────────────────────────────────────────────────────────── -->
    {#if exams.length === 0}
      <div class="empty">
        <svg viewBox="0 0 48 48" fill="none" width="40" height="40" opacity=".25">
          <rect x="8" y="6" width="32" height="38" rx="3" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 18h16M16 26h16M16 34h8" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p class="empty-title">No exams yet</p>
        <p class="empty-sub">Assigned exams will appear here when scheduled by your lecturer.</p>
      </div>
    {/if}

    <!-- ── Results ────────────────────────────────────────────────────────── -->
    {#if results.length > 0}
      <section>
        <div class="sec-head">
          <h2>Results</h2>
          <span class="sec-count">{results.length}</span>
        </div>
        <div class="results-card">
          <div class="results-head">
            <span>Course</span>
            <span>Exam</span>
            <span>Score</span>
            <span>Grade</span>
            <span>Result</span>
          </div>
          {#each results as r}
            <div class="result-row">
              <span class="r-course">{r.exam.course.code}</span>
              <span class="r-title">{r.exam.title}</span>
              <span class="r-score">{Number(r.percentage ?? 0).toFixed(1)}%</span>
              <span class="r-grade" style="color:{GRADE_COLOR[r.grade ?? 'F']}">{r.grade ?? '—'}</span>
              <span class="pass-tag" class:pass={r.passed} class:fail={!r.passed}>
                {r.passed ? 'Pass' : 'Fail'}
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Verification CTA ───────────────────────────────────────────────── -->
    {#if !enrolled}
      <div class="verify-cta">
        <div class="verify-cta-inner">
          <div class="verify-cta-icon">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M12 3C9.243 3 7 5.243 7 8v2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V12a2 2 0 00-2-2h-2V8c0-2.757-2.243-5-5-5z"
                stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div class="verify-cta-copy">
            <p class="verify-cta-title">Face verification is required to sit any exam</p>
            <p class="verify-cta-sub">MOUAU eTest uses face recognition to maintain exam integrity. Enroll once and you're set for all future exams.</p>
          </div>
          <button class="verify-cta-btn" onclick={() => showEnrollmentModal = true}>Complete Verification</button>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Toast Container ──────────────────────────────────────────────────── */
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 10000;
    pointer-events: none;
  }

  .toast-container > * {
    pointer-events: auto;
  }

  @media (max-width: 640px) {
    .toast-container {
      top: auto;
      bottom: 1rem;
      right: 1rem;
      left: 1rem;
    }
  }

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--color-surface);
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
    border: 1px solid var(--color-border);
    animation: toast-slide-in 0.3s ease;
    max-width: 380px;
  }

  @keyframes toast-slide-in {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }

  .toast-success { border-left: 4px solid #16a34a; }
  .toast-success .toast-icon { color: #16a34a; }
  .toast-info { border-left: 4px solid #3b82f6; }
  .toast-info .toast-icon { color: #3b82f6; }
  .toast-warning { border-left: 4px solid #f59e0b; }
  .toast-warning .toast-icon { color: #f59e0b; }

  .toast-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--color-text);
  }

  .toast-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    padding: 0.25rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .toast-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  /* ── Page ─────────────────────────────────────────────────────────────── */
  .page {
    min-height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .content {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* ── Greeting ─────────────────────────────────────────────────────────── */
  .greeting-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    text-size: clamp(0.9rem, 2vw, 1rem);
  }

  h1 {
    font-size: clamp(1.4rem, 3vw, 1.75rem);
    font-weight: 800;
    letter-spacing: -.03em;
    line-height: 1.2;
  }
  .accent { color: #16a34a; }

  .sub {
    margin-top: .375rem;
    font-size: .875rem;
    color: var(--color-muted);
  }
  .sub-urgent {
    color: #dc2626;
    font-weight: 600;
  }
  :global(.dark) .sub-urgent { color: #f87171; }

  /* Enroll alert */
  .enroll-alert {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .75rem 1rem;
    background: #fefce8;
    border: 1px solid #fde047;
    border-radius: .75rem;
    text-decoration: none;
    transition: border-color .15s, box-shadow .15s, transform .15s;
    max-width: 360px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    width: 100%;
  }
  .enroll-alert:hover {
    border-color: #facc15;
    box-shadow: 0 2px 8px rgba(234,179,8,.2);
    transform: translateY(-1px);
  }
  .enroll-alert:active {
    transform: translateY(0);
  }
  .enroll-alert-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #ca8a04; flex-shrink: 0;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: .6; transform: scale(.85); }
  }
  .enroll-alert strong {
    display: block;
    font-size: .8rem; font-weight: 700; color: #78350f;
  }
  .enroll-alert span {
    font-size: .72rem; color: #92400e;
  }
  .enroll-arrow { color: #ca8a04; flex-shrink: 0; margin-left: auto; }
  :global(.dark) .enroll-alert {
    background: rgba(234,179,8,.08);
    border-color: rgba(234,179,8,.25);
  }
  :global(.dark) .enroll-alert strong { color: #fde68a; }
  :global(.dark) .enroll-alert span   { color: #fcd34d; }
  :global(.dark) .enroll-arrow        { color: #fbbf24; }

  /* Enrolled badge */
  .enrolled-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: .45rem .875rem;
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 999px;
    font-size: .75rem;
    font-weight: 600;
    color: #16a34a;
    align-self: flex-start;
  }
  :global(.dark) .enrolled-badge {
    background: rgba(34,197,94,.1);
    border-color: rgba(34,197,94,.3);
    color: #4ade80;
  }

  /* ── Stats ────────────────────────────────────────────────────────────── */
  .stats {
    display: flex;
    align-items: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    padding: 0 .5rem;
    overflow-x: auto;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem 1.5rem;
    flex: 1;
    min-width: 72px;
  }
  .stat-n {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1;
    color: var(--color-text);
  }
  .stat-live { color: #16a34a; }
  .stat-l {
    font-size: .65rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-top: .2rem;
  }
  .stat-sep {
    width: 1px;
    height: 32px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  /* ── Section head ─────────────────────────────────────────────────────── */
  section { display: flex; flex-direction: column; gap: .875rem; }

  .sec-head {
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  h2 {
    font-size: .72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--color-muted);
  }
  .sec-count {
    font-size: .65rem;
    font-weight: 700;
    padding: .1rem .45rem;
    background: var(--color-border);
    border-radius: 999px;
    color: var(--color-muted);
  }

  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
    animation: pulse-live 1.5s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.5); }
    70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }

  /* ── Exam cards ───────────────────────────────────────────────────────── */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
    gap: .875rem;
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: .75rem;
    transition: box-shadow .15s;
  }
  .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }

  .card--live {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,.1);
  }
  .card--upcoming {
    border-style: dashed;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .code-tag {
    font-size: .68rem;
    font-weight: 700;
    padding: .175rem .55rem;
    background: rgba(34,197,94,.1);
    color: #16a34a;
    border-radius: 999px;
  }
  .code-tag.sm { font-size: .62rem; padding: .15rem .45rem; }
  :global(.dark) .code-tag { background: rgba(34,197,94,.15); color: #4ade80; }

  .live-tag {
    font-size: .6rem;
    font-weight: 700;
    letter-spacing: .08em;
    padding: .175rem .55rem;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 999px;
    animation: blink 2s ease-in-out infinite;
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .65; } }
  :global(.dark) .live-tag { background: rgba(34,197,94,.2); color: #4ade80; }

  .time-tag {
    font-size: .65rem;
    font-weight: 600;
    padding: .175rem .55rem;
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 999px;
  }
  :global(.dark) .time-tag { background: rgba(37,99,235,.2); color: #93c5fd; }

  h3 { font-size: .875rem; font-weight: 600; line-height: 1.45; }

  .card-meta {
    display: flex;
    align-items: center;
    gap: .375rem;
    font-size: .75rem;
    color: var(--color-muted);
    flex-wrap: wrap;
  }
  .meta-sep { opacity: .4; }

  .card-date {
    font-size: .72rem;
    color: var(--color-muted);
  }

  /* Card buttons */
  .card-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .375rem;
    padding: .625rem;
    border-radius: .5rem;
    font-size: .825rem;
    font-weight: 600;
    text-decoration: none;
    margin-top: auto;
    transition: all .15s;
    border: none;
    cursor: default;
    font-family: inherit;
  }
  .card-btn--enter {
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    color: white;
    cursor: pointer;
  }
  .card-btn--enter:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(21,128,61,.4);
  }
  .card-btn--enter:active {
    transform: scale(0.98) translateY(0);
  }
  .card-btn--waiting {
    background: var(--color-border);
    color: var(--color-muted);
  }

  /* ── Compact list ─────────────────────────────────────────────────────── */
  .list-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    overflow: hidden;
  }
  .list-row {
    display: flex;
    align-items: center;
    gap: .875rem;
    padding: .875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    transition: background .1s;
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:hover { background: var(--color-bg); }

  .list-info { flex: 1; min-width: 0; }
  .list-title {
    display: block;
    font-size: .875rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .list-date {
    display: block;
    font-size: .72rem;
    color: var(--color-muted);
    margin-top: .15rem;
  }

  .status-tag {
    font-size: .65rem;
    font-weight: 600;
    padding: .175rem .6rem;
    border-radius: 999px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .status-completed { background: var(--color-border); color: var(--color-muted); }
  .status-cancelled { background: #fee2e2; color: #dc2626; }
  .status-draft     { background: var(--color-border); color: var(--color-muted); }
  :global(.dark) .status-cancelled { background: rgba(220,38,38,.15); color: #f87171; }

  /* ── Empty ────────────────────────────────────────────────────────────── */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .75rem;
    padding: 3rem 2rem;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    color: var(--color-muted);
  }
  .empty-title { font-size: .925rem; font-weight: 600; }
  .empty-sub   { font-size: .8rem; max-width: 280px; line-height: 1.65; }

  /* ── Results ──────────────────────────────────────────────────────────── */
  .results-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    overflow: hidden;
  }
  .results-head {
    display: grid;
    grid-template-columns: 72px 1fr 65px 44px 52px;
    gap: 1rem;
    padding: .6rem 1.25rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    font-size: .62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--color-muted);
  }
  .result-row {
    display: grid;
    grid-template-columns: 72px 1fr 65px 44px 52px;
    gap: 1rem;
    align-items: center;
    padding: .875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    transition: background .1s;
  }
  .result-row:last-child { border-bottom: none; }
  .result-row:hover { background: var(--color-bg); }

  .r-course { font-size: .68rem; font-weight: 700; color: #16a34a; }
  :global(.dark) .r-course { color: #4ade80; }
  .r-title  { font-size: .825rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .r-score  { font-size: .875rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .r-grade  { font-size: 1rem; font-weight: 800; }

  .pass-tag {
    font-size: .65rem;
    font-weight: 600;
    padding: .175rem .55rem;
    border-radius: 999px;
    text-align: center;
  }
  .pass-tag.pass { background: #dcfce7; color: #16a34a; }
  .pass-tag.fail { background: #fee2e2; color: #dc2626; }
  :global(.dark) .pass-tag.pass { background: rgba(34,197,94,.15); color: #4ade80; }
  :global(.dark) .pass-tag.fail { background: rgba(220,38,38,.15); color: #f87171; }

  /* ── Verify CTA ───────────────────────────────────────────────────────── */
  .verify-cta {
    border-radius: .875rem;
    overflow: hidden;
    background: linear-gradient(135deg, #051a11 0%, #0a2a1c 100%);
    position: relative;
  }
  .verify-cta::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(34,197,94,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,197,94,.07) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .verify-cta-inner {
    position: relative; z-index: 1;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem 2rem;
    flex-wrap: wrap;
  }
  .verify-cta-icon {
    width: 48px; height: 48px;
    border-radius: 12px;
    background: rgba(34,197,94,.12);
    border: 1px solid rgba(34,197,94,.3);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e; flex-shrink: 0;
  }
  .verify-cta-copy { flex: 1; min-width: 200px; }
  .verify-cta-title {
    font-size: .875rem;
    font-weight: 700;
    color: white;
    margin-bottom: .25rem;
  }
  .verify-cta-sub {
    font-size: .75rem;
    color: rgba(255,255,255,.55);
    line-height: 1.6;
  }
  .verify-cta-btn {
    margin-left: auto;
    white-space: nowrap;
    padding: .75rem 1.5rem;
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    color: white;
    border-radius: .625rem;
    font-size: .875rem;
    font-weight: 600;
    text-decoration: none;
    transition: all .15s;
    box-shadow: 0 4px 12px rgba(21,128,61,.35);
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .verify-cta-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(21,128,61,.5);
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .content  { padding: 1.25rem 1rem 3rem; }
    .stat     { padding: .875rem .875rem; }
    .greeting-row { flex-direction: column; }
    .enroll-alert { max-width: 100%; }
    .results-head,
    .result-row { grid-template-columns: 56px 1fr 56px 36px 46px; gap: .5rem; padding: .75rem .875rem; }
    .verify-cta-inner { flex-direction: column; align-items: flex-start; }
    .verify-cta-btn   { margin-left: 0; width: 100%; text-align: center; }
  }
</style>