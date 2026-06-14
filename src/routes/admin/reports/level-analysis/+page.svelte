<!-- src/routes/(admin)/admin/reports/level-analysis/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    GraduationCap, Users, BookOpen, Award,
    TrendingUp, TrendingDown, Minus, Target,
    Building2, CheckCircle, XCircle
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const totalStudents = $derived(data.levels.reduce((acc: number, l: any) => acc + l.students, 0));
  const totalExams    = $derived(data.levels.reduce((acc: number, l: any) => acc + l.exams, 0));
  const overallAvg    = $derived(
    data.levels.length > 0
      ? parseFloat((data.levels.reduce((acc: number, l: any) => acc + l.avgScore, 0) / data.levels.length).toFixed(1))
      : 0
  );
  const overallPass   = $derived(
    data.levels.length > 0
      ? parseFloat((data.levels.reduce((acc: number, l: any) => acc + l.passRate, 0) / data.levels.length).toFixed(1))
      : 0
  );
</script>

<svelte:head><title>Level Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Level Analysis</h1>
    <p class="subtitle">Academic performance breakdown by student level</p>
  </header>

  <!-- Summary Stats -->
  <div class="stats-summary">
    <div class="stat-box">
      <div class="stat-icon"><Users size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{totalStudents.toLocaleString()}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-icon"><BookOpen size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{totalExams}</span>
        <span class="stat-label">Available Exams</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-icon"><Award size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{overallAvg}%</span>
        <span class="stat-label">Overall Avg Score</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-icon"><Target size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{overallPass}%</span>
        <span class="stat-label">Overall Pass Rate</span>
      </div>
    </div>
  </div>

  <!-- Table -->
  <section class="table-section">
    {#if data.levels.length === 0}
      <div class="empty">
        <GraduationCap size={32} />
        <p>No level data found.</p>
        <p class="empty-hint">There are no active students with assigned levels yet.</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Level</th>
              <th class="num">Students</th>
              <th class="num">Avail. Exams</th>
              <th class="num">Exams Taken</th>
              <th class="num">Completed</th>
              <th class="num">Avg Score</th>
              <th class="num">Pass Rate</th>
              <th>Top Department</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {#each data.levels as lvl}
              <tr>
                <td>
                  <div class="level-cell">
                    <div class="level-icon">
                      <GraduationCap size={16} />
                    </div>
                    <span class="level-label">{lvl.level} Level</span>
                  </div>
                </td>

                <td class="num">
                  <span class="num-value">{(lvl.students ?? 0).toLocaleString()}</span>
                </td>

                <td class="num">
                  <span class="num-value">{lvl.exams}</span>
                </td>

                <td class="num">
                  <span class="num-value">{lvl.examsTaken}</span>
                </td>

                <td class="num">
                  <div class="completion-cell">
                    <span class="num-value">{lvl.examsCompleted}</span>
                    {#if lvl.examsTaken > 0}
                      <span class="completion-pct muted">
                        ({Math.round((lvl.examsCompleted / lvl.examsTaken) * 100)}%)
                      </span>
                    {/if}
                  </div>
                </td>

                <td class="num">
                  <span
                    class="score-badge"
                    class:excellent={lvl.avgScore >= 70}
                    class:good={lvl.avgScore >= 55 && lvl.avgScore < 70}
                    class:average={lvl.avgScore >= 40 && lvl.avgScore < 55}
                    class:poor={lvl.avgScore < 40}
                  >
                    {lvl.avgScore}%
                  </span>
                </td>

                <td class="num">
                  <div class="pass-bar">
                    <div class="pass-track">
                      <div class="pass-fill" style="width: {lvl.passRate}%"></div>
                    </div>
                    <span
                      class="pass-pct"
                      class:good-rate={lvl.passRate >= 70}
                      class:mid-rate={lvl.passRate >= 40 && lvl.passRate < 70}
                      class:low-rate={lvl.passRate < 40}
                    >{lvl.passRate}%</span>
                  </div>
                </td>

                <td>
                  <div class="dept-cell">
                    <Building2 size={13} />
                    <span class="dept-name">{lvl.topDept}</span>
                  </div>
                </td>

                <td>
                  {#if lvl.trend === 'up'}
                    <span class="trend up"><TrendingUp size={14} /> Rising</span>
                  {:else if lvl.trend === 'down'}
                    <span class="trend down"><TrendingDown size={14} /> Struggling</span>
                  {:else}
                    <span class="trend stable"><Minus size={14} /> Stable</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-muted);
    font-size: 0.9rem;
    margin-top: 0.25rem;
  }

  /* Stats */
  .stats-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-box {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  /* Table */
  .table-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .data-table th {
    text-align: left;
    padding: 0.875rem 1rem;
    color: var(--color-muted);
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    white-space: nowrap;
  }

  .data-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .data-table tr:last-child td {
    border-bottom: none;
  }

  .data-table tr:hover td {
    background: var(--color-bg);
  }

  .num {
    text-align: right;
  }

  /* Level cell */
  .level-cell {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .level-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .level-label {
    font-weight: 700;
    color: var(--color-text);
  }

  .num-value {
    font-weight: 600;
  }

  .completion-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.375rem;
  }

  .completion-pct {
    font-size: 0.72rem;
  }

  .muted {
    color: var(--color-muted);
  }

  /* Score badge */
  .score-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .score-badge.excellent { background: rgba(22, 163, 74, 0.1);  color: #16a34a; }
  .score-badge.good      { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .score-badge.average   { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .score-badge.poor      { background: rgba(239, 68, 68, 0.1);  color: #ef4444; }

  /* Pass rate bar */
  .pass-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .pass-track {
    width: 60px;
    height: 5px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .pass-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .pass-pct {
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 38px;
    text-align: right;
  }

  .pass-pct.good-rate { color: #16a34a; }
  .pass-pct.mid-rate  { color: #f59e0b; }
  .pass-pct.low-rate  { color: #ef4444; }

  /* Dept cell */
  .dept-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-muted);
    font-size: 0.8rem;
  }

  .dept-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  /* Trend */
  .trend {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .trend.up     { color: #16a34a; }
  .trend.down   { color: #ef4444; }
  .trend.stable { color: var(--color-muted); }

  /* Empty */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 2rem;
    color: var(--color-muted);
    text-align: center;
  }

  .empty p {
    margin: 0;
    font-size: 0.875rem;
  }

  .empty-hint {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .page { padding: 0.75rem; }
    .stats-summary { grid-template-columns: repeat(2, 1fr); }
    .data-table th,
    .data-table td { padding: 0.5rem; }
  }
</style>