<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Calendar, Clock, Award, AlertTriangle, CheckCircle2, XCircle, ArrowRight, FileText, TrendingUp } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exams, results } = data;

  const active   = exams.filter(e => e.status === 'active' || e.status === 'in_progress');
  const upcoming = exams.filter(e => e.status === 'not_started' && e.scheduledStart && new Date(e.scheduledStart) > new Date());
  const past     = exams.filter(e => e.status === 'submitted' || e.status === 'force_submitted' || e.status === 'flagged');

  function fmtDate(d: Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtRelative(d: Date | null) {
    if (!d) return '';
    const diff = new Date(d).getTime() - Date.now();
    const mins = Math.floor(Math.abs(diff) / 60_000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (diff < 0) return 'ended';
    if (mins < 60) return `in ${mins}m`;
    if (hrs < 24)  return `in ${hrs}h`;
    return `in ${days}d`;
  }

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    active:           { label: 'Live', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
    in_progress:      { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', icon: TrendingUp },
    not_started:      { label: 'Upcoming', color: '#d97706', bg: '#fffbeb', icon: Calendar },
    submitted:        { label: 'Submitted', color: '#6b7280', bg: '#f9fafb', icon: FileText },
    force_submitted:  { label: 'Force Submitted', color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
    flagged:          { label: 'Flagged', color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
  };
</script>

<svelte:head><title>My Exams — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="content">

    <!-- Header -->
    <div class="page-header">
      <h1>My Exams</h1>
      <p class="sub">{exams.length} exam{exams.length !== 1 ? 's' : ''} assigned</p>
    </div>

    <!-- Active / Live -->
    {#if active.length > 0}
      <section>
        <div class="sec-head">
          <span class="live-dot"></span>
          <h2>Active Now</h2>
          <span class="sec-count">{active.length}</span>
        </div>
        <div class="card-grid">
          {#each active as exam}
            {@const cfg = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.not_started}
            <div class="card card--live">
              <div class="card-header">
                <span class="code-tag">{exam.courseCode}</span>
                <span class="status-badge" style="color:{cfg.color};background:{cfg.bg}">
                  <svelte:component this={cfg.icon} size={11} />
                  {cfg.label}
                </span>
              </div>
              <h3>{exam.title}</h3>
              <div class="card-meta">
                <span><Clock size={12} /> {exam.durationMinutes} min</span>
                <span class="meta-sep">·</span>
                <span>{exam.totalMarks} marks</span>
                <span class="meta-sep">·</span>
                <span>Pass {exam.passMark}</span>
              </div>
              {#if exam.scheduledEnd}
                <p class="card-date">Ends {fmtRelative(exam.scheduledEnd)}</p>
              {/if}
              <a href={`/student/exams/${exam.sessionId}`} class="card-btn card-btn--enter">
                Resume Exam
                <ArrowRight size={14} />
              </a>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Upcoming -->
    {#if upcoming.length > 0}
      <section>
        <div class="sec-head">
          <Calendar size={13} />
          <h2>Upcoming</h2>
          <span class="sec-count">{upcoming.length}</span>
        </div>
        <div class="card-grid">
          {#each upcoming as exam}
            <div class="card card--upcoming">
              <div class="card-header">
                <span class="code-tag">{exam.courseCode}</span>
                <span class="time-tag">{fmtRelative(exam.scheduledStart)}</span>
              </div>
              <h3>{exam.title}</h3>
              <div class="card-meta">
                <span><Clock size={12} /> {exam.durationMinutes} min</span>
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

    <!-- Past / Results -->
    {#if past.length > 0 || results.length > 0}
      <section>
        <div class="sec-head">
          <Award size={13} />
          <h2>History & Results</h2>
        </div>

        <!-- Result rows -->
        {#if results.length > 0}
          <div class="results-table">
            <div class="results-head">
              <span>Course</span>
              <span>Exam</span>
              <span>Score</span>
              <span>Grade</span>
              <span>Status</span>
            </div>
            {#each results as r}
              <div class="result-row">
                <span class="r-course">{r.courseCode ?? '—'}</span>
                <span class="r-title">{r.examTitle}</span>
                <span class="r-score">{r.percentage ? `${Number(r.percentage).toFixed(1)}%` : '—'}</span>
                <span class="r-grade">{r.grade ?? '—'}</span>
                <span class="pass-tag" class:pass={r.passed} class:fail={!r.passed}>
                  {#if r.passed}
                    <CheckCircle2 size={10} /> Pass
                  {:else}
                    <XCircle size={10} /> Fail
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Past exam cards -->
        {#if past.length > 0}
          <div class="card-grid" style="margin-top: 1rem">
            {#each past as exam}
              {@const cfg = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.submitted}
              <div class="card card--past">
                <div class="card-header">
                  <span class="code-tag">{exam.courseCode}</span>
                  <span class="status-badge" style="color:{cfg.color};background:{cfg.bg}">
                    <svelte:component this={cfg.icon} size={11} />
                    {cfg.label}
                  </span>
                </div>
                <h3>{exam.title}</h3>
                {#if exam.score !== null}
                  <div class="past-score">
                    <span class="past-score-val">{Number(exam.score).toFixed(1)}</span>
                    <span class="past-score-total">/ {exam.totalMarks}</span>
                  </div>
                {/if}
                {#if exam.violationCount > 0}
                  <p class="violation-note">
                    <AlertTriangle size={10} /> {exam.violationCount} violation{exam.violationCount > 1 ? 's' : ''}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <!-- Empty -->
    {#if exams.length === 0}
      <div class="empty">
        <FileText size={40} opacity={0.25} />
        <p class="empty-title">No exams yet</p>
        <p class="empty-sub">Assigned exams will appear here when scheduled by your lecturer.</p>
      </div>
    {/if}

  </div>
</div>

<style>
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

  .page-header h1 {
    font-size: clamp(1.4rem, 3vw, 1.75rem);
    font-weight: 800;
    letter-spacing: -.03em;
    line-height: 1.2;
  }
  .sub {
    margin-top: .375rem;
    font-size: .875rem;
    color: var(--color-muted);
  }

  section { display: flex; flex-direction: column; gap: .875rem; }

  .sec-head {
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .sec-head h2 {
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
  .card--upcoming { border-style: dashed; }
  .card--past { opacity: 0.85; }

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
  :global(.dark) .code-tag { background: rgba(34,197,94,.15); color: #4ade80; }

  .status-badge {
    font-size: .6rem;
    font-weight: 700;
    padding: .2rem .5rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: .25rem;
  }

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
  .card-meta :global(svg) { flex-shrink: 0; }
  .meta-sep { opacity: .4; }

  .card-date {
    font-size: .72rem;
    color: var(--color-muted);
  }

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
  .card-btn--waiting {
    background: var(--color-border);
    color: var(--color-muted);
  }

  .past-score {
    display: flex;
    align-items: baseline;
    gap: .25rem;
  }
  .past-score-val {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
  }
  .past-score-total {
    font-size: .75rem;
    color: var(--color-muted);
  }

  .violation-note {
    font-size: .72rem;
    color: #dc2626;
    display: flex;
    align-items: center;
    gap: .25rem;
  }

  /* Results table */
  .results-table {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    overflow: hidden;
  }
  .results-head {
    display: grid;
    grid-template-columns: 72px 1fr 65px 44px 70px;
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
    grid-template-columns: 72px 1fr 65px 44px 70px;
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
    display: flex;
    align-items: center;
    gap: .25rem;
  }
  .pass-tag.pass { background: #dcfce7; color: #16a34a; }
  .pass-tag.fail { background: #fee2e2; color: #dc2626; }
  :global(.dark) .pass-tag.pass { background: rgba(34,197,94,.15); color: #4ade80; }
  :global(.dark) .pass-tag.fail { background: rgba(220,38,38,.15); color: #f87171; }

  /* Empty */
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

  @media (max-width: 640px) {
    .content  { padding: 1.25rem 1rem 3rem; }
    .results-head,
    .result-row { grid-template-columns: 56px 1fr 56px 36px 60px; gap: .5rem; padding: .75rem .875rem; }
  }
</style>