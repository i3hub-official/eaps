<!-- src/routes/lecturer/results/print/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Printer, Download, ChevronLeft, FileText,
    Users, CheckCircle, XCircle, TrendingUp,
    Award, Calendar, Clock, BarChart2,
    AlertCircle, Eye, ArrowDown, ArrowUp,
    FileSpreadsheet, Filter
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { examResults, stats, user, generatedAt } = data;

  let selectedExam = $state<string | null>(null);
  let showOnlyPassed = $state(false);
  let showOnlyFailed = $state(false);
  let searchQuery = $state('');

  const filteredResults = $derived(() => {
    if (!examResults) return [];
    
    let results = examResults;
    
    // Filter by selected exam
    if (selectedExam) {
      results = results.filter(e => e.examId === selectedExam);
    }
    
    // Filter by pass/fail
    if (showOnlyPassed) {
      results = results.map(e => ({
        ...e,
        results: e.results.filter(r => r.finalPassed)
      })).filter(e => e.results.length > 0);
    }
    
    if (showOnlyFailed) {
      results = results.map(e => ({
        ...e,
        results: e.results.filter(r => !r.finalPassed && r.submittedAt)
      })).filter(e => e.results.length > 0);
    }
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.map(e => ({
        ...e,
        results: e.results.filter(r => 
          r.studentName.toLowerCase().includes(query) ||
          r.matricNumber?.toLowerCase().includes(query) ||
          r.studentEmail.toLowerCase().includes(query)
        )
      })).filter(e => e.results.length > 0);
    }
    
    return results;
  });

  const filteredResultsArray = $derived(filteredResults());

  function getGradeColor(grade: string | null) {
    if (!grade) return '#64748b';
    const colors: Record<string, string> = {
      'A': '#16a34a',
      'B': '#2563eb',
      'C': '#d97706',
      'D': '#ea580c',
      'E': '#7c3aed',
      'F': '#dc2626',
    };
    return colors[grade] || '#64748b';
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatDateShort(d: string | null | undefined) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function getExamStudents(exam: any) {
    return exam.results || [];
  }

  function getPassRate(exam: any) {
    const students = getExamStudents(exam);
    if (students.length === 0) return 0;
    const passed = students.filter((s: any) => s.finalPassed).length;
    return Math.round((passed / students.length) * 100);
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  function printPage() {
    window.print();
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const allResults: any[] = [];
    filteredResultsArray.forEach((exam: any) => {
      exam.results.forEach((r: any) => {
        allResults.push({
          'Exam': exam.examTitle,
          'Course': exam.courseCode,
          'Student': r.studentName,
          'Matric': r.matricNumber || 'N/A',
          'Exam Score': r.score || 0,
          'Exam %': r.percentage || 0,
          'CA Score': r.caScore || 0,
          'Final Score': r.finalScore || 0,
          'Final %': r.finalPercentage || 0,
          'Grade': r.finalGrade || 'N/A',
          'Passed': r.finalPassed ? 'Yes' : 'No',
        });
      });
    });

    if (allResults.length === 0) {
      alert('No results to export');
      return;
    }

    const headers = Object.keys(allResults[0]);
    const csv = [
      headers.join(','),
      ...allResults.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${formatDateShort(generatedAt)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Select all text on focus ─────────────────────────────────────────────
  function selectAll(event: FocusEvent) {
    (event.target as HTMLInputElement).select();
  }
</script>

<svelte:head><title>Print Results — MOUAU eTest</title></svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header no-print">
    <div class="header-top">
      <a href="/lecturer/results" class="back-link">
        <ChevronLeft size={14} /> Back to Results
      </a>
      <div class="header-actions">
        <button class="btn-secondary" onclick={exportCSV}>
          <FileSpreadsheet size={14} /> Export CSV
        </button>
        <button class="btn-primary" onclick={printPage}>
          <Printer size={14} /> Print / PDF
        </button>
      </div>
    </div>
    <div class="header-main">
      <div>
        <h1>Print Results</h1>
        <p class="subtitle">
          {stats.totalExams} exam{stats.totalExams !== 1 ? 's' : ''} • 
          {stats.totalStudents} student{stats.totalStudents !== 1 ? 's' : ''} • 
          Generated {formatDate(generatedAt)}
        </p>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid no-print">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <FileText size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalExams}</span>
        <span class="stat-label">Exams</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalStudents}</span>
        <span class="stat-label">Students</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalPassed}</span>
        <span class="stat-label">Passed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <XCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalFailed}</span>
        <span class="stat-label">Failed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <TrendingUp size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.overallAvg.toFixed(1)}%</span>
        <span class="stat-label">Average Score</span>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters no-print">
    <div class="filter-group">
      <label class="filter-label">Exam</label>
      <select class="filter-select" bind:value={selectedExam}>
        <option value={null}>All Exams</option>
        {#each examResults as exam}
          <option value={exam.examId}>
            {exam.courseCode} - {exam.examTitle} ({exam.studentCount} students)
          </option>
        {/each}
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label">Search</label>
      <div class="search-input-wrap">
        <input
          type="text"
          placeholder="Search students..."
          bind:value={searchQuery}
          onfocus={selectAll}
        />
      </div>
    </div>

    <div class="filter-group filter-toggles">
      <button 
        class="filter-toggle" 
        class:active={showOnlyPassed}
        onclick={() => { showOnlyPassed = !showOnlyPassed; if (showOnlyPassed) showOnlyFailed = false; }}
      >
        <CheckCircle size={13} /> Passed
      </button>
      <button 
        class="filter-toggle" 
        class:active={showOnlyFailed}
        class:failed={showOnlyFailed}
        onclick={() => { showOnlyFailed = !showOnlyFailed; if (showOnlyFailed) showOnlyPassed = false; }}
      >
        <XCircle size={13} /> Failed
      </button>
      {#if showOnlyPassed || showOnlyFailed}
        <button class="filter-clear" onclick={() => { showOnlyPassed = false; showOnlyFailed = false; }}>
          <AlertCircle size={13} /> Clear
        </button>
      {/if}
    </div>
  </div>

  <!-- Results -->
  {#if filteredResultsArray.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><FileText size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No results found</p>
      <p class="empty-sub">
        {#if searchQuery}
          No students match your search criteria.
        {:else if showOnlyPassed || showOnlyFailed}
          No {showOnlyPassed ? 'passed' : 'failed'} students found.
        {:else}
          No results available for the selected filters.
        {/if}
      </p>
    </div>
  {:else}
    <div class="results-list">
      {#each filteredResultsArray as exam}
        <div class="exam-section">
          <div class="exam-header">
            <div class="exam-info">
              <span class="exam-code">{exam.courseCode}</span>
              <h2 class="exam-title">{exam.examTitle}</h2>
              <span class="exam-meta">
                {exam.studentCount} student{exam.studentCount !== 1 ? 's' : ''} • 
                Pass Rate: {getPassRate(exam)}% • 
                Avg Score: {exam.avgScore.toFixed(1)}%
              </span>
            </div>
          </div>

          <table class="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Matric No.</th>
                <th class="center">Exam Score</th>
                <th class="center">Exam %</th>
                <th class="center">CA Score</th>
                <th class="center">Final %</th>
                <th class="center">Grade</th>
                <th class="center">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each exam.results as r, i}
                <tr>
                  <td class="center">{i + 1}</td>
                  <td>
                    <span class="student-name">{r.studentName}</span>
                    <span class="student-email">{r.studentEmail}</span>
                  </td>
                  <td>{r.matricNumber || '—'}</td>
                  <td class="center">{r.score?.toFixed(1) || '—'}</td>
                  <td class="center">{r.percentage?.toFixed(1) || '—'}</td>
                  <td class="center">{r.caScore?.toFixed(1) || '—'}</td>
                  <td class="center score">
                    <span class={r.finalPassed ? 'pass' : 'fail'}>
                      {r.finalPercentage?.toFixed(1) || '—'}%
                    </span>
                  </td>
                  <td class="center grade">
                    {#if r.finalGrade}
                      <span class="grade-badge" style="background:{getGradeColor(r.finalGrade)}20; color:{getGradeColor(r.finalGrade)};">
                        {r.finalGrade}
                      </span>
                    {:else}
                      —
                    {/if}
                  </td>
                  <td class="center">
                    {#if r.finalPassed}
                      <span class="status-badge passed">
                        <CheckCircle size={11} /> Passed
                      </span>
                    {:else if r.submittedAt}
                      <span class="status-badge failed">
                        <XCircle size={11} /> Failed
                      </span>
                    {:else}
                      <span class="status-badge not-submitted">
                        <Clock size={11} /> Not Submitted
                      </span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Footer -->
  <div class="page-footer no-print">
    <p>
      Generated on {formatDate(generatedAt)} by {user?.fullName || 'Lecturer'}
    </p>
    <p class="footer-meta">
      MOUAU eTest • Results Print • {filteredResultsArray.reduce((acc, e) => acc + e.results.length, 0)} students shown
    </p>
  </div>
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: var(--color-bg);
  }

  /* ── Print Styles ────────────────────────────────────────────────────────── */
  @media print {
    .no-print {
      display: none !important;
    }
    .page {
      padding: 1rem;
      gap: 1rem;
    }
    .exam-section {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 1.5rem;
    }
    .exam-header {
      background: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .grade-badge {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .status-badge {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pass { color: #16a34a !important; }
    .fail { color: #dc2626 !important; }
    .results-table th {
      background: #f1f5f9 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .results-table tr:nth-child(even) td {
      background: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }

  /* ── Header ───────────────────────────────────────────────────────────────── */
  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .header-actions {
    display: flex; gap: 0.5rem;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); transform: translateY(-1px); }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  /* ── Stats ────────────────────────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
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

  /* ── Filters ───────────────────────────────────────────────────────────────── */
  .filters {
    display: flex; flex-wrap: wrap; gap: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1rem;
    align-items: flex-end;
  }

  .filter-group {
    display: flex; flex-direction: column; gap: 0.3rem;
    flex: 1;
    min-width: 150px;
  }

  .filter-label {
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .filter-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.8rem;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }
  .filter-select:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }

  .search-input-wrap {
    position: relative;
  }
  .search-input-wrap input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.8rem;
    font-family: inherit;
    outline: none;
  }
  .search-input-wrap input:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }

  .filter-toggles {
    flex-direction: row; align-items: center; gap: 0.4rem;
    flex: 0 0 auto;
  }

  .filter-toggle {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: 0.75rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .filter-toggle:hover { border-color: var(--lc-600); color: var(--color-text); }
  .filter-toggle.active {
    background: rgba(22,163,74,0.1); border-color: #16a34a; color: #16a34a;
  }
  .filter-toggle.failed.active {
    background: rgba(220,38,38,0.1); border-color: #dc2626; color: #dc2626;
  }

  .filter-clear {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: 0.75rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .filter-clear:hover { color: var(--color-text); }

  /* ── Results ───────────────────────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
    background: var(--color-surface); border: 1.5px dashed var(--color-border);
    border-radius: 0.875rem;
  }

  .empty-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--lc-soft); border: 1px solid rgba(79,70,229,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600); margin-bottom: 0.25rem;
  }

  .empty-title {
    font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0;
  }
  .empty-sub {
    font-size: 0.82rem; color: var(--color-muted); margin: 0;
  }

  .results-list {
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  .exam-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }

  .exam-header {
    padding: 1rem 1.25rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .exam-info {
    display: flex; align-items: center; gap: 0.75rem;
    flex-wrap: wrap;
  }

  .exam-code {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .exam-title {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }

  .exam-meta {
    font-size: 0.7rem; color: var(--color-muted);
    margin-left: auto;
  }

  .results-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.78rem;
  }

  .results-table th {
    padding: 0.6rem 0.75rem;
    text-align: left;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .results-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .results-table tr:last-child td { border-bottom: none; }
  .results-table tr:nth-child(even) td { background: var(--color-bg); }

  .center { text-align: center; }

  .student-name {
    font-weight: 600; color: var(--color-text);
    display: block;
  }
  .student-email {
    font-size: 0.65rem; color: var(--color-muted);
  }

  .score .pass { color: #16a34a; font-weight: 700; }
  .score .fail { color: #dc2626; font-weight: 700; }

  .grade-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.5rem;
    border-radius: 999px;
    display: inline-block;
    min-width: 24px;
    text-align: center;
  }

  .status-badge {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }
  .status-badge.passed {
    background: rgba(22,163,74,0.08); color: #16a34a;
  }
  .status-badge.failed {
    background: rgba(220,38,38,0.08); color: #dc2626;
  }
  .status-badge.not-submitted {
    background: rgba(100,116,139,0.08); color: #64748b;
  }

  /* ── Footer ───────────────────────────────────────────────────────────────── */
  .page-footer {
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-border);
    display: flex; justify-content: space-between;
    font-size: 0.7rem; color: var(--color-muted);
  }

  .footer-meta {
    text-align: right;
  }

  /* ── Responsive ───────────────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-top { flex-direction: column; gap: 0.75rem; align-items: stretch; }
    .header-actions { flex-wrap: wrap; }
    .header-actions .btn-primary,
    .header-actions .btn-secondary { flex: 1; justify-content: center; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .filters { flex-direction: column; align-items: stretch; }
    .filter-toggles { flex-wrap: wrap; }
    .exam-info { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
    .exam-meta { margin-left: 0; }
    .results-table { font-size: 0.7rem; }
    .results-table th, .results-table td { padding: 0.3rem 0.4rem; }
    .student-email { display: none; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .results-table { font-size: 0.6rem; }
    .results-table th, .results-table td { padding: 0.2rem 0.3rem; }
    .status-badge { font-size: 0.55rem; padding: 0.1rem 0.3rem; }
    .grade-badge { font-size: 0.6rem; padding: 0.1rem 0.3rem; }
  }
</style>