<script lang="ts">
  import type { PageData } from './$types';
  import { BarChart2, Users, Award, TrendingUp, Download, Search } from 'lucide-svelte';
  
  let { data }: { data: PageData } = $props();
  const { exam, results, stats } = data;
  
  let searchQuery = $state('');
  
  const filteredResults = $derived(
    results.filter(r => 
      r.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.student.matricNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
  );
  
  function formatPercentage(value: number | null) {
    if (value === null) return '—';
    return `${Math.round(value)}%`;
  }
  
  function getGrade(percentage: number | null) {
    if (percentage === null) return '—';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'D';
    return 'F';
  }
  
  function exportResults() {
    const csv = [
      ['Student Name', 'Matric Number', 'Email', 'Score', 'Percentage', 'Grade', 'Passed', 'Violations', 'Submitted At'],
      ...filteredResults.map(r => [
        r.student.fullName,
        r.student.matricNumber || '',
        r.student.email,
        r.score || '',
        r.percentage || '',
        getGrade(r.percentage),
        r.passed ? 'Yes' : 'No',
        r.violationCount,
        new Date(r.submittedAt || r.generatedAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.code}_${exam.title}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head><title>Results — {exam.title}</title></svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <a href="/lecturer/exams/{exam.id}" class="back-link">← Back to Exam</a>
    <div class="header-main">
      <div>
        <h1>Exam Results</h1>
        <p class="subtitle">{exam.course.code} — {exam.title}</p>
      </div>
      <button class="btn-export" onclick={exportResults}>
        <Download size={14} /> Export CSV
      </button>
    </div>
  </div>
  
  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(79,70,229,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-info">
        <span class="stat-value">{stats?.total_students || 0}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(34,197,94,0.1); color: #16a34a;">
        <Award size={18} />
      </div>
      <div class="stat-info">
        <span class="stat-value">{stats?.passed_count || 0}</span>
        <span class="stat-label">Passed</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
        <TrendingUp size={18} />
      </div>
      <div class="stat-info">
        <span class="stat-value">{formatPercentage(stats?.avg_score)}</span>
        <span class="stat-label">Average Score</span>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #8b5cf6;">
        <BarChart2 size={18} />
      </div>
      <div class="stat-info">
        <span class="stat-value">{formatPercentage(stats?.highest_score)}</span>
        <span class="stat-label">Highest Score</span>
      </div>
    </div>
  </div>
  
  <!-- Search -->
  <div class="search-bar">
    <Search size={14} />
    <input 
      type="text" 
      placeholder="Search by student name or matric number..." 
      bind:value={searchQuery}
    />
  </div>
  
  <!-- Results Table -->
  <div class="table-container">
    <table class="results-table">
      <thead>
        <tr>
          <th>S/N</th>
          <th>Student Name</th>
          <th>Matric Number</th>
          <th>Score</th>
          <th>Percentage</th>
          <th>Grade</th>
          <th>Status</th>
          <th>Violations</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredResults.length === 0}
          <tr>
            <td colspan="9" class="empty-state">
              <p>No results found</p>
            </td>
          </tr>
        {:else}
          {#each filteredResults as result, i}
            <tr>
              <td>{i + 1}</td>
              <td class="student-name">{result.student.fullName}</td>
              <td>{result.student.matricNumber || '—'}</td>
              <td>{result.score ?? '—'} / {exam.totalMarks}</td>
              <td class="percentage" class:passed={result.passed}>
                {formatPercentage(result.percentage)}
              </td>
              <td class="grade" class:grade-a={result.percentage >= 70}
                                   class:grade-b={result.percentage >= 60 && result.percentage < 70}
                                   class:grade-c={result.percentage >= 50 && result.percentage < 60}
                                   class:grade-d={result.percentage >= 45 && result.percentage < 50}
                                   class:grade-f={result.percentage < 45}>
                {getGrade(result.percentage)}
              </td>
              <td>
                <span class="status-badge" class:passed={result.passed}>
                  {result.passed ? 'Passed' : 'Failed'}
                </span>
              </td>
              <td class="violations" class:has-violations={result.violationCount > 0}>
                {result.violationCount}
              </td>
              <td class="date">
                {result.submittedAt 
                  ? new Date(result.submittedAt).toLocaleDateString() 
                  : '—'}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .back-link {
    display: inline-block;
    font-size: 0.875rem;
    color: var(--color-muted);
    text-decoration: none;
    margin-bottom: 1rem;
  }
  
  .back-link:hover {
    color: #4f46e5;
  }
  
  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }
  
  .subtitle {
    color: var(--color-muted);
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
  }
  
  .btn-export {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  
  .btn-export:hover {
    background: #4338ca;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
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
    flex-shrink: 0;
  }
  
  .stat-info {
    display: flex;
    flex-direction: column;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .search-bar input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text);
  }
  
  .table-container {
    overflow-x: auto;
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  
  .results-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .results-table th,
  .results-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  
  .results-table th {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    background: var(--color-bg);
  }
  
  .results-table tr:hover {
    background: var(--color-bg);
  }
  
  .student-name {
    font-weight: 600;
    color: var(--color-text);
  }
  
  .percentage {
    font-weight: 600;
  }
  
  .percentage.passed {
    color: #16a34a;
  }
  
  .grade {
    font-weight: 700;
  }
  
  .grade-a { color: #16a34a; }
  .grade-b { color: #3b82f6; }
  .grade-c { color: #f59e0b; }
  .grade-d { color: #f97316; }
  .grade-f { color: #dc2626; }
  
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .status-badge.passed {
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
  }
  
  .status-badge:not(.passed) {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  
  .violations.has-violations {
    color: #f59e0b;
    font-weight: 600;
  }
  
  .date {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-muted);
  }
</style>