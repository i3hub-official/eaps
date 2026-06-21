<!-- src/routes/lecturer/results/grade-reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Search, Download, FileSpreadsheet, FileText, BarChart3, TrendingUp, Users, Award } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let selectedSession = $state<string>('all');
  let selectedCourse = $state<string>('all');
  let selectedLevel = $state<string>('all');

  const filteredData = $derived(() => {
    let results = data.results;
    
    if (selectedCourse !== 'all') {
      results = results.filter(r => r.courseId === selectedCourse);
    }
    
    if (selectedSession !== 'all') {
      results = results.filter(r => r.session === selectedSession);
    }
    
    if (selectedLevel !== 'all') {
      results = results.filter(r => r.level === parseInt(selectedLevel));
    }
    
    return results;
  });

  // Summary stats
  const stats = $derived(() => {
    const results = filteredData();
    const total = results.length;
    const passed = results.filter(r => r.passed === true).length;
    const failed = results.filter(r => r.passed === false).length;
    const pending = results.filter(r => r.passed === null).length;
    
    const scores = results.filter(r => r.score !== null).map(r => r.score || 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    const percentages = results.filter(r => r.percentage !== null).map(r => r.percentage || 0);
    const avgPercentage = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
    
    // Grade distribution
    const grades = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const r of results) {
      if (r.percentage !== null) {
        const p = r.percentage;
        if (p >= 70) grades.A++;
        else if (p >= 60) grades.B++;
        else if (p >= 50) grades.C++;
        else if (p >= 45) grades.D++;
        else if (p >= 40) grades.E++;
        else grades.F++;
      }
    }
    
    return { total, passed, failed, pending, avgScore, avgPercentage, grades };
  });

  function getGrade(percentage: number): string {
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  }

  function getGradeColor(percentage: number): string {
    if (percentage >= 70) return 'grade-a';
    if (percentage >= 60) return 'grade-b';
    if (percentage >= 50) return 'grade-c';
    if (percentage >= 45) return 'grade-d';
    return 'grade-f';
  }

  function getGradeLabel(grade: string): string {
    const map: Record<string, string> = {
      A: 'Excellent',
      B: 'Very Good',
      C: 'Good',
      D: 'Satisfactory',
      E: 'Pass',
      F: 'Fail'
    };
    return map[grade] || grade;
  }

  function exportReport(format: 'excel' | 'pdf') {
    const params = new URLSearchParams();
    if (selectedCourse !== 'all') params.append('courseId', selectedCourse);
    if (selectedSession !== 'all') params.append('session', selectedSession);
    if (selectedLevel !== 'all') params.append('level', selectedLevel);
    params.append('format', format);
    goto(`/lecturer/results/export?${params.toString()}`);
  }
</script>

