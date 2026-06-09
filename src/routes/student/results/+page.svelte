<script lang="ts">
  import {
    BarChart3, Award, TrendingUp, XCircle, CheckCircle2,
    Clock, Calendar, AlertTriangle, ArrowRight, BookOpen,
    FileText, Filter
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let filter = $state<'all' | 'passed' | 'failed'>('all');
  let search = $state('');

  const filtered = $derived(() => {
    let list = data.results;
    if (filter === 'passed') list = list.filter(r => r.passed);
    if (filter === 'failed') list = list.filter(r => !r.passed);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.examTitle.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q)
      );
    }
    return list;
  });

  function gradeColor(g: string | null) {
    if (!g) return 'var(--color-muted)';
    if (['A', 'B'].includes(g)) return 'var(--green-600)';
    if (['C', 'D'].includes(g)) return 'var(--blue-500)';
    if (['E'].includes(g)) return '#f59e0b';
    return '#dc2626';
  }

  function formatDate(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDuration(mins: number) {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
</script>

<div class="results-page">
  <div class="page-header">
    <div>
      <h1>My Results</h1>
      <p class="page-sub">View all your exam results and performance history</p>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-box-icon" style="background: var(--green-soft); color: var(--green-600);">
        <BarChart3 size={18} />
      </div>
      <div>
        <span class="stat-box-value">{data.stats.totalExams}</span>
        <span class="stat-box-label">Total Exams</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-box-icon" style="background: var(--green-soft); color: var(--green-600);">
        <CheckCircle2 size={18} />
      </div>
      <div>
        <span class="stat-box-value">{data.stats.passedExams}</span>
        <span class="stat-box-label">Passed</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-box-icon" style="background: rgba(220,38,38,0.08); color: #dc2626;">
        <XCircle size={18} />
      </div>
      <div>
        <span class="stat-box-value">{data.stats.failedExams}</span>
        <span class="stat-box-label">Failed</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-box-icon" style="background: var(--blue-soft); color: var(--blue-500);">
        <TrendingUp size={18} />
      </div>
      <div>
        <span class="stat-box-value">{data.stats.avgPercentage}%</span>
        <span class="stat-box-label">Average</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-box-icon" style="background: var(--teal-soft); color: var(--teal-500);">
        <BookOpen size={18} />
      </div>
      <div>
        <span class="stat-box-value">{data.stats.totalCreditUnits}</span>
        <span class="stat-box-label">Credits Earned</span>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <div class="filter-bar">
    <div class="filter-tabs">
      <button class="filter-tab" class:active={filter === 'all'} onclick={() => filter = 'all'}>All</button>
      <button class="filter-tab" class:active={filter === 'passed'} onclick={() => filter = 'passed'}>
        <CheckCircle2 size={12} /> Passed
      </button>
      <button class="filter-tab" class:active={filter === 'failed'} onclick={() => filter = 'failed'}>
        <XCircle size={12} /> Failed
      </button>
    </div>
    <div class="search-box">
      <Filter size={13} />
      <input type="text" placeholder="Search by course or exam..." bind:value={search} />
    </div>
  </div>

  <!-- Results table -->
  <div class="results-table-wrap">
    <table class="results-table">
      <thead>
        <tr>
          <th>Exam</th>
          <th>Course</th>
          <th>Score</th>
          <th>Grade</th>
          <th>Status</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each filtered() as result (result.id)}
          <tr>
            <td>
              <div class="cell-exam">
                <span class="cell-title">{result.examTitle}</span>
                <span class="cell-meta"><Clock size={11} /> {formatDuration(result.durationMinutes)}</span>
              </div>
            </td>
            <td>
              <span class="cell-course">{result.courseCode}</span>
              <span class="cell-course-title">{result.courseTitle}</span>
            </td>
            <td>
              <div class="cell-score">
                <div class="score-bar">
                  <div class="score-fill" style="width: {Math.min(result.percentage ?? 0, 100)}%; background: {gradeColor(result.grade)}"></div>
                </div>
                <span class="score-num">{result.score ?? 0}/{result.totalMarks}</span>
              </div>
            </td>
            <td>
              <span class="grade-badge" style="background: {gradeColor(result.grade)}20; color: {gradeColor(result.grade)}; border-color: {gradeColor(result.grade)}30;">
                {result.grade ?? '—'}
              </span>
            </td>
            <td>
              {#if result.passed}
                <span class="status-badge pass"><CheckCircle2 size={11} /> Passed</span>
              {:else}
                <span class="status-badge fail"><XCircle size={11} /> Failed</span>
              {/if}
            </td>
            <td>
              <span class="cell-date">{formatDate(result.submittedAt)}</span>
            </td>
            <td>
              <a href="/student/results/{result.id}" class="view-link"><ArrowRight size={14} /></a>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="empty-cell">
              <div class="empty-table">
                <FileText size={28} strokeWidth={1.5} />
                <p>No results found.</p>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .results-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.25rem 0 0; }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
  }
  @media (max-width: 900px) {
    .stats-row { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 560px) {
    .stats-row { grid-template-columns: repeat(2, 1fr); }
  }
  .stat-box {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.875rem; border-radius: var(--radius-card);
    background: var(--color-surface); border: 1px solid var(--color-border);
  }
  .stat-box-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-box-value { display: block; font-size: 1.1rem; font-weight: 800; color: var(--color-text); }
  .stat-box-label { display: block; font-size: 0.68rem; color: var(--color-muted); }

  .filter-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .filter-tabs { display: flex; gap: 0.25rem; }
  .filter-tab {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.4rem 0.75rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-surface);
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .filter-tab:hover { border-color: var(--green-600); color: var(--green-600); }
  .filter-tab.active { background: var(--green-600); color: white; border-color: var(--green-600); }
  .search-box {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.625rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-surface);
    min-width: 220px;
  }
  .search-box input {
    border: none; background: none; outline: none;
    font-size: 0.78rem; color: var(--color-text); width: 100%; font-family: inherit;
  }
  .search-box input::placeholder { color: var(--color-muted); }

  .results-table-wrap {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .results-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  .results-table thead th {
    text-align: left; padding: 0.75rem 1rem;
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted);
    background: var(--color-bg); border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  .results-table tbody tr { border-bottom: 1px solid var(--color-border); transition: background 0.1s; }
  .results-table tbody tr:last-child { border-bottom: none; }
  .results-table tbody tr:hover { background: var(--color-bg); }
  .results-table td { padding: 0.875rem 1rem; vertical-align: middle; }

  .cell-exam { display: flex; flex-direction: column; gap: 0.15rem; }
  .cell-title { font-weight: 600; color: var(--color-text); white-space: nowrap; }
  .cell-meta { font-size: 0.7rem; color: var(--color-muted); display: flex; align-items: center; gap: 0.25rem; }
  .cell-course { display: block; font-weight: 700; color: var(--color-text); font-family: monospace; font-size: 0.78rem; }
  .cell-course-title { display: block; font-size: 0.7rem; color: var(--color-muted); }
  .cell-score { display: flex; flex-direction: column; gap: 0.25rem; min-width: 80px; }
  .score-bar { height: 4px; border-radius: 2px; background: var(--color-border); overflow: hidden; }
  .score-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
  .score-num { font-size: 0.72rem; color: var(--color-muted); }
  .grade-badge {
    display: inline-flex; align-items: center;
    padding: 0.2rem 0.5rem; border-radius: 0.3rem;
    font-size: 0.72rem; font-weight: 800;
    border: 1px solid;
  }
  .status-badge {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.25rem 0.5rem; border-radius: 0.3rem;
    font-size: 0.72rem; font-weight: 700;
  }
  .status-badge.pass { background: var(--green-soft); color: var(--green-700); }
  .status-badge.fail { background: rgba(220,38,38,0.08); color: #dc2626; }
  .cell-date { font-size: 0.72rem; color: var(--color-muted); white-space: nowrap; }
  .view-link {
    width: 28px; height: 28px; border-radius: 0.4rem;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); text-decoration: none;
    transition: all 0.15s;
  }
  .view-link:hover { background: var(--green-soft); color: var(--green-600); }
  .empty-cell { padding: 2.5rem 1rem !important; }
  .empty-table { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: var(--color-muted); }
  .empty-table p { margin: 0; font-size: 0.8rem; }

  @media (max-width: 768px) {
    .results-table thead { display: none; }
    .results-table tbody tr { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; }
    .results-table td { padding: 0; }
    .results-table td:last-child { align-self: flex-end; }
  }
</style>