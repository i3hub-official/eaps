<!-- src/routes/student/results/+page.svelte -->

<script lang="ts">
  import { BarChart2, CheckCircle, XCircle, Clock, BookOpen } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const passed = $derived(data.results.filter(r => r.passed).length);
  const avg = $derived(
    data.results.length
      ? data.results.reduce((a, r) => a + Number(r.percentage ?? 0), 0) / data.results.length
      : 0
  );

  const GRADE_COLORS: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#d97706',
    D: '#9333ea', E: '#dc2626', F: '#dc2626',
  };

  function formatDate(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  function formatDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }
</script>

<svelte:head><title>My Results — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-icon"><BarChart2 size={20} /></div>
    <div>
      <h1>My Results</h1>
      <p class="sub">{data.results.length} exam{data.results.length !== 1 ? 's' : ''} taken</p>
    </div>
  </div>

  {#if data.results.length === 0}
    <div class="empty">
      <BookOpen size={40} />
      <p>No exam results yet.</p>
      <span>Results will appear here once you complete an exam.</span>
    </div>
  {:else}
    <!-- Summary cards -->
  <div class="summary-grid">
  <div class="summary-card">
    <span class="sv">{data.results.length}</span>
    <span class="sl">Exams Taken</span>
  </div>
  <div class="summary-card green">
    <span class="sv">{passed}</span>
    <span class="sl">Passed</span>
  </div>
  <div class="summary-card red">
    <span class="sv">{data.results.length - passed}</span>
    <span class="sl">Failed</span>
  </div>
  <div class="summary-card">
    <span class="sv">{avg.toFixed(1)}%</span>
    <span class="sl">Avg Score</span>
  </div>
</div>

    <!-- Results list -->
    <div class="results-list">
      {#each data.results as r}
        <div class="result-card" class:pass={r.passed} class:fail={!r.passed}>

          <!-- Left accent -->
          <div class="card-accent"></div>

          <!-- Course + exam -->
          <div class="card-main">
            <div class="card-top">
              <span class="course-code">{r.exam.course.code}</span>
              <span class="exam-title">{r.exam.title}</span>
            </div>
            <div class="card-meta">
              <span class="meta-item">
                <Clock size={11} />
                {formatDate(r.submittedAt)}
              </span>
              <span class="meta-item">
                <Clock size={11} />
                {formatDuration(r.timeTakenSecs)}
              </span>
              {#if r.violationCount > 0}
                <span class="meta-item violation">
                  ⚠ {r.violationCount} violation{r.violationCount !== 1 ? 's' : ''}
                </span>
              {/if}
            </div>
          </div>

          <!-- Stats -->
          <div class="card-stats">
            <div class="stat">
              <span class="stat-val mono">{r.correct ?? 0}/{r.totalQuestions ?? 0}</span>
              <span class="stat-label">Correct</span>
            </div>
            <div class="stat">
              <span class="stat-val mono">{Number(r.percentage ?? 0).toFixed(1)}%</span>
              <span class="stat-label">Score</span>
            </div>
            <div class="stat">
              <span
                class="grade-badge"
                style="color:{GRADE_COLORS[r.grade ?? 'F']}"
              >{r.grade ?? '—'}</span>
              <span class="stat-label">Grade</span>
            </div>
          </div>

          <!-- Pass/fail badge -->
          <div class="card-status">
            {#if r.passed}
              <span class="status-badge pass">
                <CheckCircle size={13} /> Pass
              </span>
            {:else}
              <span class="status-badge fail">
                <XCircle size={13} /> Fail
              </span>
            {/if}
          </div>

        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 2rem; max-width: 860px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  .page-header { display: flex; align-items: center; gap: 0.875rem; }
  .header-icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
    display: flex; align-items: center; justify-content: center;
    color: #16a34a;
  }
  [data-theme="dark"] .header-icon { color: #22c55e; }
  h1  { font-size: 1.3rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--color-text); }
  .sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.1rem 0 0; }

  /* Summary cards */
  .summary-grid { display: flex; gap: 0.875rem; flex-wrap: wrap; }
  .summary-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 0.875rem 1.25rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
    min-width: 100px;
  }
  .summary-card.green .sv { color: #16a34a; }
  .summary-card.red   .sv { color: #dc2626; }
  [data-theme="dark"] .summary-card.green .sv { color: #22c55e; }
  [data-theme="dark"] .summary-card.red   .sv { color: #f87171; }
  .sv { font-size: 1.6rem; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--color-text); }
  .sl { font-size: 0.65rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }

  /* Results list */
  .results-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .result-card {
    display: flex; align-items: center; gap: 1rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; overflow: hidden;
    transition: box-shadow 0.15s;
  }
  .result-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

  .card-accent { width: 4px; align-self: stretch; flex-shrink: 0; background: var(--color-border); }
  .result-card.pass .card-accent { background: #16a34a; }
  .result-card.fail .card-accent { background: #dc2626; }

  .card-main { flex: 1; min-width: 0; padding: 1rem 0; }
  .card-top {
    display: flex; align-items: baseline; gap: 0.6rem;
    flex-wrap: wrap; margin-bottom: 0.35rem;
  }
  .course-code {
    font-size: 0.7rem; font-weight: 800; color: #16a34a;
    text-transform: uppercase; letter-spacing: 0.06em;
    background: rgba(34,197,94,0.08); padding: 0.15rem 0.5rem;
    border-radius: 999px; border: 1px solid rgba(34,197,94,0.2);
    flex-shrink: 0;
  }
  [data-theme="dark"] .course-code { color: #22c55e; }
  .exam-title {
    font-size: 0.875rem; font-weight: 600; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .card-meta { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; }
  .meta-item {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.72rem; color: var(--color-muted);
  }
  .meta-item.violation { color: #d97706; font-weight: 600; }

  .card-stats {
    display: flex; gap: 1.25rem; flex-shrink: 0;
    padding: 1rem;
  }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
  .stat-val { font-size: 1rem; font-weight: 800; color: var(--color-text); }
  .stat-val.mono { font-variant-numeric: tabular-nums; }
  .stat-label { font-size: 0.6rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }

  .grade-badge { font-size: 1.1rem; font-weight: 900; }

  .card-status { padding: 1rem 1rem 1rem 0; flex-shrink: 0; }
  .status-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.72rem; font-weight: 700; padding: 0.3rem 0.7rem;
    border-radius: 999px;
  }
  .status-badge.pass { background: #dcfce7; color: #16a34a; }
  .status-badge.fail { background: #fee2e2; color: #dc2626; }
  [data-theme="dark"] .status-badge.pass { background: rgba(22,163,74,0.15); color: #22c55e; }
  [data-theme="dark"] .status-badge.fail { background: rgba(220,38,38,0.12); color: #fca5a5; }

  /* Empty */
  .empty {
    text-align: center; padding: 4rem 2rem; color: var(--color-muted);
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  }
  .empty p { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0.5rem 0 0; }
  .empty span { font-size: 0.825rem; }

  @media (max-width: 600px) {
    .card-stats { gap: 0.75rem; }
    .stat-val { font-size: 0.875rem; }
    .page { padding: 1rem; }
  }
</style>