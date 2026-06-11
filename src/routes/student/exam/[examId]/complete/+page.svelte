<!-- src/routes/student/exam/[examId]/complete/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { CheckCircle2, Clock, Award, AlertTriangle, FileText } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { exam, session, result } = data;

  onMount(async () => {
    try {
      await fetch('/api/face/clear-verification', { method: 'POST' });
    } catch {
      // ignore
    }
  });

  function fmtDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }
</script>

<svelte:head><title>{exam.title} — Submitted — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="content">

    <div class="card">
      <div class="header">
        <CheckCircle2 size={48} color="#16a34a" />
        <h1>Exam Submitted</h1>
        <p class="sub">Your answers have been recorded.</p>
      </div>

      <div class="exam-info">
        <span class="code">{exam.course.code}</span>
        <h2>{exam.title}</h2>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <Clock size={16} />
          <span class="meta-label">Time taken</span>
          <span class="meta-value">{fmtDuration(session.timeTakenSecs ?? result?.timeTakenSecs ?? null)}</span>
        </div>
        <div class="meta-item">
          <FileText size={16} />
          <span class="meta-label">Status</span>
          <span class="meta-value" class:force={session.status === 'force_submitted'}>
            {session.status === 'force_submitted' ? 'Force Submitted' : 'Submitted'}
          </span>
        </div>
        {#if session.violationCount > 0}
          <div class="meta-item warning">
            <AlertTriangle size={16} />
            <span class="meta-label">Violations</span>
            <span class="meta-value">{session.violationCount}</span>
          </div>
        {/if}
      </div>

      {#if result}
        <div class="result-section">
          <div class="result-header">
            <Award size={20} />
            <h3>Your Result</h3>
          </div>

          <div class="score-ring">
            <span class="score-val">{Number(result.percentage ?? 0).toFixed(1)}</span>
            <span class="score-pct">%</span>
          </div>

          <div class="result-grid">
            <div class="r-item">
              <span class="r-label">Score</span>
              <span class="r-value">{Number(result.score ?? 0).toFixed(1)} / {exam.totalMarks}</span>
            </div>
            <div class="r-item">
              <span class="r-label">Grade</span>
              <span class="r-value grade">{result.grade ?? '—'}</span>
            </div>
            <div class="r-item">
              <span class="r-label">Correct</span>
              <span class="r-value">{result.correct ?? '—'} / {result.totalQuestions ?? '—'}</span>
            </div>
            <div class="r-item">
              <span class="r-label">Status</span>
              <span class="r-value" class:pass={result.passed} class:fail={!result.passed}>
                {result.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          </div>
        </div>
      {:else}
        <div class="pending">
          <p>Your result is being processed. Check back shortly.</p>
        </div>
      {/if}

      <a href="/student/exam" class="back-btn">← Back to My Exams</a>
    </div>

  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'DM Sans', system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .content {
    width: 100%;
    max-width: 480px;
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    text-align: center;
  }

  .header { display: flex; flex-direction: column; align-items: center; gap: .5rem; }
  .header h1 { font-size: 1.25rem; font-weight: 700; margin: 0; }
  .sub { font-size: .875rem; color: var(--color-muted); margin: 0; }

  .exam-info { display: flex; flex-direction: column; gap: .25rem; }
  .code {
    font-size: .65rem;
    font-weight: 700;
    padding: .15rem .5rem;
    background: rgba(34,197,94,.1);
    color: #16a34a;
    border-radius: 999px;
    align-self: center;
  }
  :global(.dark) .code { background: rgba(34,197,94,.15); color: #4ade80; }
  .exam-info h2 { font-size: 1rem; font-weight: 600; margin: 0; }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: .75rem;
    width: 100%;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .25rem;
    padding: .75rem;
    background: var(--color-bg);
    border-radius: .625rem;
    font-size: .75rem;
  }
  .meta-item :global(svg) { color: var(--color-muted); }
  .meta-label { color: var(--color-muted); font-weight: 500; }
  .meta-value { font-weight: 700; font-size: .875rem; }
  .meta-value.force { color: #dc2626; }
  .meta-item.warning { background: #fef2f2; }
  .meta-item.warning :global(svg) { color: #dc2626; }
  .meta-item.warning .meta-value { color: #dc2626; }

  .result-section {
    width: 100%;
    border-top: 1px solid var(--color-border);
    padding-top: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .result-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    font-size: .875rem;
    font-weight: 700;
  }
  .result-header h3 { margin: 0; }

  .score-ring {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: .125rem;
  }
  .score-val { font-size: 3rem; font-weight: 800; line-height: 1; }
  .score-pct { font-size: 1.25rem; font-weight: 600; color: var(--color-muted); }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: .5rem;
  }
  .r-item {
    display: flex;
    flex-direction: column;
    gap: .125rem;
    padding: .625rem;
    background: var(--color-bg);
    border-radius: .5rem;
  }
  .r-label { font-size: .68rem; color: var(--color-muted); font-weight: 500; }
  .r-value { font-size: .875rem; font-weight: 700; }
  .r-value.grade { font-size: 1.25rem; }
  .r-value.pass { color: #16a34a; }
  .r-value.fail { color: #dc2626; }

  .pending {
    padding: 1rem;
    background: var(--color-bg);
    border-radius: .625rem;
    font-size: .875rem;
    color: var(--color-muted);
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: .75rem;
    background: var(--color-primary);
    color: #fff;
    text-decoration: none;
    border-radius: .5rem;
    font-weight: 600;
    font-size: .875rem;
    transition: opacity .15s;
  }
  .back-btn:hover { opacity: 0.9; }
</style>