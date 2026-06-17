<!-- src/routes/student/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ClipboardList, Clock, Target, BookMarked, ChevronRight,
    ArrowRight, AlertTriangle, CheckCircle2, PlayCircle,
    Calendar, Zap, TrendingUp, Award, BookOpen, Activity,
    ArrowUpRight, Sparkles, Lock, BarChart3
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const stats = $derived(data.stats ?? {});
  const availableExams = $derived(data.availableExams ?? []);
  const recentResults  = $derived(data.recentResults  ?? []);
  const registeredCourses = $derived(data.registeredCourses ?? []);

  const activeExams   = $derived(stats.activeExams   ?? 0);
  const upcomingExams = $derived(stats.upcomingExams ?? 0);
  const totalResults  = $derived(stats.totalResults  ?? 0);
  const averageScore  = $derived(stats.averageScore  ?? 0);
  const totalCourses  = $derived(registeredCourses.length);

  const firstName = $derived(data.user?.fullName?.trim().split(/\s+/)[0] ?? 'Student');

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  }

  function gradeColor(pct: number) {
    if (pct >= 70) return 'grade-a';
    if (pct >= 60) return 'grade-b';
    if (pct >= 50) return 'grade-c';
    if (pct >= 45) return 'grade-d';
    return 'grade-f';
  }

  function gradeLabel(pct: number) {
    if (pct >= 70) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 45) return 'D';
    return 'F';
  }

  function examStatusColor(status: string) {
    if (status === 'active')    return 'pill-active';
    if (status === 'scheduled') return 'pill-scheduled';
    return '';
  }
</script>

