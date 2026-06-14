<!-- src/routes/student/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Award, TrendingUp, CheckCircle2, XCircle,
    Clock, Calendar, Target, ChevronRight, AlertTriangle, BarChart3
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const results = $derived(data.results ?? []);
  const summary = $derived(data.summary ?? {});

  let filter = $state<'all' | 'passed' | 'failed'>('all');

  const filtered = $derived(
    filter === 'all'    ? results :
    filter === 'passed' ? results.filter(r => r.passed) :
                          results.filter(r => !r.passed && r.passed !== null)
  );

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
  }

  function formatTime(secs: number | null | undefined) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
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
      <h1 class="page-title">My Results</h1>
      <p class="page-sub">{summary.total ?? 0} exam{(summary.total ?? 0) !== 1 ? 's' : ''} taken</p>
    </div>
  </div>

  <!-- ── Summary cards ─────────────────────────────────────── -->
  {#if (summary.total ?? 0) > 0}
    <div class="summary-row">
      <div class="sum-card">
        <div class="sum-icon avg-icon"><BarChart3 size={16} /></div>
        <div class="sum-body">
          <span class="sum-val">{summary.avgPct}%</span>
          <span class="sum-lbl">Average score</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon best-icon"><TrendingUp size={16} /></div>
        <div class="sum-body">
          <span class="sum-val good">{summary.bestPct}%</span>
          <span class="sum-lbl">Best score</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon pass-icon"><CheckCircle2 size={16} /></div>
        <div class="sum-body">
          <span class="sum-val good">{summary.passed}</span>
          <span class="sum-lbl">Passed</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon fail-icon"><XCircle size={16} /></div>
        <div class="sum-body">
          <span class="sum-val" class:bad={summary.failed > 0}>{summary.failed}</span>
          <span class="sum-lbl">Failed</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── Filter tabs ────────────────────────────────────────── -->
  <div class="filter-bar">
    {#each [['all','All'], ['passed','Passed'], ['failed','Failed']] as [val, label]}
      <button
        class="filter-btn"
        class:active={filter === val}
        onclick={() => filter = val as any}
        type="button"
      >{label}</button>
    {/each}
  </div>

  <!-- ── Results list ───────────────────────────────────────── -->
  {#if filtered.length === 0}
    <div class="empty">
      <Award size={36} strokeWidth={1.2} />
      <h3>No results yet</h3>
      <p>Complete an exam to see your results here.</p>
    </div>
  {:else}
    <div class="results-list">
      {#each filtered as result}
        {@const pct = Math.round(Number(result.percentage ?? 0))}
        <div class="result-card">
          <div class="result-left">
            <div class="grade-circle {gradeColor(pct)}">
              {result.grade ?? '?'}
            </div>
          </div>
          <div class="result-main">
            <div class="result-top">
              <div class="result-title-row">
                <span class="course-code">{result.exam?.course?.code}</span>
                <h3 class="result-title">{result.exam?.title}</h3>
              </div>
              <div class="result-score">
                <span class="score-big {gradeColor(pct)}">{pct}%</span>
                <span class="score-raw">{result.correct ?? '—'}/{result.totalQuestions ?? '—'} correct</span>
              </div>
            </div>

            <div class="result-bar-wrap">
              <div class="result-bar">
                <div class="result-fill {gradeColor(pct)}-fill" style="width:{pct}%"></div>
                <!-- Pass mark line -->
                {#if result.exam?.passMark}
                  {@const passPct = Math.round((result.exam.passMark / (result.exam.totalMarks ?? 100)) * 100)}
                  <div class="pass-line" style="left:{passPct}%"></div>
                {/if}
              </div>
            </div>

            <div class="result-meta">
              <span class="meta-item">
                <Calendar size={11} />{formatDate(result.submittedAt)}
              </span>
              <span class="meta-item">
                <Clock size={11} />{formatTime(result.timeTakenSecs)}
              </span>
              <span class="meta-item">
                <Target size={11} />{result.answered ?? 0}/{result.totalQuestions ?? 0} answered
              </span>
              {#if result.violationCount > 0}
                <span class="meta-item warn-item">
                  <AlertTriangle size={11} />{result.violationCount} violation{result.violationCount !== 1 ? 's' : ''}
                </span>
              {/if}
              <span class="status-chip" class:chip-pass={result.passed} class:chip-fail={!result.passed}>
                {result.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; }
  .page-title { font-size: 1.5rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.03em; margin: 0 0 0.2rem; }
  .page-sub { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  /* Summary */
  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
  @media (max-width: 640px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }
  .sum-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 12px; padding: 0.875rem; display: flex; align-items: center; gap: 0.75rem;
  }
  .sum-icon {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .avg-icon  { background: rgba(99,102,241,0.1); color: #6366f1; }
  .best-icon { background: rgba(16,185,129,0.1); color: #10b981; }
  .pass-icon { background: rgba(22,163,74,0.1);  color: var(--g600); }
  .fail-icon { background: rgba(220,38,38,0.06); color: #dc2626; }
  .sum-body { display: flex; flex-direction: column; }
  .sum-val { font-size: 1.4rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.04em; line-height: 1; }
  .sum-val.good { color: var(--g600); }
  .sum-val.bad  { color: #dc2626; }
  .sum-lbl { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-top: 0.15rem; }

  /* Filter */
  .filter-bar { display: flex; gap: 0.375rem; }
  .filter-btn {
    padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
    border: 1px solid var(--color-border); background: var(--color-surface);
    color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .filter-btn:hover { color: var(--color-text); border-color: var(--g600); }
  .filter-btn.active { background: var(--g600); color: #fff; border-color: var(--g600); }

  /* Results list */
  .results-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .result-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; padding: 1.125rem;
    display: flex; gap: 1rem; transition: border-color 0.15s;
  }
  .result-card:hover { border-color: var(--g600); }

  .grade-circle {
    width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 900;
  }
  .grade-a { background: rgba(22,163,74,0.12);  color: #065f46; }
  .grade-b { background: rgba(14,165,233,0.12); color: #0369a1; }
  .grade-c { background: rgba(245,158,11,0.12); color: #92400e; }
  .grade-d { background: rgba(249,115,22,0.12); color: #9a3412; }
  .grade-f { background: rgba(220,38,38,0.12);  color: #991b1b; }
  :global(.dark) .grade-a { color: #4ade80; background: rgba(22,163,74,0.18); }
  :global(.dark) .grade-b { color: #38bdf8; }
  :global(.dark) .grade-f { color: #f87171; }

  .result-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.625rem; }
  .result-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .result-title-row { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .course-code {
    font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--g700);
  }
  :global(.dark) .course-code { color: var(--g400); }
  .result-title {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .result-score { text-align: right; flex-shrink: 0; }
  .score-big {
    display: block; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.04em; line-height: 1;
  }
  .score-raw { font-size: 0.65rem; color: var(--color-muted); }

  .result-bar-wrap { width: 100%; }
  .result-bar {
    height: 6px; background: var(--color-bg); border-radius: 3px;
    overflow: visible; position: relative;
  }
  .result-fill { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
  .grade-a-fill { background: var(--g500); }
  .grade-b-fill { background: #38bdf8; }
  .grade-c-fill { background: #f59e0b; }
  .grade-d-fill { background: #f97316; }
  .grade-f-fill { background: #ef4444; }
  .pass-line {
    position: absolute; top: -3px; bottom: -3px; width: 2px;
    background: rgba(0,0,0,0.2); border-radius: 2px;
    transform: translateX(-50%);
  }
  :global(.dark) .pass-line { background: rgba(255,255,255,0.2); }

  .result-meta {
    display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
    font-size: 0.7rem; color: var(--color-muted);
  }
  .meta-item { display: flex; align-items: center; gap: 0.25rem; }
  .warn-item { color: #f59e0b; }
  .status-chip {
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.18rem 0.55rem; border-radius: 20px;
    margin-left: auto;
  }
  .chip-pass { background: rgba(22,163,74,0.12); color: var(--g700); }
  .chip-fail { background: rgba(220,38,38,0.1);  color: #991b1b; }
  :global(.dark) .chip-pass { color: var(--g400); }
  :global(.dark) .chip-fail { color: #f87171; }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 4rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .empty p  { font-size: 0.8rem; margin: 0; }
</style>