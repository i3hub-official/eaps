<!-- src/routes/student/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    BookMarked, ChevronRight, ArrowRight, CheckCircle2,
    Calendar, Zap, TrendingUp, TrendingDown, Award,
    BookOpen, Activity, Sparkles, BarChart3, Target,
    Minus,
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  // ── Data accessors — all guarded, no silent undefined ──────────────────
  const examCounts        = $derived(data.examCounts        ?? { active: 0, scheduled: 0, completed: 0, cancelled: 0 });
  const stats             = $derived(data.stats             ?? { activeExams: 0, upcomingExams: 0, totalResults: 0, averageScore: 0 });
  const recentResults     = $derived(data.recentResults     ?? []);
  const registeredCourses = $derived(data.registeredCourses ?? []);
  const perf              = $derived(data.performanceData   ?? {
    grades: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    trend: [0], trendLabels: ['—'],
    subjectPerformance: [],
    improvement: 0,
  });

  // ── Stat values — use the RIGHT source for each tile ───────────────────
  // activeExams / upcomingExams: exam-status counts (what's live/coming up)
  // totalResults:  how many exams the student has actually submitted (results)
  // averageScore:  aggregate of submitted results
  const activeExams   = $derived(stats.activeExams   ?? examCounts.active);
  const upcomingExams = $derived(stats.upcomingExams ?? examCounts.scheduled);
  const totalResults  = $derived(stats.totalResults  ?? 0);
  const averageScore  = $derived(stats.averageScore  ?? 0);
  const totalCourses  = $derived(registeredCourses.length);

  // ── Student name — server doesn't return data.user directly;
  //    pull from the first result or fall back gracefully
  const firstName = $derived(
    (data as any).user?.fullName?.trim().split(/\s+/)[0] ?? 'Student'
  );

  // ── Grade helpers ──────────────────────────────────────────────────────
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

  // ── Performance chart helpers ──────────────────────────────────────────
  // Micro sparkline rendered as an inline SVG path
  function sparkPath(vals: number[]): string {
    if (!vals || vals.length < 2) return '';
    const W = 120, H = 36, pad = 4;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x},${y}`;
    });
    return `M ${pts.join(' L ')}`;
  }

  const hasPerformance = $derived(perf.trend.some(v => v > 0));
  const improvementDir = $derived(
    perf.improvement > 0 ? 'up' : perf.improvement < 0 ? 'down' : 'flat'
  );

  // Top subject for quick display
  const topSubject = $derived(
    perf.subjectPerformance.find(s => s.subject !== 'No Data') ?? null
  );
</script>

<div class="page">

  <!-- ── Welcome ──────────────────────────────────────────────────── -->
  <div class="welcome-header">
    <div class="welcome-left">
      <div class="welcome-greet">
        <Sparkles size={13} class="greet-spark" />
        <span>
          {new Date().getHours() < 12 ? 'Good morning'
            : new Date().getHours() < 17 ? 'Good afternoon'
            : 'Good evening'},
          <strong>{firstName}</strong>
        </span>
      </div>
      <h1 class="welcome-title">Your Academic Dashboard</h1>
      <div class="welcome-meta">
        {#if totalCourses > 0}
          <span class="meta-chip"><BookMarked size={11} />{totalCourses} Course{totalCourses !== 1 ? 's' : ''}</span>
        {/if}
        {#if totalResults > 0}
          <span class="meta-chip"><Target size={11} />{totalResults} Result{totalResults !== 1 ? 's' : ''}</span>
        {/if}
        {#if averageScore > 0}
          <span class="meta-chip chip-score"><TrendingUp size={11} />{averageScore}% Average</span>
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

  <!-- ── Main grid ─────────────────────────────────────────────────── -->
  <div class="main-grid">

    <!-- Stats row (spans full width) -->
    <div class="stats-row span-wide">

      <!-- Live now -->
      <a href="/student/exams?tab=live" class="stat-card" class:card-active={activeExams > 0}>
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
      </a>

      <!-- Upcoming -->
      <a href="/student/exams?tab=scheduled" class="stat-card">
        <div class="stat-icon icon-soon"><Calendar size={17} /></div>
        <div class="stat-body">
          <span class="stat-val">{upcomingExams}</span>
          <span class="stat-lbl">Upcoming</span>
        </div>
      </a>

      <!-- Submitted results (not exam.status = completed) -->
      <a href="/student/results" class="stat-card">
        <div class="stat-icon icon-done"><CheckCircle2 size={17} /></div>
        <div class="stat-body">
          <span class="stat-val">{totalResults}</span>
          <span class="stat-lbl">Submitted</span>
        </div>
      </a>

      <!-- Average score -->
      <div class="stat-card">
        <div class="stat-icon icon-avg"><Activity size={17} /></div>
        <div class="stat-body">
          <span class="stat-val" class:good={averageScore >= 50}>
            {averageScore}<span class="pct">%</span>
          </span>
          <span class="stat-lbl">Avg Score</span>
        </div>
      </div>
    </div>

    <!-- ── Recent Results ──────────────────────────────────────────── -->
    <section class="card">
      <div class="card-head">
        <div class="card-head-l">
          <BarChart3 size={15} />
          <h2>Recent Results</h2>
        </div>
        <a href="/student/results" class="see-all">All <ChevronRight size={13} /></a>
      </div>

      {#if recentResults.length === 0}
        <div class="empty sm">
          <Award size={22} strokeWidth={1.3} />
          <p>No results yet</p>
          <span>Results appear here after your exams are graded</span>
        </div>
      {:else}
        <div class="results-list">
          {#each recentResults.slice(0, 5) as result}
            {@const pct = Math.round(Number(result.percentage ?? 0))}
            <a href="/student/results/{result.id}" class="result-row">
              <div class="grade-badge {gradeColor(pct)}">{gradeLabel(pct)}</div>
              <div class="result-info">
                <span class="result-title">{result.exam?.title ?? '—'}</span>
                <span class="result-meta">
                  {result.exam?.course?.code ?? ''}
                  {#if result.exam?.course?.code}&middot;{/if}
                  {pct}%
                </span>
              </div>
              <div class="result-bar-wrap">
                <div class="result-bar">
                  <div
                    class="result-fill {gradeColor(pct)}-fill"
                    style="width:{Math.min(pct, 100)}%"
                  ></div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── Performance snapshot ────────────────────────────────────── -->
    <section class="card">
      <div class="card-head">
        <div class="card-head-l">
          <TrendingUp size={15} />
          <h2>Performance</h2>
        </div>
        {#if hasPerformance}
          <span class="improvement-chip" class:chip-up={improvementDir === 'up'} class:chip-down={improvementDir === 'down'}>
            {#if improvementDir === 'up'}<TrendingUp size={11} />+{perf.improvement}%
            {:else if improvementDir === 'down'}<TrendingDown size={11} />{perf.improvement}%
            {:else}<Minus size={11} />Stable{/if}
          </span>
        {/if}
      </div>

      {#if !hasPerformance}
        <div class="empty sm">
          <Activity size={22} strokeWidth={1.3} />
          <p>No performance data yet</p>
          <span>Complete exams to see your trend</span>
        </div>
      {:else}
        <div class="perf-body">
          <!-- Sparkline trend -->
          <div class="sparkline-wrap">
            <svg viewBox="0 0 120 36" class="sparkline" aria-hidden="true">
              <path d={sparkPath(perf.trend)} class="spark-line" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <!-- fill area -->
              {#if perf.trend.length >= 2}
                {@const W = 120}
                {@const pathD = sparkPath(perf.trend)}
                <path
                  d="{pathD} L {W - 4},36 L 4,36 Z"
                  class="spark-fill"
                />
              {/if}
            </svg>
            <div class="spark-labels">
              <span>{perf.trendLabels[0]}</span>
              <span>{perf.trendLabels[perf.trendLabels.length - 1]}</span>
            </div>
          </div>

          <!-- Grade distribution -->
          <div class="grade-dist">
            <div class="dist-label">Grade distribution</div>
            <div class="dist-bars">
              {#each ([['A', perf.grades.A, 'grade-a'], ['B', perf.grades.B, 'grade-b'], ['C', perf.grades.C, 'grade-c'], ['D', perf.grades.D, 'grade-d'], ['F', perf.grades.F, 'grade-f']] as const) as [g, count, cls]}
                {@const total = Object.values(perf.grades).reduce((a, b) => a + b, 0)}
                {@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
                <div class="dist-row">
                  <span class="dist-letter">{g}</span>
                  <div class="dist-track">
                    <div class="dist-fill {cls}-fill" style="width:{pct}%"></div>
                  </div>
                  <span class="dist-count">{count}</span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Top subject -->
          {#if topSubject}
            <div class="top-subject">
              <span class="top-subject-label">Best subject</span>
              <span class="top-subject-val">{topSubject.subject}</span>
              <span class="top-subject-score">{topSubject.score}%</span>
            </div>
          {/if}
        </div>
      {/if}
    </section>

    <!-- ── My Courses ──────────────────────────────────────────────── -->
    <section class="card span-wide">
      <div class="card-head">
        <div class="card-head-l">
          <BookMarked size={15} />
          <h2>My Courses</h2>
          {#if totalCourses > 0}
            <span class="count-chip">{totalCourses}</span>
          {/if}
        </div>
        <a href="/student/courses" class="see-all">All <ChevronRight size={13} /></a>
      </div>

      {#if registeredCourses.length === 0}
        <div class="empty sm">
          <BookOpen size={22} strokeWidth={1.3} />
          <p>No courses registered</p>
          <a href="/student/courses/register" class="register-link">Register courses →</a>
        </div>
      {:else}
        <div class="courses-grid">
          {#each registeredCourses.slice(0, 8) as reg}
            <div class="course-item">
              <div class="course-icon"><BookOpen size={13} /></div>
              <div class="course-info">
                <span class="course-code">{reg.course?.code ?? '—'}</span>
                <span class="course-title">{reg.course?.title ?? ''}</span>
              </div>
              <span class="course-credits">{reg.course?.creditUnits ?? 2} cr</span>
            </div>
          {/each}
        </div>
        {#if registeredCourses.length > 8}
          <div class="courses-more">
            <a href="/student/courses">+{registeredCourses.length - 8} more courses</a>
          </div>
        {/if}
      {/if}
    </section>

  </div>
</div>

<style>
  /* ── Layout ──────────────────────────────────────────────── */
  .page { display: flex; flex-direction: column; gap: 1.5rem; }

  /* ── Welcome ─────────────────────────────────────────────── */
  .welcome-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .welcome-greet {
    display: inline-flex; align-items: center; gap: .4rem;
    font-size: .78rem; font-weight: 500; margin-bottom: .375rem;
    color: color-mix(in srgb, var(--accent, #16a34a) 80%, #000);
    background: color-mix(in srgb, var(--accent, #16a34a) 8%, transparent);
    padding: .3rem .75rem; border-radius: 20px;
  }
  :global(.greet-spark) { color: var(--accent, #16a34a); }
  .welcome-greet strong { font-weight: 800; }
  .welcome-title {
    font-size: 1.55rem; font-weight: 900; color: var(--color-text);
    letter-spacing: -.03em; line-height: 1.15; margin: 0 0 .5rem;
  }
  .welcome-meta { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
  .meta-chip {
    display: inline-flex; align-items: center; gap: .3rem;
    font-size: .7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: .2rem .6rem; border-radius: 20px;
  }
  .chip-score {
    color: color-mix(in srgb, var(--accent, #16a34a) 80%, #000);
    background: color-mix(in srgb, var(--accent, #16a34a) 8%, transparent);
    border-color: transparent;
  }
  .exam-now-btn {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .625rem 1.25rem;
    background: var(--accent, #16a34a); color: #fff;
    border-radius: 10px; font-size: .83rem; font-weight: 800;
    text-decoration: none; white-space: nowrap;
    animation: pulse-btn 2s ease-in-out infinite;
  }
  .exam-now-btn:hover { filter: brightness(.9); animation: none; }

  /* ── Stats row ───────────────────────────────────────────── */
  .stats-row {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem;
  }
  @media (max-width: 640px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }

  .stat-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; padding: 1rem;
    display: flex; align-items: center; gap: .75rem;
    position: relative; overflow: hidden; transition: border-color .15s;
    text-decoration: none; color: inherit;
  }
  a.stat-card:hover { border-color: var(--accent, #16a34a); background: color-mix(in srgb, var(--accent, #16a34a) 3%, var(--color-surface)); }
  .card-active { border-color: color-mix(in srgb, var(--accent, #16a34a) 40%, transparent) !important; }

  .stat-icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .icon-live    { background: color-mix(in srgb, var(--accent, #16a34a) 12%, transparent); color: var(--accent, #16a34a); }
  .icon-neutral { background: var(--color-bg); color: var(--color-muted); }
  .icon-soon    { background: color-mix(in srgb, #0ea5e9 10%, transparent); color: #0ea5e9; }
  .icon-done    { background: color-mix(in srgb, #10b981 10%, transparent); color: #10b981; }
  .icon-avg     { background: color-mix(in srgb, #a855f7 10%, transparent); color: #a855f7; }

  .stat-body { display: flex; flex-direction: column; }
  .stat-val {
    font-size: 1.6rem; font-weight: 900; color: var(--color-text);
    letter-spacing: -.04em; line-height: 1;
  }
  .stat-val.good { color: var(--accent, #16a34a); }
  .pct { font-size: .9rem; font-weight: 600; opacity: .6; }
  .stat-lbl {
    font-size: .68rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: .05em; color: var(--color-muted); margin-top: .15rem;
  }
  .live-pulse {
    position: absolute; top: 10px; right: 10px;
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent, #16a34a);
    animation: pulse-ring 1.5s ease-in-out infinite;
  }

  /* ── Main grid ───────────────────────────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .875rem;
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
    padding: .875rem 1.125rem; border-bottom: 1px solid var(--color-border);
  }
  .card-head-l {
    display: flex; align-items: center; gap: .5rem;
    color: var(--accent, #16a34a);
  }
  .card-head-l h2 { font-size: .85rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .see-all {
    display: inline-flex; align-items: center; gap: .15rem;
    font-size: .7rem; font-weight: 600; color: var(--accent, #16a34a);
    text-decoration: none;
  }
  .see-all:hover { text-decoration: underline; }
  .count-chip {
    font-size: .65rem; font-weight: 800;
    padding: .1rem .45rem; border-radius: 999px;
    background: color-mix(in srgb, var(--accent, #16a34a) 12%, transparent);
    color: var(--accent, #16a34a);
  }

  /* ── Results ─────────────────────────────────────────────── */
  .results-list { display: flex; flex-direction: column; }
  .result-row {
    display: flex; align-items: center; gap: .75rem;
    padding: .75rem 1.125rem; border-bottom: 1px solid var(--color-border);
    text-decoration: none; transition: background .12s;
  }
  .result-row:last-child { border-bottom: none; }
  .result-row:hover { background: var(--color-bg); }

  .grade-badge {
    width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: .8rem; font-weight: 900;
  }
  .grade-a { background: color-mix(in srgb, #22c55e 12%, transparent); color: #065f46; }
  .grade-b { background: color-mix(in srgb, #38bdf8 12%, transparent); color: #0369a1; }
  .grade-c { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #92400e; }
  .grade-d { background: color-mix(in srgb, #f97316 12%, transparent); color: #9a3412; }
  .grade-f { background: color-mix(in srgb, #ef4444 12%, transparent); color: #991b1b; }
  :global(.dark) .grade-a { color: #4ade80; }
  :global(.dark) .grade-b { color: #38bdf8; }
  :global(.dark) .grade-c { color: #fbbf24; }
  :global(.dark) .grade-d { color: #fb923c; }
  :global(.dark) .grade-f { color: #f87171; }

  .result-info { flex: 1; min-width: 0; }
  .result-title {
    font-size: .8rem; font-weight: 600; color: var(--color-text);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .result-meta { font-size: .68rem; color: var(--color-muted); }
  .result-bar-wrap { width: 60px; flex-shrink: 0; }
  .result-bar { height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
  .result-fill { height: 100%; border-radius: 2px; transition: width .4s ease; }
  .grade-a-fill { background: #22c55e; }
  .grade-b-fill { background: #38bdf8; }
  .grade-c-fill { background: #f59e0b; }
  .grade-d-fill { background: #f97316; }
  .grade-f-fill { background: #ef4444; }

  /* ── Performance ──────────────────────────────────────────── */
  .improvement-chip {
    display: inline-flex; align-items: center; gap: .3rem;
    font-size: .7rem; font-weight: 700;
    padding: .2rem .6rem; border-radius: 20px;
    background: var(--color-bg); color: var(--color-muted);
  }
  .chip-up   { background: color-mix(in srgb, #22c55e 10%, transparent); color: #065f46; }
  .chip-down { background: color-mix(in srgb, #ef4444 10%, transparent); color: #991b1b; }
  :global(.dark) .chip-up   { color: #4ade80; }
  :global(.dark) .chip-down { color: #f87171; }

  .perf-body { padding: 1rem 1.125rem; display: flex; flex-direction: column; gap: 1rem; }

  /* Sparkline */
  .sparkline-wrap { display: flex; flex-direction: column; gap: .25rem; }
  .sparkline { width: 100%; height: 36px; overflow: visible; }
  .spark-line { stroke: var(--accent, #16a34a); }
  .spark-fill { fill: color-mix(in srgb, var(--accent, #16a34a) 10%, transparent); }
  .spark-labels {
    display: flex; justify-content: space-between;
    font-size: .62rem; color: var(--color-muted);
  }

  /* Grade distribution */
  .grade-dist { display: flex; flex-direction: column; gap: .375rem; }
  .dist-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); margin-bottom: .25rem; }
  .dist-bars { display: flex; flex-direction: column; gap: .3rem; }
  .dist-row { display: flex; align-items: center; gap: .5rem; }
  .dist-letter { font-size: .7rem; font-weight: 800; width: 12px; color: var(--color-muted); flex-shrink: 0; }
  .dist-track { flex: 1; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
  .dist-fill { height: 100%; border-radius: 3px; transition: width .6s ease; min-width: 2px; }
  .dist-count { font-size: .68rem; font-weight: 700; color: var(--color-muted); width: 16px; text-align: right; flex-shrink: 0; }

  /* Top subject */
  .top-subject {
    display: flex; align-items: center; gap: .5rem;
    padding: .625rem .875rem;
    background: color-mix(in srgb, var(--accent, #16a34a) 6%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--accent, #16a34a) 18%, transparent);
    border-radius: 8px;
  }
  .top-subject-label {
    font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    color: var(--color-muted); flex-shrink: 0;
  }
  .top-subject-val { flex: 1; font-size: .8rem; font-weight: 700; color: var(--color-text); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .top-subject-score {
    font-size: .8rem; font-weight: 900; flex-shrink: 0;
    color: color-mix(in srgb, var(--accent, #16a34a) 80%, #000);
  }

  /* ── Courses ─────────────────────────────────────────────── */
  .courses-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  }
  @media (max-width: 600px) { .courses-grid { grid-template-columns: 1fr; } }

  .course-item {
    display: flex; align-items: center; gap: .625rem;
    padding: .65rem 1.125rem; border-bottom: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
  }
  /* Remove right border for even items (right column) */
  .course-item:nth-child(2n) { border-right: none; }
  /* Remove bottom border on last two items */
  .course-item:nth-last-child(-n+2) { border-bottom: none; }
  @media (max-width: 600px) {
    .course-item { border-right: none; }
    .course-item:last-child { border-bottom: none; }
    .course-item:nth-last-child(2) { border-bottom: 1px solid var(--color-border); }
  }

  .course-icon {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    background: color-mix(in srgb, var(--accent, #16a34a) 8%, transparent);
    color: color-mix(in srgb, var(--accent, #16a34a) 80%, #000);
    display: flex; align-items: center; justify-content: center;
  }
  .course-info { flex: 1; min-width: 0; }
  .course-code {
    display: block; font-size: .68rem; font-weight: 800;
    color: color-mix(in srgb, var(--accent, #16a34a) 80%, #000);
    text-transform: uppercase; letter-spacing: .04em;
  }
  .course-title {
    display: block; font-size: .75rem; color: var(--color-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .course-credits {
    font-size: .65rem; font-weight: 700; flex-shrink: 0;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); padding: .15rem .45rem; border-radius: 6px;
  }
  .courses-more {
    padding: .5rem 1.125rem; border-top: 1px solid var(--color-border); text-align: center;
  }
  .courses-more a {
    font-size: .72rem; font-weight: 600;
    color: var(--accent, #16a34a); text-decoration: none;
  }
  .courses-more a:hover { text-decoration: underline; }
  .register-link {
    display: inline-block; margin-top: .35rem;
    font-size: .75rem; font-weight: 700;
    color: var(--accent, #16a34a); text-decoration: none;
  }

  /* ── Empty ───────────────────────────────────────────────── */
  .empty {
    display: flex; flex-direction: column; align-items: center; gap: .5rem;
    padding: 2rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty p    { font-size: .82rem; font-weight: 600; margin: 0; color: var(--color-text); }
  .empty span { font-size: .72rem; }
  .empty.sm   { padding: 1.25rem 1rem; }

  /* ── Animations ──────────────────────────────────────────── */
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent, #16a34a) 40%, transparent); }
    70%  { box-shadow: 0 0 0 8px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  @keyframes pulse-btn {
    0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent, #16a34a) 40%, transparent); }
    50%     { box-shadow: 0 4px 20px color-mix(in srgb, var(--accent, #16a34a) 35%, transparent); }
  }
</style>