<div class="page">

  <!-- ── Welcome header ──────────────────────────────────────── -->
  <div class="welcome-header">
    <div class="welcome-left">
      <div class="welcome-greet">
        <Sparkles size={14} class="greet-spark" />
        <span>{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, <strong>{firstName}</strong></span>
      </div>
      <h1 class="welcome-title">Your Academic Dashboard</h1>
      <div class="welcome-meta">
        <span class="meta-chip"><BookMarked size={11} />{totalCourses} Courses</span>
        <span class="meta-chip"><Target size={11} />{totalResults} Results</span>
        {#if averageScore > 0}
          <span class="meta-chip score-chip"><TrendingUp size={11} />{averageScore}% Average</span>
        {/if}
      </div>
    </div>
    {#if activeExams > 0}
      <a href="/student/exams" class="exam-now-btn">
        <Zap size={14} />
        {activeExams} Exam{activeExams > 1 ? 's' : ''} Live
        <ArrowRight size={14} />
      </a>
    {/if}
  </div>

  <!-- ── Stats ─────────────────────────────────────────────────── -->
  <div class="stats-row">
    <div class="stat-card" class:active-card={activeExams > 0}>
      <div class="stat-icon" class:icon-live={activeExams > 0} class:icon-neutral={activeExams === 0}>
        <Zap size={17} />
      </div>
      <div class="stat-body">
        <span class="stat-val">{activeExams}</span>
        <span class="stat-lbl">Live Now</span>
      </div>
      {#if activeExams > 0}
        <div class="live-pulse"></div>
      {/if}
    </div>

    <div class="stat-card">
      <div class="stat-icon icon-soon">
        <Calendar size={17} />
      </div>
      <div class="stat-body">
        <span class="stat-val">{upcomingExams}</span>
        <span class="stat-lbl">Upcoming</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon icon-done">
        <CheckCircle2 size={17} />
      </div>
      <div class="stat-body">
        <span class="stat-val">{totalResults}</span>
        <span class="stat-lbl">Completed</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon icon-avg">
        <Activity size={17} />
      </div>
      <div class="stat-body">
        <span class="stat-val" class:good={averageScore >= 50}>{averageScore}<span class="pct">%</span></span>
        <span class="stat-lbl">Average</span>
      </div>
    </div>
  </div>

  <!-- ── Main grid ──────────────────────────────────────────────── -->
  <div class="main-grid">

    <!-- Available Exams -->
    <section class="card span-wide">
      <div class="card-head">
        <div class="card-head-l">
          <ClipboardList size={15} />
          <h2>Available Exams</h2>
          {#if activeExams > 0}
            <span class="live-chip"><span class="live-dot"></span>{activeExams} live</span>
          {/if}
        </div>
        <a href="/student/exams" class="see-all">All exams <ChevronRight size={13} /></a>
      </div>

      {#if availableExams.length === 0}
        <div class="empty">
          <ClipboardList size={28} strokeWidth={1.2} />
          <p>No exams available right now</p>
          <span>Check back later or contact your lecturer</span>
        </div>
      {:else}
        <div class="exam-list">
          {#each availableExams.slice(0, 5) as exam}
            <div class="exam-row">
              <div class="exam-status-indicator" class:ind-active={exam.status === 'active'} class:ind-scheduled={exam.status === 'scheduled'}></div>
              <div class="exam-details">
                <div class="exam-top">
                  <span class="exam-title">{exam.title}</span>
                  <span class="exam-pill {examStatusColor(exam.status)}">
                    {exam.status === 'active' ? 'Live' : 'Scheduled'}
                  </span>
                </div>
                <div class="exam-bottom">
                  <span class="exam-course">{exam.course?.code ?? ''} · {exam.course?.title ?? ''}</span>
                  <span class="exam-dots">
                    <Clock size={10} />{exam.durationMinutes}min
                    <span class="dot">·</span>
                    <Target size={10} />{exam.questionsToPresent || exam._count?.questions} q's
                    {#if exam.scheduledStart}
                      <span class="dot">·</span>
                      <Calendar size={10} />{formatDate(exam.scheduledStart)}
                    {/if}
                  </span>
                </div>
              </div>
              <div class="exam-cta">
                {#if exam.status === 'active'}
  <a href="/student/exams?examId={exam.id}" class="btn-start">
                      <PlayCircle size={13} />
                    Enter exam
                  </a>
                {:else}
                  <span class="btn-waiting">
                    <Lock size={12} />
                    Waiting
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Recent Results -->
    <section class="card">
      <div class="card-head">
        <div class="card-head-l">
          <BarChart3 size={15} />
          <h2>Recent Results</h2>
        </div>
        <a href="/student/results" class="see-all">All results <ChevronRight size={13} /></a>
      </div>

      {#if recentResults.length === 0}
        <div class="empty sm">
          <Award size={22} strokeWidth={1.3} />
          <p>No results yet</p>
        </div>
      {:else}
        <div class="results-list">
          {#each recentResults.slice(0, 5) as result}
            <a href="/student/results/{result.id}" class="result-row">
              <div class="grade-badge {gradeColor(Number(result.percentage ?? 0))}">
                {gradeLabel(Number(result.percentage ?? 0))}
              </div>
              <div class="result-info">
                <span class="result-title">{result.exam?.title ?? '—'}</span>
                <span class="result-meta">{result.exam?.course?.code ?? ''} &middot; {Math.round(Number(result.percentage ?? 0))}%</span>
              </div>
              <div class="result-bar-wrap">
                <div class="result-bar">
                  <div class="result-fill {gradeColor(Number(result.percentage ?? 0))}-fill" style="width:{Math.min(Number(result.percentage ?? 0), 100)}%"></div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <!-- My Courses -->
    <section class="card">
      <div class="card-head">
        <div class="card-head-l">
          <BookMarked size={15} />
          <h2>My Courses</h2>
        </div>
        <a href="/student/courses" class="see-all">All <ChevronRight size={13} /></a>
      </div>

      {#if registeredCourses.length === 0}
        <div class="empty sm">
          <BookOpen size={22} strokeWidth={1.3} />
          <p>No courses registered</p>
          <a href="/student/courses/register" class="register-link">Register courses</a>
        </div>
      {:else}
        <div class="courses-list">
          {#each registeredCourses.slice(0, 6) as reg}
            <div class="course-row">
              <div class="course-icon">
                <BookOpen size={13} />
              </div>
              <div class="course-info">
                <span class="course-code">{reg.course?.code}</span>
                <span class="course-title">{reg.course?.title}</span>
              </div>
              <span class="course-credits">{reg.course?.creditUnits ?? 2} cr</span>
            </div>
          {/each}
        </div>
        {#if registeredCourses.length > 6}
          <div class="courses-more">
            <a href="/student/courses">+{registeredCourses.length - 6} more courses</a>
          </div>
        {/if}
      {/if}
    </section>

  </div>
</div>

<style>
  /* ── Tokens — Green for students ─────────────────────────── */
  :root {
    --g50:  #f0fdf4;
    --g100: #dcfce7;
    --g400: #4ade80;
    --g500: #22c55e;
    --g600: #16a34a;
    --g700: #15803d;
    --g-soft: rgba(22,163,74,0.08);
  }

  .page { display: flex; flex-direction: column; gap: 1.5rem; }

  /* ── Welcome ─────────────────────────────────────────────── */
  .welcome-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .welcome-greet {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; color: var(--g700); margin-bottom: 0.375rem;
    background: var(--g-soft); padding: 0.3rem 0.75rem;
    border-radius: 20px; font-weight: 500;
  }
  :global(.dark) .welcome-greet { color: var(--g400); }
  :global(.greet-spark) { color: var(--g600); }
  .welcome-greet strong { font-weight: 800; }
  .welcome-title {
    font-size: 1.55rem; font-weight: 900; color: var(--color-text);
    letter-spacing: -0.03em; line-height: 1.15; margin: 0 0 0.5rem;
  }
  .welcome-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .meta-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.2rem 0.6rem; border-radius: 20px;
  }
  .score-chip { color: var(--g700); background: var(--g-soft); border-color: transparent; }
  :global(.dark) .score-chip { color: var(--g400); }
  .exam-now-btn {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.625rem 1.25rem; background: var(--g600); color: #fff;
    border-radius: 10px; font-size: 0.83rem; font-weight: 800;
    text-decoration: none; animation: pulse-btn 2s ease-in-out infinite;
    white-space: nowrap;
  }
  .exam-now-btn:hover { background: var(--g700); animation: none; }

  /* ── Stats ───────────────────────────────────────────────── */
  .stats-row {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
  }
  @media (max-width: 640px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }

  .stat-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem;
    position: relative; overflow: hidden;
    transition: border-color 0.15s;
  }
  .stat-card.active-card { border-color: rgba(22,163,74,0.4); }
  .stat-icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .icon-live    { background: rgba(22,163,74,0.12); color: var(--g600); }
  .icon-neutral { background: var(--color-bg); color: var(--color-muted); }
  .icon-soon    { background: rgba(14,165,233,0.1); color: #0ea5e9; }
  .icon-done    { background: rgba(16,185,129,0.1); color: #10b981; }
  .icon-avg     { background: rgba(168,85,247,0.1); color: #a855f7; }
  .stat-body { display: flex; flex-direction: column; }
  .stat-val {
    font-size: 1.6rem; font-weight: 900; color: var(--color-text);
    letter-spacing: -0.04em; line-height: 1;
  }
  .stat-val.good { color: var(--g600); }
  .pct { font-size: 0.9rem; font-weight: 600; opacity: 0.6; }
  .stat-lbl {
    font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted); margin-top: 0.15rem;
  }
  .live-pulse {
    position: absolute; top: 10px; right: 10px;
    width: 8px; height: 8px; border-radius: 50%; background: var(--g500);
    animation: pulse-ring 1.5s ease-in-out infinite;
  }

  /* ── Main grid ───────────────────────────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 0.875rem;
  }
  .span-wide { grid-column: 1 / -1; }
  @media (max-width: 860px) {
    .main-grid { grid-template-columns: 1fr; }
    .span-wide { grid-column: 1; }
  }

  /* ── Cards ───────────────────────────────────────────────── */
  .card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; overflow: hidden;
  }
  .card-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1.125rem; border-bottom: 1px solid var(--color-border);
  }
  .card-head-l {
    display: flex; align-items: center; gap: 0.5rem; color: var(--g600);
  }
  .card-head-l h2 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin: 0;
  }
  .live-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.6rem; font-weight: 800; text-transform: uppercase;
    padding: 0.15rem 0.5rem; border-radius: 20px;
    background: rgba(22,163,74,0.1); color: var(--g700);
  }
  :global(.dark) .live-chip { color: var(--g400); }
  .live-dot {
    width: 5px; height: 5px; border-radius: 50%; background: var(--g500);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .see-all {
    display: inline-flex; align-items: center; gap: 0.15rem;
    font-size: 0.7rem; font-weight: 600; color: var(--g600); text-decoration: none;
  }
  .see-all:hover { text-decoration: underline; }

  /* ── Exam list ───────────────────────────────────────────── */
  .exam-list { display: flex; flex-direction: column; }
  .exam-row {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 0.9rem 1.125rem; border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
  }
  .exam-row:last-child { border-bottom: none; }
  .exam-row:hover { background: var(--color-bg); }

  .exam-status-indicator {
    width: 3px; height: 36px; border-radius: 2px; flex-shrink: 0;
    background: var(--color-border);
  }
  .ind-active    { background: var(--g500); }
  .ind-scheduled { background: #38bdf8; }

  .exam-details { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .exam-top { display: flex; align-items: center; gap: 0.625rem; }
  .exam-title {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
  }
  .exam-pill {
    font-size: 0.5rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.04em; padding: 0.18rem 0.55rem; border-radius: 20px;
    flex-shrink: 0;
  }
  .pill-active    { background: rgba(22,163,74,0.12);  color: var(--g700); }
  .pill-scheduled { background: rgba(14,165,233,0.12); color: #0369a1; }
  :global(.dark) .pill-active    { color: var(--g400); }
  :global(.dark) .pill-scheduled { color: #38bdf8; }

  .exam-bottom { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .exam-course { font-size: 0.7rem; color: var(--color-muted); font-weight: 500; }
  .exam-dots {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; color: var(--color-muted);
  }
  .dot { opacity: 0.4; }

  .exam-cta { flex-shrink: 0; }
  .btn-start {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.45rem 0.9rem; background: var(--g600); color: #fff;
    border-radius: 8px; font-size: 0.75rem; font-weight: 800;
    text-decoration: none; transition: background 0.15s;
  }
  .btn-start:hover { background: var(--g700); }
  .btn-waiting {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.45rem 0.75rem;
    background: var(--color-bg); color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 8px; font-size: 0.72rem; font-weight: 600;
  }

  /* ── Results ─────────────────────────────────────────────── */
  .results-list { display: flex; flex-direction: column; }
  .result-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 1.125rem; border-bottom: 1px solid var(--color-border);
    text-decoration: none; transition: background 0.12s;
  }
  .result-row:last-child { border-bottom: none; }
  .result-row:hover { background: var(--color-bg); }

  .grade-badge {
    width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 900;
  }
  .grade-a { background: rgba(22,163,74,0.12); color: #065f46; }
  .grade-b { background: rgba(14,165,233,0.12); color: #0369a1; }
  .grade-c { background: rgba(245,158,11,0.12); color: #92400e; }
  .grade-d { background: rgba(249,115,22,0.12); color: #9a3412; }
  .grade-f { background: rgba(220,38,38,0.12);  color: #991b1b; }
  :global(.dark) .grade-a { color: #4ade80; }
  :global(.dark) .grade-b { color: #38bdf8; }
  :global(.dark) .grade-c { color: #fbbf24; }
  :global(.dark) .grade-f { color: #f87171; }

  .result-info { flex: 1; min-width: 0; }
  .result-title {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .result-meta { font-size: 0.68rem; color: var(--color-muted); }

  .result-bar-wrap { width: 60px; flex-shrink: 0; }
  .result-bar { height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
  .result-fill { height: 100%; border-radius: 2px; }
  .grade-a-fill { background: var(--g500); }
  .grade-b-fill { background: #38bdf8; }
  .grade-c-fill { background: #f59e0b; }
  .grade-d-fill { background: #f97316; }
  .grade-f-fill { background: #ef4444; }

  /* ── Courses ─────────────────────────────────────────────── */
  .courses-list { display: flex; flex-direction: column; }
  .course-row {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.65rem 1.125rem; border-bottom: 1px solid var(--color-border);
  }
  .course-row:last-child { border-bottom: none; }
  .course-icon {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    background: var(--g-soft); color: var(--g700);
    display: flex; align-items: center; justify-content: center;
  }
  :global(.dark) .course-icon { color: var(--g400); }
  .course-info { flex: 1; min-width: 0; }
  .course-code {
    display: block; font-size: 0.68rem; font-weight: 800;
    color: var(--g700); text-transform: uppercase; letter-spacing: 0.04em;
  }
  :global(.dark) .course-code { color: var(--g400); }
  .course-title {
    display: block; font-size: 0.75rem; color: var(--color-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .course-credits {
    font-size: 0.65rem; font-weight: 700;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); padding: 0.15rem 0.45rem; border-radius: 6px;
    flex-shrink: 0;
  }
  .courses-more {
    padding: 0.5rem 1.125rem; border-top: 1px solid var(--color-border);
    text-align: center;
  }
  .courses-more a {
    font-size: 0.72rem; font-weight: 600; color: var(--g600); text-decoration: none;
  }
  .courses-more a:hover { text-decoration: underline; }
  .register-link {
    display: inline-block; margin-top: 0.35rem;
    font-size: 0.75rem; font-weight: 700; color: var(--g600); text-decoration: none;
  }

  /* ── Empty states ────────────────────────────────────────── */
  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty p { font-size: 0.82rem; font-weight: 600; margin: 0; color: var(--color-text); }
  .empty span { font-size: 0.72rem; }
  .empty.sm { padding: 1.25rem 1rem; }
  .empty.sm p { font-size: 0.78rem; }

  /* ── Animations ──────────────────────────────────────────── */
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  @keyframes pulse-btn {
    0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
    50%     { box-shadow: 0 4px 20px rgba(22,163,74,0.35); }
  }
</style>