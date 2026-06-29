<!-- src/routes/lecturer/exams/[examId]/ca/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ChevronLeft, Users, BarChart2, Download,
    Edit, Search, X, AlertCircle, CheckCircle,
    FileText, Award, TrendingUp, Scale
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { exam, students, totalStudents } = data;

  let searchQuery = $state('');
  let selectedStudent = $state<string | null>(null);
  let editingCA = $state<{ id: string; score: number } | null>(null);

  const filteredStudents = $derived(
    students.filter(s =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.matricNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const stats = $derived({
    passed: students.filter(s => s.totalScore >= 40).length,
    failed: students.filter(s => s.totalScore < 40 && s.totalScore > 0).length,
    noShow: students.filter(s => s.status === 'not_started').length,
    avgTotal: students.reduce((acc, s) => acc + s.totalScore, 0) / (students.length || 1),
  });

  function formatDate(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getGrade(score: number) {
    if (score >= 70) return { label: 'A', color: '#16a34a' };
    if (score >= 60) return { label: 'B', color: '#2563eb' };
    if (score >= 50) return { label: 'C', color: '#d97706' };
    if (score >= 45) return { label: 'D', color: '#ea580c' };
    if (score >= 40) return { label: 'E', color: '#7c3aed' };
    return { label: 'F', color: '#dc2626' };
  }

  function saveCAScore(studentId: string, score: number) {
    // This would call an API endpoint to save the CA score
    console.log(`Saving CA score ${score} for student ${studentId}`);
    editingCA = null;
  }
</script>

<svelte:head><title>CA Management — {exam.title}</title></svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <a href={`/lecturer/exams/${exam.id}`} class="back-link">
      <ChevronLeft size={14} /> Back to Exam
    </a>
    <div class="header-main">
      <div>
        <h1>CA Management</h1>
        <p class="subtitle">{exam.course?.code} — {exam.title}</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary">
          <Download size={14} /> Export CA Scores
        </button>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalStudents}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.passed}</span>
        <span class="stat-label">Passed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <X size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.failed}</span>
        <span class="stat-label">Failed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <TrendingUp size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.avgTotal.toFixed(1)}%</span>
        <span class="stat-label">Average Total</span>
      </div>
    </div>
  </div>

  <!-- CA Info -->
  <div class="ca-info">
    <div class="ca-info-item">
      <span class="ca-label">Exam Weight</span>
      <span class="ca-value">{exam.totalMarks}%</span>
    </div>
    <div class="ca-divider"></div>
    <div class="ca-info-item">
      <span class="ca-label">CA Weight</span>
      <span class="ca-value">{100 - exam.totalMarks}%</span>
    </div>
    <div class="ca-divider"></div>
    <div class="ca-info-item">
      <span class="ca-label">Total</span>
      <span class="ca-value">100%</span>
    </div>
  </div>

  <!-- Search -->
  <div class="search-bar">
    <div class="search-input-wrap">
      <Search size={14} />
      <input
        type="text"
        placeholder="Search students by name, matric number, or email..."
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => searchQuery = ''}>
          <X size={14} />
        </button>
      {/if}
    </div>
  </div>

  <!-- Student List -->
  <div class="table-wrap">
    <table class="student-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Student</th>
          <th>Matric Number</th>
          <th>Exam Score</th>
          <th>CA Score</th>
          <th>Total</th>
          <th>Grade</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredStudents as s, i (s.id)}
          {@const grade = getGrade(s.totalScore)}
          <tr>
            <td>{i + 1}</td>
            <td>
              <div class="student-name">{s.fullName}</div>
              <div class="student-email">{s.email}</div>
            </td>
            <td>{s.matricNumber || '—'}</td>
            <td class="score-cell">{s.examScore.toFixed(1)}%</td>
            <td class="score-cell">
              {#if editingCA?.id === s.id}
                <div class="ca-edit">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    bind:value={editingCA.score}
                    class="ca-input"
                    autofocus
                    on:keydown={(e) => {
                      if (e.key === 'Enter') saveCAScore(s.id, editingCA.score);
                      if (e.key === 'Escape') editingCA = null;
                    }}
                  />
                  <button class="ca-save" onclick={() => saveCAScore(s.id, editingCA.score)}>
                    <CheckCircle size={14} />
                  </button>
                </div>
              {:else}
                <span class="ca-value-display">{s.caScore.toFixed(1)}%</span>
              {/if}
            </td>
            <td class="score-cell total-score">{s.totalScore.toFixed(1)}%</td>
            <td>
              <span class="grade-badge" style="background:{grade.color}20; color:{grade.color};">
                {grade.label}
              </span>
            </td>
            <td>
              <span class="status-badge" class:status-pass={s.totalScore >= 40}>
                {s.status === 'not_started' ? 'Not Started' : s.status === 'in_progress' ? 'In Progress' : 'Submitted'}
              </span>
            </td>
            <td>
              {#if s.status !== 'not_started'}
                <button
                  class="action-btn"
                  onclick={() => editingCA = { id: s.id, score: s.caScore }}
                  title="Edit CA Score"
                >
                  <Edit size={14} />
                </button>
              {/if}
            </td>
          </tr>
        {/each}
        {#if filteredStudents.length === 0}
          <tr>
            <td colspan="9" class="empty-row">No students found matching your search.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  <div class="table-footer">
    <span>Showing {filteredStudents.length} of {students.length} students</span>
  </div>
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 0.75rem;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .header-actions {
    display: flex; gap: 0.5rem;
  }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .stat-content {
    display: flex; flex-direction: column;
  }

  .stat-value {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.6rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .ca-info {
    display: flex; align-items: center; justify-content: center;
    gap: 1.5rem;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .ca-info-item {
    display: flex; flex-direction: column; align-items: center;
  }

  .ca-label {
    font-size: 0.65rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .ca-value {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
  }

  .ca-divider {
    width: 1px; height: 2rem; background: var(--color-border);
  }

  .search-bar {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .search-input-wrap {
    display: flex; align-items: center; gap: 0.5rem;
    color: var(--color-muted);
  }

  .search-input-wrap input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 0.85rem; color: var(--color-text); font-family: inherit;
  }

  .search-clear {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.2rem;
  }
  .search-clear:hover { color: var(--color-text); }

  .table-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: auto;
  }

  .student-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.8rem;
  }

  .student-table thead {
    background: var(--color-bg);
  }

  .student-table th {
    padding: 0.75rem 1rem; text-align: left;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted);
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .student-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .student-table tr:hover td { background: var(--color-bg); }

  .student-name {
    font-weight: 600; color: var(--color-text);
  }

  .student-email {
    font-size: 0.7rem; color: var(--color-muted);
  }

  .score-cell {
    font-weight: 600; text-align: center;
  }

  .total-score {
    font-weight: 800; color: var(--color-text);
  }

  .grade-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  .status-badge {
    font-size: 0.65rem; font-weight: 600; padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(100,116,139,0.1); color: #64748b;
  }
  .status-badge.status-pass {
    background: rgba(22,163,74,0.1); color: #16a34a;
  }

  .action-btn {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.3rem;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .action-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .ca-edit {
    display: flex; align-items: center; gap: 0.3rem;
    justify-content: center;
  }

  .ca-input {
    width: 60px; padding: 0.2rem 0.4rem;
    border: 1px solid var(--lc-600);
    border-radius: 0.3rem;
    background: var(--color-bg);
    font-size: 0.8rem; font-weight: 600;
    text-align: center;
    outline: none;
  }

  .ca-save {
    padding: 0.2rem;
    border: none; background: none;
    color: #16a34a; cursor: pointer;
  }

  .ca-value-display {
    font-weight: 600; color: var(--color-text);
  }

  .empty-row {
    text-align: center; padding: 2rem;
    color: var(--color-muted);
  }

  .table-footer {
    padding: 0.5rem 0;
    font-size: 0.75rem; color: var(--color-muted);
    text-align: right;
  }

  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .ca-info { flex-wrap: wrap; gap: 0.5rem; }
    .ca-divider { display: none; }
    .student-table { font-size: 0.7rem; }
    .student-table th, .student-table td { padding: 0.5rem; }
  }
</style>