<div class="page">
  <div class="filters">
    <div class="filter-group">
      <select bind:value={selectedSession}>
        <option value="all">All Sessions</option>
        {#each data.sessions as session}
          <option value={session}>{session}</option>
        {/each}
      </select>

      <select bind:value={selectedCourse}>
        <option value="all">All Courses</option>
        {#each data.courses as course}
          <option value={course.id}>{course.code} - {course.title}</option>
        {/each}
      </select>

      <select bind:value={selectedLevel}>
        <option value="all">All Levels</option>
        {#each data.levels as level}
          <option value={level}>{level}L</option>
        {/each}
      </select>
    </div>

    <div class="filter-actions">
      <button class="btn-icon" onclick={() => exportReport('excel')} title="Export to Excel" type="button">
        <FileSpreadsheet size={14} />
      </button>
      <button class="btn-icon" onclick={() => exportReport('pdf')} title="Export to PDF" type="button">
        <FileText size={14} />
      </button>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon"><Users size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().total}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon"><Award size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().passed}</span>
        <span class="stat-label">Passed</span>
      </div>
    </div>
    <div class="stat-card danger">
      <div class="stat-icon"><TrendingUp size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().failed}</span>
        <span class="stat-label">Failed</span>
      </div>
    </div>
    <div class="stat-card muted">
      <div class="stat-icon"><BarChart3 size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().avgPercentage.toFixed(1)}%</span>
        <span class="stat-label">Average Score</span>
      </div>
    </div>
  </div>

  <!-- Grade Distribution -->
  <div class="grade-distribution">
    <h3>Grade Distribution</h3>
    <div class="grade-bars">
      {#each ['A', 'B', 'C', 'D', 'E', 'F'] as grade}
        {@const grades = stats().grades}
        {@const count = (grades as any)[grade] || 0}
        {@const total = stats().total || 1}
        {@const percentage = (count / total) * 100}
        <div class="grade-bar-row">
          <span class="grade-label">{grade}</span>
          <div class="grade-bar-track">
            <div 
              class="grade-bar-fill grade-{grade.toLowerCase()}" 
              style="width: {percentage}%"
            ></div>
          </div>
          <span class="grade-count">{count} ({percentage.toFixed(1)}%)</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Results Table -->
  <div class="results-table-wrapper">
    <div class="table-header">
      <h3>Detailed Results</h3>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            <th>Student</th>
            <th>Matric No.</th>
            <th>Course</th>
            <th>Exam</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredData() as r, i}
            <tr>
              <td>{i + 1}</td>
              <td>{r.studentName}</td>
              <td>{r.studentMatric || '—'}</td>
              <td>{r.courseCode}</td>
              <td>{r.examTitle}</td>
              <td>{r.score ?? '—'}</td>
              <td>
                {#if r.percentage !== null}
                  <span class="percentage {getGradeColor(r.percentage)}">
                    {r.percentage.toFixed(1)}%
                  </span>
                {:else}
                  —
                {/if}
              </td>
              <td>
                {#if r.percentage !== null}
                  <span class="grade {getGradeColor(r.percentage)}">
                    {getGrade(r.percentage)}
                  </span>
                {:else}
                  —
                {/if}
              </td>
              <td>
                {#if r.passed === true}
                  <span class="badge success">Passed</span>
                {:else if r.passed === false}
                  <span class="badge danger">Failed</span>
                {:else}
                  <span class="badge muted">Pending</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .filter-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .filter-group select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.82rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    min-width: 150px;
    flex: 1;
  }

  .filter-group select:focus {
    border-color: var(--lc-600, #4f46e5);
  }

  .filter-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.4rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.15s;
  }

  .btn-icon:hover {
    color: var(--lc-600, #4f46e5);
    border-color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.06));
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  .stat-card.success .stat-icon {
    background: rgba(6,95,70,0.08);
    color: #065f46;
  }

  .stat-card.danger .stat-icon {
    background: rgba(220,38,38,0.08);
    color: #dc2626;
  }

  .stat-card.muted .stat-icon {
    background: var(--color-bg);
    color: var(--color-muted);
  }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }

  .grade-distribution {
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .grade-distribution h3 {
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  .grade-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .grade-bar-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .grade-label {
    font-weight: 700;
    font-size: 0.8rem;
    width: 1.5rem;
    color: var(--color-text);
  }

  .grade-bar-track {
    flex: 1;
    height: 8px;
    background: var(--color-bg);
    border-radius: 4px;
    overflow: hidden;
  }

  .grade-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s ease;
  }

  .grade-bar-fill.grade-a { background: #065f46; }
  .grade-bar-fill.grade-b { background: #1d4ed8; }
  .grade-bar-fill.grade-c { background: #7c3aed; }
  .grade-bar-fill.grade-d { background: #d97706; }
  .grade-bar-fill.grade-e { background: #f59e0b; }
  .grade-bar-fill.grade-f { background: #dc2626; }

  .grade-count {
    font-size: 0.72rem;
    color: var(--color-muted);
    font-weight: 600;
    min-width: 80px;
    text-align: right;
  }

  .results-table-wrapper {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .table-header h3 {
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .table-scroll {
    overflow-x: auto;
    padding: 0 1.25rem 1.25rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  thead {
    background: var(--color-bg);
  }

  th {
    text-align: left;
    padding: 0.625rem 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1.5px solid var(--color-border);
  }

  td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .percentage {
    font-weight: 700;
  }

  .grade {
    display: inline-block;
    font-weight: 800;
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
    font-size: 0.78rem;
  }

  .grade-a { color: #065f46; background: rgba(6,95,70,0.08); }
  .grade-b { color: #1d4ed8; background: rgba(29,78,216,0.08); }
  .grade-c { color: #7c3aed; background: rgba(124,58,237,0.08); }
  .grade-d { color: #d97706; background: rgba(217,119,6,0.08); }
  .grade-e { color: #f59e0b; background: rgba(245,158,11,0.08); }
  .grade-f { color: #dc2626; background: rgba(220,38,38,0.08); }

  .badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge.success {
    color: #065f46;
    background: rgba(6,95,70,0.1);
  }

  .badge.danger {
    color: #dc2626;
    background: rgba(220,38,38,0.1);
  }

  .badge.muted {
    color: var(--color-muted);
    background: var(--color-bg);
  }

  @media (max-width: 640px) {
    .filters {
      flex-direction: column;
    }

    .filter-group {
      width: 100%;
      flex-direction: column;
    }

    .filter-group select {
      min-width: unset;
      width: 100%;
    }

    .filter-actions {
      width: 100%;
    }

    .filter-actions .btn-icon {
      flex: 1;
    }

    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }

    .grade-count {
      min-width: 60px;
      font-size: 0.65rem;
    }
  }
</style>