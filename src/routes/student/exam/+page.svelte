<!-- src/routes/student/exam/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    PlayCircle, Clock, Lock, CheckCircle2, AlertTriangle,
    Calendar, Target, BookOpen, Zap, RotateCcw, ArrowRight,
    FileText, Award, ChevronRight
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const active    = $derived(data.active    ?? []);
  const scheduled = $derived(data.scheduled ?? []);
  const completed = $derived(data.completed ?? []);

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-NG', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(d));
  }

  function countdown(d: string | null | undefined) {
    if (!d) return '';
    const diff = new Date(d).getTime() - Date.now();
    if (diff <= 0) return 'Starting…';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `In ${Math.floor(h / 24)}d`;
    if (h > 0)  return `In ${h}h ${m}m`;
    return `In ${m}m`;
  }

  function sessionStatus(exam: any) {
    const s = exam.mySession;
    if (!s) return 'not_started';
    return s.status;
  }

  function gradeColor(pct: number) {
    if (pct >= 70) return 'grade-a';
    if (pct >= 60) return 'grade-b';
    if (pct >= 50) return 'grade-c';
    if (pct >= 45) return 'grade-d';
    return 'grade-f';
  }
</script>

<div class="page">

  <div class="page-header">
    <div>
      <h1 class="page-title">My Exams</h1>
      <p class="page-sub">
        {#if data.activeSemester}
          {data.activeSemester.session} · Semester {data.activeSemester.semester}
        {:else}
          All available examinations
        {/if}
      </p>
    </div>
  </div>

  <!-- ── Active / Live exams ───────────────────────────────── -->
  {#if active.length > 0}
    <section class="section">
      <div class="section-head">
        <div class="section-head-l">
          <Zap size={14} class="icon-live" />
          <h2>Live Now</h2>
          <span class="count-chip live-chip">{active.length}</span>
        </div>
      </div>
      <div class="exam-grid">
        {#each active as exam}
          {@const status = sessionStatus(exam)}
          <div class="exam-card live-card">
            <div class="card-top">
              <div class="exam-badge live-badge">
                <span class="pulse-dot"></span>Live
              </div>
              {#if status === 'in_progress'}
                <span class="resume-chip"><RotateCcw size={10} /> In progress</span>
              {/if}
            </div>
            <div class="course-tag">{exam.course?.code}</div>
            <h3 class="exam-title">{exam.title}</h3>
            <div class="exam-meta-row">
              <span class="meta-item"><Clock size={11} />{exam.durationMinutes} min</span>
              <span class="meta-item"><Target size={11} />{exam.questionsToPresent || exam._count?.questions} questions</span>
              <span class="meta-item"><Award size={11} />{exam.totalMarks} marks</span>
            </div>
            {#if exam.scheduledEnd}
              <div class="deadline">
                <AlertTriangle size={11} />
                Ends {formatDate(exam.scheduledEnd)}
              </div>
            {/if}
            <a
              href="/student/exam/{exam.id}"
              class="btn-start"
              class:btn-resume={status === 'in_progress'}
            >
              {#if status === 'in_progress'}
                <RotateCcw size={14} /> Resume Exam
              {:else if status === 'submitted' || status === 'force_submitted'}
                <CheckCircle2 size={14} /> View Result
              {:else}
                <PlayCircle size={14} /> Start Exam
              {/if}
              <ArrowRight size={14} class="btn-arr" />
            </a>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── Scheduled exams ───────────────────────────────────── -->
  {#if scheduled.length > 0}
    <section class="section">
      <div class="section-head">
        <div class="section-head-l">
          <Calendar size={14} class="icon-sched" />
          <h2>Upcoming</h2>
          <span class="count-chip sched-chip">{scheduled.length}</span>
        </div>
      </div>
      <div class="list-card">
        {#each scheduled as exam}
          <div class="list-row">
            <div class="list-indicator sched-ind"></div>
            <div class="list-info">
              <div class="list-top">
                <span class="course-code">{exam.course?.code}</span>
                <span class="list-title">{exam.title}</span>
              </div>
              <div class="list-meta">
                <span><Clock size={10} />{exam.durationMinutes}m</span>
                <span><Target size={10} />{exam.questionsToPresent || exam._count?.questions} q's</span>
                {#if exam.scheduledStart}
                  <span><Calendar size={10} />{formatDate(exam.scheduledStart)}</span>
                {/if}
              </div>
            </div>
            <div class="list-right">
              {#if exam.scheduledStart}
                <span class="countdown">{countdown(exam.scheduledStart)}</span>
              {/if}
              <span class="btn-locked"><Lock size={12} /> Locked</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── Completed exams ────────────────────────────────────── -->
  {#if completed.length > 0}
    <section class="section">
      <div class="section-head">
        <div class="section-head-l">
          <CheckCircle2 size={14} class="icon-done" />
          <h2>Completed</h2>
          <span class="count-chip done-chip">{completed.length}</span>
        </div>
      </div>
      <div class="list-card">
        {#each completed as exam}
          {@const s = exam.mySession}
          {@const pct = Number(s?.examResult?.percentage ?? 0)}
          <a href="/student/results" class="list-row list-row-link">
            <div class="list-indicator done-ind"></div>
            <div class="list-info">
              <div class="list-top">
                <span class="course-code">{exam.course?.code}</span>
                <span class="list-title">{exam.title}</span>
              </div>
              <div class="list-meta">
                <span><Clock size={10} />{exam.durationMinutes}m</span>
                {#if s?.submittedAt}
                  <span><Calendar size={10} />{formatDate(s.submittedAt)}</span>
                {/if}
              </div>
            </div>
            <div class="list-right">
              {#if s?.examResult}
                <div class="result-pill {gradeColor(pct)}">
                  {s.examResult.grade ?? '—'} · {Math.round(pct)}%
                </div>
              {:else if s}
                <span class="no-result">Pending</span>
              {:else}
                <span class="no-result">Not attempted</span>
              {/if}
              <ChevronRight size={14} class="row-arr" />
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── Empty state ────────────────────────────────────────── -->
  {#if active.length === 0 && scheduled.length === 0 && completed.length === 0}
    <div class="empty-page">
      <FileText size={40} strokeWidth={1.1} />
      <h3>No exams yet</h3>
      <p>Your lecturer hasn't scheduled any exams for you yet.<br>Check back later.</p>
    </div>
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 2rem; }

  .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .page-title { font-size: 1.5rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.03em; margin: 0 0 0.2rem; }
  .page-sub { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  .section { display: flex; flex-direction: column; gap: 0.75rem; }
  .section-head { display: flex; align-items: center; justify-content: space-between; }
  .section-head-l { display: flex; align-items: center; gap: 0.5rem; }
  .section-head-l h2 { font-size: 0.9rem; font-weight: 800; color: var(--color-text); margin: 0; }
  :global(.icon-live) { color: var(--g600); }
  :global(.icon-sched) { color: #0ea5e9; }
  :global(.icon-done) { color: #10b981; }

  .count-chip {
    font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.5rem;
    border-radius: 20px; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .live-chip  { background: rgba(22,163,74,0.12); color: var(--g700); }
  .sched-chip { background: rgba(14,165,233,0.12); color: #0369a1; }
  .done-chip  { background: rgba(16,185,129,0.10); color: #065f46; }
  :global(.dark) .live-chip  { color: var(--g400); }
  :global(.dark) .sched-chip { color: #38bdf8; }
  :global(.dark) .done-chip  { color: #34d399; }

  /* ── Exam cards (active) ─────────────────────────────────── */
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.875rem;
  }
  .exam-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 16px; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.625rem;
    transition: box-shadow 0.15s;
  }
  .live-card {
    border-color: rgba(22,163,74,0.35);
    box-shadow: 0 0 0 3px rgba(22,163,74,0.06);
  }
  .live-card:hover { box-shadow: 0 4px 24px rgba(22,163,74,0.12), 0 0 0 3px rgba(22,163,74,0.08); }

  .card-top { display: flex; align-items: center; justify-content: space-between; }
  .exam-badge {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    padding: 0.2rem 0.6rem; border-radius: 20px;
  }
  .live-badge { background: rgba(22,163,74,0.12); color: var(--g700); }
  :global(.dark) .live-badge { color: var(--g400); }
  .pulse-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--g500);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .resume-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.62rem; font-weight: 700; color: #0369a1;
    background: rgba(14,165,233,0.1); padding: 0.2rem 0.55rem; border-radius: 20px;
  }

  .course-tag {
    font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--g700);
  }
  :global(.dark) .course-tag { color: var(--g400); }

  .exam-title {
    font-size: 1rem; font-weight: 800; color: var(--color-text);
    line-height: 1.3; margin: 0;
  }
  .exam-meta-row {
    display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
  }
  .meta-item {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.7rem; color: var(--color-muted); font-weight: 500;
  }

  .deadline {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 600; color: #f59e0b;
    background: rgba(245,158,11,0.08); padding: 0.3rem 0.6rem;
    border-radius: 6px; border: 1px solid rgba(245,158,11,0.2);
  }

  .btn-start {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.75rem; background: var(--g600); color: #fff;
    border-radius: 10px; font-size: 0.83rem; font-weight: 800;
    text-decoration: none; margin-top: 0.25rem;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-start:hover { background: var(--g700); transform: translateY(-1px); }
  .btn-resume { background: #0ea5e9; }
  .btn-resume:hover { background: #0284c7; }
  :global(.btn-arr) { margin-left: auto; }

  /* ── List rows (scheduled / completed) ──────────────────── */
  .list-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; overflow: hidden;
  }
  .list-row {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 0.875rem 1.125rem; border-bottom: 1px solid var(--color-border);
  }
  .list-row:last-child { border-bottom: none; }
  .list-row-link { text-decoration: none; transition: background 0.12s; }
  .list-row-link:hover { background: var(--color-bg); }

  .list-indicator {
    width: 3px; height: 38px; border-radius: 2px; flex-shrink: 0;
  }
  .sched-ind { background: #38bdf8; }
  .done-ind  { background: #10b981; }

  .list-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .list-top { display: flex; align-items: center; gap: 0.5rem; }
  .course-code {
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--g700); flex-shrink: 0;
    background: var(--g-soft); padding: 0.1rem 0.4rem; border-radius: 4px;
  }
  :global(.dark) .course-code { color: var(--g400); }
  .list-title {
    font-size: 0.83rem; font-weight: 600; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .list-meta {
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    font-size: 0.68rem; color: var(--color-muted);
  }
  .list-meta span { display: flex; align-items: center; gap: 0.25rem; }

  .list-right { display: flex; align-items: center; gap: 0.625rem; flex-shrink: 0; }
  .countdown {
    font-size: 0.72rem; font-weight: 700; color: #0ea5e9;
    background: rgba(14,165,233,0.1); padding: 0.2rem 0.55rem; border-radius: 6px;
  }
  .btn-locked {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.3rem 0.7rem; border-radius: 7px;
  }
  .no-result { font-size: 0.72rem; color: var(--color-muted); font-style: italic; }
  :global(.row-arr) { color: var(--color-border); }
  .list-row-link:hover :global(.row-arr) { color: var(--g600); }

  .result-pill {
    font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 8px;
  }
  .grade-a { background: rgba(22,163,74,0.12);  color: #065f46; }
  .grade-b { background: rgba(14,165,233,0.12); color: #0369a1; }
  .grade-c { background: rgba(245,158,11,0.12); color: #92400e; }
  .grade-d { background: rgba(249,115,22,0.12); color: #9a3412; }
  .grade-f { background: rgba(220,38,38,0.12);  color: #991b1b; }
  :global(.dark) .grade-a { color: #4ade80; background: rgba(22,163,74,0.15); }
  :global(.dark) .grade-b { color: #38bdf8; }
  :global(.dark) .grade-f { color: #f87171; }

  /* ── Empty ───────────────────────────────────────────────── */
  .empty-page {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 4rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-page h3 { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .empty-page p  { font-size: 0.82rem; line-height: 1.6; margin: 0; }

  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>