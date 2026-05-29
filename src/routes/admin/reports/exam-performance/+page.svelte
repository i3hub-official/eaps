<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ClipboardList, Search, Filter, ArrowUpDown, TrendingUp,
    Users, Clock, Award, AlertTriangle, ChevronDown
  } from 'lucide-svelte';

  let exams = $state([
    { id: '1', title: 'CSC 201 — Introduction to Programming', course: 'CSC 201', date: '2026-05-20', students: 145, avgScore: 72.5, passRate: 78, duration: 60, violations: 3, status: 'completed' },
    { id: '2', title: 'MTH 101 — Calculus I', course: 'MTH 101', date: '2026-05-18', students: 203, avgScore: 58.3, passRate: 62, duration: 90, violations: 12, status: 'completed' },
    { id: '3', title: 'PHY 102 — General Physics', course: 'PHY 102', date: '2026-05-22', students: 178, avgScore: 65.1, passRate: 71, duration: 75, violations: 7, status: 'active' },
    { id: '4', title: 'CHM 201 — Organic Chemistry', course: 'CHM 201', date: '2026-05-25', students: 134, avgScore: 0, passRate: 0, duration: 60, violations: 0, status: 'scheduled' },
    { id: '5', title: 'ENG 101 — Use of English', course: 'ENG 101', date: '2026-05-15', students: 312, avgScore: 81.2, passRate: 89, duration: 45, violations: 1, status: 'completed' },
  ]);

  let searchQuery = $state('');
  let statusFilter = $state('all');

  let filteredExams = $derived(
    exams.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.course.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  );

  function getStatusColor(status: string) {
    return {
      completed: 'status-completed',
      active: 'status-active',
      scheduled: 'status-scheduled',
      cancelled: 'status-cancelled'
    }[status] || 'status-scheduled';
  }
</script>

<svelte:head>
  <title>Exam Performance — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Exam Performance</h1>
    <p class="subtitle">Analyze exam results, scores, and completion metrics</p>
  </header>

  <!-- Summary Cards -->
  <section class="summary-row">
    <div class="summary-card">
      <ClipboardList size={20} />
      <div>
        <span class="summary-value">{exams.length}</span>
        <span class="summary-label">Total Exams</span>
      </div>
    </div>
    <div class="summary-card">
      <Users size={20} />
      <div>
        <span class="summary-value">{exams.reduce((a, e) => a + e.students, 0).toLocaleString()}</span>
        <span class="summary-label">Total Students</span>
      </div>
    </div>
    <div class="summary-card">
      <Award size={20} />
      <div>
        <span class="summary-value">{((exams.filter(e => e.status === 'completed').reduce((a, e) => a + e.avgScore, 0)) / exams.filter(e => e.status === 'completed').length || 0).toFixed(1)}%</span>
        <span class="summary-label">Avg Score</span>
      </div>
    </div>
    <div class="summary-card">
      <TrendingUp size={20} />
      <div>
        <span class="summary-value">{((exams.filter(e => e.status === 'completed').reduce((a, e) => a + e.passRate, 0)) / exams.filter(e => e.status === 'completed').length || 0).toFixed(1)}%</span>
        <span class="summary-label">Avg Pass Rate</span>
      </div>
    </div>
  </section>

  <!-- Filters -->
  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search exams..." bind:value={searchQuery} />
    </div>
    <select bind:value={statusFilter} class="filter-select">
      <option value="all">All Status</option>
      <option value="completed">Completed</option>
      <option value="active">Active</option>
      <option value="scheduled">Scheduled</option>
    </select>
  </section>

  <!-- Exams Table -->
  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Exam <ArrowUpDown size={14} /></th>
          <th>Date</th>
          <th>Students</th>
          <th>Avg Score</th>
          <th>Pass Rate</th>
          <th>Duration</th>
          <th>Violations</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredExams as exam}
          <tr>
            <td>
              <div class="exam-cell">
                <span class="exam-title">{exam.title}</span>
                <span class="exam-course">{exam.course}</span>
              </div>
            </td>
            <td>{exam.date}</td>
            <td>{exam.students}</td>
            <td>
              <span class="score-badge" class:high={exam.avgScore >= 70} class:medium={exam.avgScore >= 50 && exam.avgScore < 70} class:low={exam.avgScore < 50}>
                {exam.avgScore > 0 ? exam.avgScore + '%' : '—'}
              </span>
            </td>
            <td>
              <div class="pass-bar">
                <div class="pass-fill" style="width: {exam.passRate}%"></div>
                <span>{exam.passRate > 0 ? exam.passRate + '%' : '—'}</span>
              </div>
            </td>
            <td>{exam.duration} min</td>
            <td>
              <span class="violation-count" class:alert={exam.violations > 5}>
                <AlertTriangle size={12} />
                {exam.violations}
              </span>
            </td>
            <td><span class="status-badge {getStatusColor(exam.status)}">{exam.status}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .summary-row {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;
  }
  @media (max-width: 768px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .summary-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem;
    color: #16a34a;
  }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .filters-bar {
    display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;
  }
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem; flex: 1; min-width: 200px;
  }
  .search-box input { border: none; background: none; outline: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .filter-select {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem; color: var(--color-text);
    font-size: 0.875rem; cursor: pointer;
  }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .exam-cell { display: flex; flex-direction: column; }
  .exam-title { font-weight: 600; color: var(--color-text); }
  .exam-course { font-size: 0.75rem; color: var(--color-muted); }

  .score-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; }
  .score-badge.high { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .score-badge.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .score-badge.low { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-fill { height: 6px; background: #16a34a; border-radius: 3px; min-width: 20px; }
  .pass-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 36px; }

  .violation-count { display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: var(--color-muted); }
  .violation-count.alert { color: #ef4444; }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-completed { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-active { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .status-scheduled { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
  .status-cancelled { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
</style>