<script lang="ts">
  import {
    ClipboardList, Clock, Calendar, ArrowRight, AlertCircle,
    Play, CheckCircle2, XCircle, Timer, Zap, Filter
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let filter = $state<'all' | 'upcoming' | 'active' | 'completed'>('all');

  const filtered = $derived(() => {
    let list = data.exams;
    if (filter === 'upcoming') list = list.filter(e => e.status === 'not_started' || e.status === 'scheduled');
    if (filter === 'active') list = list.filter(e => e.status === 'active' || e.status === 'in_progress');
    if (filter === 'completed') list = list.filter(e => e.status === 'submitted' || e.status === 'completed');
    return list;
  });

  function statusConfig(status: string) {
    switch (status) {
      case 'active':
      case 'in_progress':
        return { label: 'In Progress', color: '#16a34a', bg: 'rgba(34,197,94,0.08)', icon: Play };
      case 'submitted':
      case 'completed':
        return { label: 'Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: CheckCircle2 };
      case 'not_started':
      case 'scheduled':
        return { label: 'Upcoming', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Calendar };
      default:
        return { label: status, color: 'var(--color-muted)', bg: 'var(--color-bg)', icon: Clock };
    }
  }

  function formatDate(d: Date | string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function daysUntil(d: Date | string | null) {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  function formatDuration(mins: number) {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
</script>

<div class="exams-page">
  <div class="page-header">
    <div>
      <h1>My Exams</h1>
      <p class="page-sub">{data.meta.session} · Semester {data.meta.semester}</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="filter-tabs">
    <button class="filter-tab" class:active={filter === 'all'} onclick={() => filter = 'all'}>All</button>
    <button class="filter-tab" class:active={filter === 'upcoming'} onclick={() => filter = 'upcoming'}>Upcoming</button>
    <button class="filter-tab" class:active={filter === 'active'} onclick={() => filter = 'active'}>Active</button>
    <button class="filter-tab" class:active={filter === 'completed'} onclick={() => filter = 'completed'}>Completed</button>
  </div>

  <!-- Exam list -->
  <div class="exam-list-page">
    {#each filtered() as exam (exam.id)}
      {@const cfg = statusConfig(exam.status)}
      {@const Icon = cfg.icon}
      <div class="exam-card">
        <div class="exam-card-top">
          <div class="exam-status-badge" style="background: {cfg.bg}; color: {cfg.color};">
            <Icon size={12} /> {cfg.label}
          </div>
          {#if exam.registrationType !== 'normal'}
            <span class="reg-type">{exam.registrationType.replace('_', ' ')}</span>
          {/if}
        </div>
        <h3 class="exam-title">{exam.title}</h3>
        <p class="exam-course">{exam.courseCode} — {exam.courseTitle}</p>
        <div class="exam-meta">
          <span><Clock size={11} /> {formatDuration(exam.durationMinutes)}</span>
          <span><Calendar size={11} /> {formatDate(exam.scheduledStart)}</span>
          <span>Pass: {exam.passMark}/{exam.totalMarks}</span>
        </div>
        {#if exam.scheduledStart}
          {@const days = daysUntil(exam.scheduledStart)}
          {#if days !== null && days <= 3 && days > 0 && exam.status !== 'submitted'}
            <div class="exam-countdown-bar">
              <Zap size={11} /> {days} day{days === 1 ? '' : 's'} until exam
            </div>
          {/if}
        {/if}
        <div class="exam-actions">
          {#if exam.status === 'active' || exam.status === 'in_progress'}
            <a href="/student/exam/{exam.sessionId ?? exam.id}" class="btn-start">
              <Play size={13} /> Resume Exam
            </a>
          {:else if exam.status === 'submitted' || exam.status === 'completed'}
            {#if exam.isGraded}
              <div class="exam-result">
                <span class="result-score" class:pass={exam.score !== null && exam.score >= exam.passMark}>
                  {exam.score ?? 0}/{exam.totalMarks}
                </span>
                {#if exam.violationCount > 0}
                  <span class="violation-badge"><AlertCircle size={10} /> {exam.violationCount}</span>
                {/if}
              </div>
            {:else}
              <span class="pending-grade">Grading…</span>
            {/if}
            <a href="/student/results" class="btn-ghost">View Result <ArrowRight size={11} /></a>
          {:else}
            <span class="btn-ghost disabled">Scheduled</span>
          {/if}
        </div>
      </div>
    {:else}
      <div class="empty-exams">
        <ClipboardList size={32} strokeWidth={1.5} />
        <p>No exams found for this filter.</p>
      </div>
    {/each}
  </div>

  <!-- Results summary -->
  {#if data.results.length > 0}
    <div class="results-summary">
      <div class="section-head">
        <CheckCircle2 size={15} />
        <h2>Recent Results</h2>
        <a href="/student/results" class="section-link">View all <ArrowRight size={11} /></a>
      </div>
      <div class="results-mini">
        {#each data.results.slice(0, 3) as result}
          <div class="result-mini">
            <span class="result-mini-grade" class:pass={result.passed}>{result.grade ?? '—'}</span>
            <div class="result-mini-info">
              <span class="result-mini-title">{result.examTitle}</span>
              <span class="result-mini-code">{result.courseCode ?? '—'}</span>
            </div>
            <span class="result-mini-pct">{result.percentage ?? result.score ?? 0}%</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .exams-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.25rem 0 0; }

  .filter-tabs { display: flex; gap: 0.25rem; flex-wrap: wrap; }
  .filter-tab {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.4rem 0.75rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-surface);
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .filter-tab:hover { border-color: var(--green-600); color: var(--green-600); }
  .filter-tab.active { background: var(--green-600); color: white; border-color: var(--green-600); }

  .exam-list-page {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 0.875rem;
  }
  .exam-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    transition: all 0.15s;
  }
  .exam-card:hover { border-color: var(--green-600); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
  .exam-card-top { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .exam-status-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.5rem; border-radius: 0.3rem;
    font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  }
  .reg-type {
    font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
    padding: 0.15rem 0.4rem; border-radius: 0.2rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .exam-title { font-size: 0.92rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.3; }
  .exam-course { font-size: 0.75rem; color: var(--color-muted); margin: 0; }
  .exam-meta { display: flex; flex-wrap: wrap; gap: 0.625rem; }
  .exam-meta span {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.7rem; color: var(--color-muted);
    padding: 0.15rem 0.4rem; border-radius: 0.25rem; background: var(--color-bg);
  }
  .exam-countdown-bar {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.35rem 0.625rem; border-radius: 0.35rem;
    background: rgba(245,158,11,0.08); color: #92400e;
    font-size: 0.72rem; font-weight: 700;
  }
  .exam-actions { display: flex; align-items: center; justify-content: space-between; gap: 0.625rem; margin-top: 0.25rem; }
  .btn-start {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.5rem 0.875rem; border-radius: 0.45rem;
    background: var(--green-600); color: white;
    font-size: 0.78rem; font-weight: 700; text-decoration: none;
    transition: background 0.15s;
  }
  .btn-start:hover { background: var(--green-700); }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.4rem 0.625rem; border-radius: 0.4rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); font-size: 0.72rem; font-weight: 600;
    text-decoration: none; transition: all 0.15s;
  }
  .btn-ghost:hover:not(.disabled) { border-color: var(--green-600); color: var(--green-600); }
  .btn-ghost.disabled { cursor: default; opacity: 0.6; }
  .exam-result { display: flex; align-items: center; gap: 0.4rem; }
  .result-score { font-size: 0.85rem; font-weight: 800; color: var(--color-text); }
  .result-score.pass { color: var(--green-600); }
  .violation-badge {
    display: inline-flex; align-items: center; gap: 0.15rem;
    padding: 0.1rem 0.3rem; border-radius: 0.2rem;
    background: rgba(220,38,38,0.08); color: #dc2626;
    font-size: 0.6rem; font-weight: 700;
  }
  .pending-grade { font-size: 0.72rem; color: var(--color-muted); font-style: italic; }
  .empty-exams {
    grid-column: 1 / -1;
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 3rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-exams p { margin: 0; font-size: 0.82rem; }

  .results-summary {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .section-head {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.875rem 1.125rem; border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
  }
  .section-head h2 { margin: 0; font-size: inherit; font-weight: inherit; }
  .section-link {
    margin-left: auto;
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.12s;
  }
  .section-link:hover { color: var(--green-600); }
  .results-mini { display: flex; flex-direction: column; }
  .result-mini {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 1.125rem; border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .result-mini:last-child { border-bottom: none; }
  .result-mini:hover { background: var(--color-bg); }
  .result-mini-grade {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800; color: white;
    background: var(--color-border); color: var(--color-muted);
  }
  .result-mini-grade.pass { background: var(--green-600); color: white; }
  .result-mini-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .result-mini-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .result-mini-code { font-size: 0.7rem; color: var(--color-muted); font-family: monospace; }
  .result-mini-pct { font-size: 0.85rem; font-weight: 800; color: var(--color-text); flex-shrink: 0; }
</style>