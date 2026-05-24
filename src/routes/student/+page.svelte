<!-- src/routes/student/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { user, exams, results, enrolled } = data;

  function fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtRelative(d: Date | null | undefined) {
    if (!d) return '';
    const diff = new Date(d).getTime() - Date.now();
    const abs  = Math.abs(diff);
    const mins = Math.floor(abs / 60_000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (diff < 0) return 'ended';
    if (mins < 60) return `in ${mins}m`;
    if (hrs < 24)  return `in ${hrs}h`;
    return `in ${days}d`;
  }

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', scheduled: 'Upcoming', active: 'Live Now',
    completed: 'Ended', cancelled: 'Cancelled',
  };

  const GRADE_COLOR: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#9333ea', E: '#dc2626', F: '#dc2626',
  };

  const firstName = user.fullName.split(' ')[1] || user.fullName.split(' ')[0];
  const liveExams = exams.filter(e => e.status === 'active');
  const upcomingExams = exams.filter(e => e.status === 'scheduled');
  const otherExams = exams.filter(e => e.status !== 'active' && e.status !== 'scheduled');
  const avgScore = results.length
    ? results.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / results.length
    : 0;
</script>

<svelte:head><title>Dashboard — MOUAU eTest</title></svelte:head>

<div class="page">

  <!-- ── Top bar ─────────────────────────────────────────────────── -->
  <header class="topbar">
    <div class="topbar-left">
      <div class="brand-mark">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2L17 6V11C17 15.5 13.5 18.5 10 19C6.5 18.5 3 15.5 3 11V6L10 2Z"
            stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M7 10.5L9.5 13L13.5 8" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <p class="brand-name">MOUAU eTest</p>
        <p class="brand-sub">Student Portal</p>
      </div>
    </div>
    <div class="topbar-right">
      <div class="user-chip">
        <div class="user-avatar">{user.fullName[0]}</div>
        <div class="user-info">
          <span class="user-name">{user.fullName.split(' ').slice(0, 2).join(' ')}</span>
          <span class="user-matric">{user.matricNumber ?? user.email}</span>
        </div>
      </div>
      <a href="/logout" class="logout-btn" title="Sign out">
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
          <path d="M13 3h4v14h-4M9 14l4-4-4-4M13 10H3" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>
  </header>

  <div class="content">

    <!-- ── Greeting + status row ──────────────────────────────────── -->
    <div class="greeting-row">
      <div class="greeting-text">
        <h1>Good day, <span class="name-accent">{firstName}</span></h1>
        <p class="greeting-sub">
          {#if liveExams.length > 0}
            You have <strong>{liveExams.length} exam{liveExams.length > 1 ? 's' : ''} live right now</strong> — enter immediately.
          {:else if upcomingExams.length > 0}
            {upcomingExams.length} exam{upcomingExams.length > 1 ? 's' : ''} scheduled. Stay ready.
          {:else}
            No exams scheduled yet. Check back later.
          {/if}
        </p>
      </div>

      <!-- Verification banner -->
      {#if !enrolled}
        <a href="/enroll" class="verify-banner">
          <div class="verify-icon">
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="verify-text">
            <strong>Face verification required</strong>
            <span>Complete enrollment to sit exams</span>
          </div>
          <span class="verify-cta">Enroll now →</span>
        </a>
      {:else}
        <div class="verify-ok">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path d="M10 2L17 6V11C17 15.5 13.5 18.5 10 19C6.5 18.5 3 15.5 3 11V6L10 2Z"
              stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M7 10.5L9.5 13L13.5 8" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Face verified
        </div>
      {/if}
    </div>

    <!-- ── Stats strip ─────────────────────────────────────────────── -->
    <div class="stats-strip">
      <div class="stat">
        <span class="stat-val">{exams.length}</span>
        <span class="stat-lbl">Total exams</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-val {liveExams.length > 0 ? 'live' : ''}">{liveExams.length}</span>
        <span class="stat-lbl">Live now</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-val">{upcomingExams.length}</span>
        <span class="stat-lbl">Upcoming</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-val">{results.length}</span>
        <span class="stat-lbl">Results</span>
      </div>
      {#if results.length > 0}
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-val">{avgScore.toFixed(0)}%</span>
          <span class="stat-lbl">Avg score</span>
        </div>
      {/if}
    </div>

    <!-- ── Live exams (priority) ─────────────────────────────────── -->
    {#if liveExams.length > 0}
      <section>
        <div class="section-head">
          <span class="pulse-dot"></span>
          <h2>Live Now</h2>
        </div>
        <div class="exam-grid">
          {#each liveExams as exam}
            <div class="exam-card live">
              <div class="card-top">
                <span class="course-badge">{exam.course.code}</span>
                <span class="live-chip">● LIVE</span>
              </div>
              <h3>{exam.title}</h3>
              <div class="exam-meta">
                <span>⏱ {exam.durationMinutes} min</span>
                <span>📝 {exam.totalMarks} marks</span>
                <span>Pass: {exam.passMark}</span>
              </div>
              <a href="/exam/{exam.id}" class="exam-btn exam-btn--live">
                {enrolled ? 'Enter Exam →' : 'Verify Face First →'}
              </a>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Upcoming exams ─────────────────────────────────────────── -->
    {#if upcomingExams.length > 0}
      <section>
        <div class="section-head"><h2>Upcoming</h2></div>
        <div class="exam-grid">
          {#each upcomingExams as exam}
            <div class="exam-card upcoming">
              <div class="card-top">
                <span class="course-badge">{exam.course.code}</span>
                <span class="upcoming-chip">{fmtRelative(exam.scheduledStart)}</span>
              </div>
              <h3>{exam.title}</h3>
              <div class="exam-meta">
                <span>⏱ {exam.durationMinutes} min</span>
                <span>📝 {exam.totalMarks} marks</span>
              </div>
              {#if exam.scheduledStart}
                <p class="exam-time">{fmtDate(exam.scheduledStart)}</p>
              {/if}
              <span class="exam-btn exam-btn--waiting">Waiting to start</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Other exams ────────────────────────────────────────────── -->
    {#if otherExams.length > 0}
      <section>
        <div class="section-head"><h2>All Exams</h2></div>
        <div class="exam-list">
          {#each otherExams as exam}
            <div class="exam-row">
              <div class="exam-row-left">
                <span class="course-badge sm">{exam.course.code}</span>
                <div>
                  <p class="exam-row-title">{exam.title}</p>
                  {#if exam.scheduledStart}
                    <p class="exam-row-sub">{fmtDate(exam.scheduledStart)}</p>
                  {/if}
                </div>
              </div>
              <span class="status-pill status-{exam.status}">{STATUS_LABEL[exam.status]}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Empty state ────────────────────────────────────────────── -->
    {#if exams.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 40 40" fill="none" width="40" height="40">
            <rect x="8" y="6" width="24" height="30" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14h12M14 20h12M14 26h7" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="empty-title">No exams yet</p>
        <p class="empty-sub">Your assigned exams will appear here when scheduled.</p>
      </div>
    {/if}

    <!-- ── Results ────────────────────────────────────────────────── -->
    {#if results.length > 0}
      <section>
        <div class="section-head">
          <h2>My Results</h2>
          <span class="section-count">{results.length}</span>
        </div>
        <div class="results-table">
          <div class="results-header">
            <span>Course</span>
            <span>Exam</span>
            <span>Score</span>
            <span>Grade</span>
            <span>Status</span>
          </div>
          {#each results as r}
            <div class="result-row">
              <span class="result-course">{r.exam.course.code}</span>
              <span class="result-title">{r.exam.title}</span>
              <span class="result-score">{Number(r.percentage ?? 0).toFixed(1)}%</span>
              <span class="result-grade" style="color:{GRADE_COLOR[r.grade ?? 'F']}">{r.grade ?? '—'}</span>
              <span class="pass-badge" class:pass={r.passed} class:fail={!r.passed}>
                {r.passed ? 'Pass' : 'Fail'}
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Verification CTA (bottom) ─────────────────────────────── -->
    {#if !enrolled}
      <div class="verify-bottom">
        <div class="verify-bottom-inner">
          <div class="verify-bottom-icon">
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <path d="M12 2C9.243 2 7 4.243 7 7v2H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V11a2 2 0 00-2-2h-2V7c0-2.757-2.243-5-5-5z"
                stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <p class="verify-bottom-title">Face verification is required to sit any exam</p>
            <p class="verify-bottom-sub">
              MOUAU eTest uses face recognition to ensure exam integrity. Enroll once and you're set for all future exams.
            </p>
          </div>
          <a href="/enroll" class="verify-bottom-btn">
            Complete Verification →
          </a>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .page {
    min-height: 100vh;
    background: var(--bg, #f8fafc);
    color: var(--text, #0f172a);
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  /* ── Top bar ──────────────────────────────────────────────────────── */
  .topbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2rem;
    height: 60px;
    background: #051a11;
    border-bottom: 1px solid rgba(34,197,94,.15);
  }
  .topbar-left { display: flex; align-items: center; gap: 10px; }
  .brand-mark {
    width: 32px; height: 32px;
    background: rgba(34,197,94,.12);
    border: 1px solid rgba(34,197,94,.3);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: #22c55e; flex-shrink: 0;
  }
  .brand-mark svg { width: 16px; height: 16px; }
  .brand-name { font-size: 0.875rem; font-weight: 700; color: white; letter-spacing: -.01em; }
  .brand-sub  { font-size: 0.65rem; color: rgba(255,255,255,.4); }

  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .user-chip {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 999px;
    padding: 4px 12px 4px 4px;
  }
  .user-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    background: #15803d; color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
  }
  .user-info { display: flex; flex-direction: column; }
  .user-name   { font-size: 0.75rem; font-weight: 600; color: white; line-height: 1.2; }
  .user-matric { font-size: 0.6rem; color: rgba(255,255,255,.45); line-height: 1.2; }

  .logout-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,.5);
    text-decoration: none; transition: all .15s;
  }
  .logout-btn:hover { background: rgba(220,38,38,.15); border-color: rgba(220,38,38,.3); color: #f87171; }

  /* ── Content ──────────────────────────────────────────────────────── */
  .content {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    display: flex; flex-direction: column; gap: 2rem;
  }

  /* ── Greeting ─────────────────────────────────────────────────────── */
  .greeting-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
  }
  h1 {
    font-size: clamp(1.4rem, 3vw, 1.75rem);
    font-weight: 800;
    letter-spacing: -.03em;
    line-height: 1.2;
  }
  .name-accent { color: #16a34a; }
  .greeting-sub {
    margin-top: .375rem;
    font-size: .875rem;
    color: var(--text-muted, #475569);
    line-height: 1.5;
  }
  .greeting-sub strong { color: var(--text, #0f172a); font-weight: 600; }

  /* Verify banner */
  .verify-banner {
    display: flex; align-items: center; gap: .75rem;
    padding: .75rem 1.25rem;
    background: #fefce8;
    border: 1px solid #fde047;
    border-radius: .75rem;
    text-decoration: none;
    transition: all .15s;
    max-width: 400px;
  }
  .verify-banner:hover { border-color: #facc15; box-shadow: 0 2px 8px rgba(234,179,8,.2); }
  .verify-icon {
    width: 36px; height: 36px; border-radius: 8px;
    background: rgba(234,179,8,.15); color: #ca8a04;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .verify-text { display: flex; flex-direction: column; flex: 1; }
  .verify-text strong { font-size: .8rem; color: #78350f; font-weight: 700; }
  .verify-text span   { font-size: .72rem; color: #92400e; }
  .verify-cta { font-size: .78rem; font-weight: 700; color: #ca8a04; white-space: nowrap; }

  :global(.dark) .verify-banner {
    background: rgba(234,179,8,.08); border-color: rgba(234,179,8,.25);
  }
  :global(.dark) .verify-text strong { color: #fde68a; }
  :global(.dark) .verify-text span   { color: #fcd34d; }
  :global(.dark) .verify-cta { color: #fbbf24; }

  .verify-ok {
    display: inline-flex; align-items: center; gap: 6px;
    padding: .5rem .875rem;
    background: #f0fdf4; border: 1px solid #86efac;
    border-radius: 999px;
    font-size: .78rem; font-weight: 600; color: #16a34a;
    align-self: flex-start;
  }
  :global(.dark) .verify-ok {
    background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.3); color: #4ade80;
  }

  /* ── Stats strip ──────────────────────────────────────────────────── */
  .stats-strip {
    display: flex; align-items: center;
    gap: 0;
    background: var(--bg-card, white);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: .875rem;
    padding: 0 1rem;
    overflow: hidden;
  }
  .stat {
    display: flex; flex-direction: column; align-items: center;
    padding: 1rem 1.5rem; flex: 1;
  }
  .stat-val {
    font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em;
    color: var(--text, #0f172a); line-height: 1;
  }
  .stat-val.live { color: #16a34a; }
  .stat-lbl {
    font-size: .7rem; font-weight: 500;
    color: var(--text-muted, #475569); margin-top: .2rem;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .stat-divider {
    width: 1px; height: 36px;
    background: var(--border, #e2e8f0); flex-shrink: 0;
  }

  /* ── Section heads ────────────────────────────────────────────────── */
  section { display: flex; flex-direction: column; gap: .875rem; }
  .section-head {
    display: flex; align-items: center; gap: .5rem;
  }
  h2 {
    font-size: .8rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .08em;
    color: var(--text-muted, #475569);
  }
  .section-count {
    font-size: .7rem; font-weight: 700;
    padding: .15rem .5rem;
    background: var(--border, #e2e8f0);
    border-radius: 999px; color: var(--text-muted, #475569);
  }
  .pulse-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 0 rgba(34,197,94,.4);
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.5); }
    70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }

  /* ── Exam grid (cards) ────────────────────────────────────────────── */
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: .875rem;
  }
  .exam-card {
    background: var(--bg-card, white);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: .875rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: .75rem;
    transition: box-shadow .15s;
  }
  .exam-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.07); }
  .exam-card.live {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,.12);
    background: linear-gradient(135deg, var(--bg-card, white) 0%, rgba(240,253,244,.6) 100%);
  }
  :global(.dark) .exam-card.live {
    background: linear-gradient(135deg, var(--bg-card, #1e293b) 0%, rgba(34,197,94,.06) 100%);
  }
  .exam-card.upcoming {
    border-style: dashed;
    border-color: var(--border, #e2e8f0);
  }

  .card-top { display: flex; justify-content: space-between; align-items: center; }
  .course-badge {
    font-size: .72rem; font-weight: 700; padding: .2rem .6rem;
    background: rgba(34,197,94,.1); color: #16a34a;
    border-radius: 999px;
  }
  .course-badge.sm { font-size: .65rem; padding: .15rem .5rem; }
  :global(.dark) .course-badge { background: rgba(34,197,94,.15); color: #4ade80; }

  .live-chip {
    font-size: .65rem; font-weight: 700; letter-spacing: .06em;
    padding: .2rem .6rem;
    background: #dcfce7; color: #16a34a; border-radius: 999px;
    animation: livepulse 2s ease-in-out infinite;
  }
  @keyframes livepulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .7; }
  }
  :global(.dark) .live-chip { background: rgba(34,197,94,.2); color: #4ade80; }

  .upcoming-chip {
    font-size: .65rem; font-weight: 600;
    padding: .2rem .6rem;
    background: #dbeafe; color: #1d4ed8; border-radius: 999px;
  }
  :global(.dark) .upcoming-chip { background: rgba(37,99,235,.2); color: #93c5fd; }

  h3 { font-size: .9rem; font-weight: 600; line-height: 1.4; }
  .exam-meta {
    display: flex; gap: .75rem; flex-wrap: wrap;
    font-size: .75rem; color: var(--text-muted, #475569);
  }
  .exam-time { font-size: .75rem; color: var(--text-muted, #475569); }

  .exam-btn {
    display: block; text-align: center;
    padding: .65rem; border-radius: .5rem;
    font-weight: 600; font-size: .875rem;
    text-decoration: none; margin-top: auto; transition: all .15s;
    cursor: default;
  }
  .exam-btn--live {
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    color: white; cursor: pointer;
  }
  .exam-btn--live:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(21,128,61,.4);
  }
  .exam-btn--waiting {
    background: var(--border, #e2e8f0);
    color: var(--text-muted, #475569);
  }

  /* ── Exam list (compact) ──────────────────────────────────────────── */
  .exam-list {
    background: var(--bg-card, white);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: .875rem; overflow: hidden;
  }
  .exam-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: .875rem 1.25rem; gap: 1rem;
    border-bottom: 1px solid var(--border, #e2e8f0);
    transition: background .1s;
  }
  .exam-row:last-child { border-bottom: none; }
  .exam-row:hover { background: var(--bg, #f8fafc); }
  .exam-row-left { display: flex; align-items: center; gap: .75rem; flex: 1; min-width: 0; }
  .exam-row-title { font-size: .875rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .exam-row-sub   { font-size: .72rem; color: var(--text-muted, #475569); margin-top: .15rem; }

  .status-pill {
    font-size: .68rem; font-weight: 600;
    padding: .2rem .65rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
  }
  .status-completed { background: var(--border, #e2e8f0); color: var(--text-muted, #475569); }
  .status-cancelled { background: #fee2e2; color: #dc2626; }
  .status-draft     { background: var(--border, #e2e8f0); color: var(--text-muted, #475569); }
  :global(.dark) .status-cancelled { background: rgba(220,38,38,.15); color: #f87171; }

  /* ── Empty state ──────────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    padding: 3rem 2rem; gap: .875rem; text-align: center;
    background: var(--bg-card, white);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: .875rem;
    color: var(--text-muted, #475569);
  }
  .empty-icon { opacity: .35; }
  .empty-title { font-weight: 600; font-size: .95rem; }
  .empty-sub   { font-size: .825rem; max-width: 280px; line-height: 1.6; }

  /* ── Results table ────────────────────────────────────────────────── */
  .results-table {
    background: var(--bg-card, white);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: .875rem; overflow: hidden;
  }
  .results-header {
    display: grid;
    grid-template-columns: 80px 1fr 70px 50px 60px;
    gap: 1rem; padding: .625rem 1.25rem;
    background: var(--bg, #f8fafc);
    border-bottom: 1px solid var(--border, #e2e8f0);
    font-size: .65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .06em;
    color: var(--text-muted, #475569);
  }
  .result-row {
    display: grid;
    grid-template-columns: 80px 1fr 70px 50px 60px;
    gap: 1rem; align-items: center;
    padding: .875rem 1.25rem;
    border-bottom: 1px solid var(--border, #e2e8f0);
    transition: background .1s;
  }
  .result-row:last-child { border-bottom: none; }
  .result-row:hover { background: var(--bg, #f8fafc); }

  .result-course {
    font-size: .72rem; font-weight: 700; color: #16a34a;
  }
  :global(.dark) .result-course { color: #4ade80; }
  .result-title { font-size: .85rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result-score { font-size: .925rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .result-grade { font-size: 1.1rem; font-weight: 800; font-variant-numeric: tabular-nums; }

  .pass-badge {
    font-size: .68rem; font-weight: 600;
    padding: .2rem .6rem; border-radius: 999px;
    text-align: center;
  }
  .pass-badge.pass { background: #dcfce7; color: #16a34a; }
  .pass-badge.fail { background: #fee2e2; color: #dc2626; }
  :global(.dark) .pass-badge.pass { background: rgba(34,197,94,.15); color: #4ade80; }
  :global(.dark) .pass-badge.fail { background: rgba(220,38,38,.15); color: #f87171; }

  /* ── Bottom verify CTA ────────────────────────────────────────────── */
  .verify-bottom {
    border-radius: .875rem; overflow: hidden;
    background: linear-gradient(135deg, #051a11 0%, #0a2a1c 100%);
    position: relative;
  }
  .verify-bottom::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(34,197,94,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,197,94,.07) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .verify-bottom-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 1.25rem;
    padding: 1.5rem 2rem; flex-wrap: wrap;
  }
  .verify-bottom-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: rgba(34,197,94,.12);
    border: 1px solid rgba(34,197,94,.3);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e; flex-shrink: 0;
  }
  .verify-bottom-title {
    font-size: .9rem; font-weight: 700; color: white; margin-bottom: .25rem;
  }
  .verify-bottom-sub {
    font-size: .78rem; color: rgba(255,255,255,.55); line-height: 1.6; max-width: 400px;
  }
  .verify-bottom-btn {
    margin-left: auto; white-space: nowrap;
    padding: .75rem 1.5rem;
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    color: white; border-radius: .625rem;
    font-size: .875rem; font-weight: 600;
    text-decoration: none; transition: all .15s;
    box-shadow: 0 4px 12px rgba(21,128,61,.4);
  }
  .verify-bottom-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(21,128,61,.5);
  }

  /* ── Dark mode variables ──────────────────────────────────────────── */
  :global(.dark) .page { background: #0f172a; color: #f8fafc; }
  :global(.dark) .stats-strip,
  :global(.dark) .exam-card,
  :global(.dark) .exam-list,
  :global(.dark) .results-table,
  :global(.dark) .empty-state {
    background: #1e293b; border-color: #334155;
  }
  :global(.dark) h2 { color: #94a3b8; }
  :global(.dark) .exam-row:hover,
  :global(.dark) .result-row:hover { background: #0f172a; }
  :global(.dark) .results-header    { background: #0f172a; border-color: #334155; }
  :global(.dark) .stat-divider      { background: #334155; }
  :global(.dark) .exam-row          { border-color: #334155; }
  :global(.dark) .stat-val          { color: #f8fafc; }
  :global(.dark) .greeting-sub strong { color: #f8fafc; }

  /* ── Responsive ───────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .content { padding: 1.25rem 1rem 3rem; }
    .topbar  { padding: 0 1rem; }
    .stats-strip { overflow-x: auto; }
    .stat { padding: .875rem 1rem; min-width: 70px; }
    .results-header,
    .result-row { grid-template-columns: 60px 1fr 55px 40px 50px; gap: .5rem; padding: .75rem 1rem; }
    .verify-bottom-inner { flex-direction: column; align-items: flex-start; }
    .verify-bottom-btn { margin-left: 0; width: 100%; text-align: center; }
    .greeting-row { flex-direction: column; }
  }
</style>