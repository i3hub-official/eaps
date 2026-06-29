<!-- src/routes/lecturer/students/performance/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Users, TrendingUp, TrendingDown, BarChart2,
    Award, ShieldCheck, AlertCircle, CheckCircle,
    XCircle, ChevronRight, Eye, Search,
    GraduationCap, Clock, Calendar, Activity,
    User, Mail, BookOpen, Star, UserX,
    Filter, ArrowUp, ArrowDown, Download
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { 
    students, 
    stats, 
    gradeDistribution, 
    trends, 
    topPerformers, 
    strugglingStudents,
    totalStudents 
  } = data;

  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── State ───────────────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let sortBy = $state<'name' | 'avgScore' | 'totalExams' | 'lastActive'>('avgScore');
  let sortOrder = $state<'asc' | 'desc'>('desc');
  let viewMode = $state<'all' | 'top' | 'struggling'>('all');

  // ── Filtered Students ──────────────────────────────────────────────────────
  const filteredStudents = $derived(() => {
    let result = [...students];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.matricNumber?.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }

    // View mode filter
    if (viewMode === 'top') {
      result = result.filter(s => s.avgScore >= 70 && s.totalExams >= 2);
    } else if (viewMode === 'struggling') {
      result = result.filter(s => s.avgScore < 50 && s.totalExams >= 2);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'avgScore':
          comparison = a.avgScore - b.avgScore;
          break;
        case 'totalExams':
          comparison = a.totalExams - b.totalExams;
          break;
        case 'lastActive':
          comparison = new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
          break;
        default:
          comparison = a.avgScore - b.avgScore;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  });

  const filteredData = $derived(filteredStudents());

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function formatDate(d: string | null | undefined) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function getGrade(score: number) {
    if (score >= 70) return { label: 'A', color: '#16a34a' };
    if (score >= 60) return { label: 'B', color: '#2563eb' };
    if (score >= 50) return { label: 'C', color: '#d97706' };
    if (score >= 45) return { label: 'D', color: '#ea580c' };
    if (score >= 40) return { label: 'E', color: '#7c3aed' };
    return { label: 'F', color: '#dc2626' };
  }

  function getPerformanceStatus(score: number) {
    if (score >= 70) return { label: 'Excellent', color: '#16a34a', icon: Star };
    if (score >= 60) return { label: 'Good', color: '#2563eb', icon: TrendingUp };
    if (score >= 50) return { label: 'Average', color: '#d97706', icon: BarChart2 };
    if (score >= 40) return { label: 'Below Average', color: '#ea580c', icon: TrendingDown };
    return { label: 'Needs Improvement', color: '#dc2626', icon: AlertCircle };
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortOrder = 'desc';
    }
  }

  function getMaxScore() {
    if (students.length === 0) return 100;
    return Math.max(...students.map(s => s.avgScore), 100);
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function exportData() {
    const data = filteredData.map(s => ({
      'Student': s.fullName,
      'Matric': s.matricNumber || 'N/A',
      'Department': s.departmentName || 'N/A',
      'Level': s.level || 'N/A',
      'Avg Score': s.avgScore.toFixed(1),
      'Passed': s.passedExams,
      'Failed': s.failedExams,
      'Total Exams': s.totalExams,
      'Best Score': s.bestScore.toFixed(1),
      'Worst Score': s.worstScore.toFixed(1),
      'Violations': s.totalViolations,
      'Last Active': formatDate(s.lastActive),
    }));

    if (data.length === 0) {
      showToast('No data to export', 'warn');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-performance-${formatDate(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export complete!', 'success');
  }

  // ── Grade Distribution Chart ─────────────────────────────────────────────
  const maxGradeCount = $derived(Math.max(...gradeDistribution.map(d => d.count), 1));
</script>

<svelte:head><title>Student Performance — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<TrendingUp size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <div class="header-badge">
          <TrendingUp size={16} />
          <span>Performance</span>
        </div>
        <h1>Student Performance</h1>
        <p class="subtitle">
          {totalStudents} student{totalStudents !== 1 ? 's' : ''} • 
          Avg Score: {stats.avgOverall}% • 
          Pass Rate: {stats.passRate}%
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" onclick={exportData}>
          <Download size={14} /> Export
        </button>
        <a href="/lecturer/students" class="btn-primary">
          <Eye size={14} /> All Students
        </a>
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
        <span class="stat-value">{stats.totalStudents}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <Award size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.avgOverall}%</span>
        <span class="stat-label">Average Score</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <BarChart2 size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.passRate}%</span>
        <span class="stat-label">Pass Rate</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <ShieldCheck size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalViolations}</span>
        <span class="stat-label">Total Violations</span>
      </div>
    </div>
  </div>

  <!-- Grade Distribution -->
  <div class="grade-distribution">
    <h3>Grade Distribution</h3>
    <div class="grade-bars">
      {#each gradeDistribution as item}
        <div class="grade-bar-item">
          <span class="grade-label">{item.grade}</span>
          <div class="grade-bar-track">
            <div 
              class="grade-bar-fill" 
              style="width:{maxGradeCount > 0 ? (item.count / maxGradeCount * 100) : 0}%"
              data-count={item.count}
            ></div>
          </div>
          <span class="grade-count">{item.count}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Top Performers & Struggling -->
  <div class="featured-grid">
    <div class="featured-card top">
      <div class="featured-header">
        <Star size={16} />
        <h3>Top Performers</h3>
        <span class="featured-badge">Top 10</span>
      </div>
      {#if topPerformers.length === 0}
        <p class="featured-empty">No top performers yet</p>
      {:else}
        <div class="featured-list">
          {#each topPerformers as s, i}
            <div class="featured-item">
              <span class="featured-rank">{i + 1}</span>
              <div class="featured-info">
                <span class="featured-name">{s.fullName}</span>
                <span class="featured-meta">{s.matricNumber || 'N/A'} • {s.totalExams} exams</span>
              </div>
              <span class="featured-score">{s.avgScore}%</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="featured-card struggling">
      <div class="featured-header">
        <AlertCircle size={16} />
        <h3>Needs Attention</h3>
        <span class="featured-badge warning">Needs Support</span>
      </div>
      {#if strugglingStudents.length === 0}
        <p class="featured-empty">No struggling students identified</p>
      {:else}
        <div class="featured-list">
          {#each strugglingStudents as s, i}
            <div class="featured-item">
              <span class="featured-rank">{i + 1}</span>
              <div class="featured-info">
                <span class="featured-name">{s.fullName}</span>
                <span class="featured-meta">{s.matricNumber || 'N/A'} • {s.failedExams} failed</span>
              </div>
              <span class="featured-score low">{s.avgScore}%</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Filters & Controls -->
  <div class="controls">
    <div class="controls-left">
      <div class="search-wrap">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search students..."
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="clear-btn" onclick={() => searchQuery = ''}>
            <XCircle size={14} />
          </button>
        {/if}
      </div>

      <div class="view-toggles">
        <button 
          class="view-toggle" 
          class:active={viewMode === 'all'}
          onclick={() => viewMode = 'all'}
        >
          All
        </button>
        <button 
          class="view-toggle top" 
          class:active={viewMode === 'top'}
          onclick={() => viewMode = 'top'}
        >
          Top Performers
        </button>
        <button 
          class="view-toggle struggling" 
          class:active={viewMode === 'struggling'}
          onclick={() => viewMode = 'struggling'}
        >
          Needs Attention
        </button>
      </div>
    </div>

    <div class="controls-right">
      <span class="results-count">{filteredData.length} students</span>
    </div>
  </div>

  <!-- Students Table -->
  <div class="table-wrap">
    <table class="student-table">
      <thead>
        <tr>
          <th onclick={() => toggleSort('name')} class="sortable">
            Student
            {#if sortBy === 'name'}
              <span class="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th>Matric</th>
          <th>Department</th>
          <th>Level</th>
          <th onclick={() => toggleSort('avgScore')} class="sortable center">
            Avg Score
            {#if sortBy === 'avgScore'}
              <span class="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th class="center">Pass/Fail</th>
          <th onclick={() => toggleSort('totalExams')} class="sortable center">
            Exams
            {#if sortBy === 'totalExams'}
              <span class="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th class="center">Violations</th>
          <th onclick={() => toggleSort('lastActive')} class="sortable">
            Last Active
            {#if sortBy === 'lastActive'}
              <span class="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th class="center">Action</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredData.length === 0}
          <tr>
            <td colspan="10" class="empty-row">
              <AlertCircle size={20} />
              <span>No students found matching your criteria</span>
            </td>
          </tr>
        {:else}
          {#each filteredData as s}
            {@const grade = getGrade(s.avgScore)}
            {@const status = getPerformanceStatus(s.avgScore)}
            
            <tr>
              <td>
                <div class="student-cell">
                  <span class="student-name">{s.fullName}</span>
                  <span class="student-email">{s.email}</span>
                </div>
              </td>
              <td>{s.matricNumber || '—'}</td>
              <td>{s.departmentName || '—'}</td>
              <td>{s.level ? `${s.level}L` : '—'}</td>
              <td class="center">
                <span class="score-badge" style="background:{grade.color}20; color:{grade.color};">
                  {s.avgScore}%
                </span>
              </td>
              <td class="center">
                <span class="pass-fail">
                  <span class="pass-count">{s.passedExams}</span>
                  <span class="sep">/</span>
                  <span class="fail-count">{s.failedExams}</span>
                </span>
              </td>
              <td class="center">{s.totalExams}</td>
              <td class="center">
                {#if s.totalViolations > 0}
                  <span class="violation-badge">
                    <ShieldCheck size={12} /> {s.totalViolations}
                  </span>
                {:else}
                  <span class="no-violations">✓</span>
                {/if}
              </td>
              <td>{formatDate(s.lastActive)}</td>
              <td class="center">
                <a href={`/lecturer/students/${s.id}`} class="action-link">
                  <Eye size={14} />
                </a>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="table-footer">
    <span>Showing {filteredData.length} of {students.length} students</span>
  </div>
</div>

<style>
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

  .page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: center;
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

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); transform: translateY(-1px); }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

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

  .grade-distribution {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.25rem;
  }

  .grade-distribution h3 {
    font-size: 0.8rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
    margin: 0 0 0.75rem;
  }

  .grade-bars {
    display: flex; gap: 0.5rem; align-items: center;
  }

  .grade-bar-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  }

  .grade-label {
    font-size: 0.7rem; font-weight: 800; color: var(--color-muted);
  }

  .grade-bar-track {
    width: 100%; height: 6px; background: var(--color-border); border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .grade-bar-fill {
    height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, var(--lc-600), var(--lc-500));
    transition: width 0.5s ease;
    position: relative;
  }

  .grade-bar-fill[data-count="0"] { opacity: 0.2; }

  .grade-count {
    font-size: 0.6rem; font-weight: 600; color: var(--color-muted);
  }

  .featured-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .featured-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.25rem;
  }

  .featured-card.top { border-left: 3px solid #16a34a; }
  .featured-card.struggling { border-left: 3px solid #dc2626; }

  .featured-header {
    display: flex; align-items: center; gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .featured-header h3 {
    font-size: 0.8rem; font-weight: 700; color: var(--color-text);
    margin: 0; flex: 1;
  }

  .featured-badge {
    font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem;
    background: rgba(22,163,74,0.1); color: #16a34a; border-radius: 999px;
  }
  .featured-badge.warning {
    background: rgba(220,38,38,0.1); color: #dc2626;
  }

  .featured-empty {
    font-size: 0.8rem; color: var(--color-muted); text-align: center;
    padding: 1rem 0;
  }

  .featured-list {
    display: flex; flex-direction: column; gap: 0.3rem;
  }

  .featured-item {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.5rem;
    transition: background 0.15s;
  }
  .featured-item:hover { background: var(--color-bg); }

  .featured-rank {
    font-size: 0.65rem; font-weight: 800; color: var(--color-muted);
    width: 20px; text-align: center;
  }

  .featured-info {
    flex: 1; min-width: 0;
  }

  .featured-name {
    font-size: 0.78rem; font-weight: 600; color: var(--color-text);
    display: block;
  }

  .featured-meta {
    font-size: 0.6rem; color: var(--color-muted);
  }

  .featured-score {
    font-size: 0.8rem; font-weight: 800; color: #16a34a;
  }
  .featured-score.low { color: #dc2626; }

  .controls {
    display: flex; justify-content: space-between; align-items: center;
    gap: 1rem; flex-wrap: wrap;
  }

  .controls-left {
    display: flex; align-items: center; gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .search-wrap {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.6rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    flex: 1; min-width: 200px;
    color: var(--color-muted);
  }
  .search-wrap input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 0.8rem; color: var(--color-text); font-family: inherit;
  }
  .clear-btn {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.1rem;
  }
  .clear-btn:hover { color: var(--color-text); }

  .view-toggles {
    display: flex; gap: 0.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.2rem;
  }

  .view-toggle {
    padding: 0.25rem 0.6rem;
    border: none; border-radius: 0.3rem;
    background: none; cursor: pointer;
    font-size: 0.7rem; font-weight: 600;
    color: var(--color-muted); font-family: inherit;
    transition: all 0.15s;
  }
  .view-toggle:hover { color: var(--color-text); }
  .view-toggle.active {
    background: var(--lc-600); color: white;
  }
  .view-toggle.top.active { background: #16a34a; }
  .view-toggle.struggling.active { background: #dc2626; }

  .controls-right {
    display: flex; align-items: center;
  }

  .results-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }

  .table-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: auto;
  }

  .student-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.78rem;
  }

  .student-table th {
    padding: 0.6rem 0.75rem;
    text-align: left;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    cursor: default;
    user-select: none;
  }

  .student-table th.sortable {
    cursor: pointer;
    transition: color 0.15s;
  }
  .student-table th.sortable:hover { color: var(--color-text); }

  .sort-icon {
    font-size: 0.6rem; margin-left: 0.2rem;
  }

  .student-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .student-table tr:hover td { background: var(--color-bg); }

  .center { text-align: center; }

  .student-cell {
    display: flex; flex-direction: column;
  }

  .student-name {
    font-weight: 600; color: var(--color-text);
  }

  .student-email {
    font-size: 0.65rem; color: var(--color-muted);
  }

  .score-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.5rem;
    border-radius: 999px;
    display: inline-block;
    min-width: 44px;
  }

  .pass-fail {
    font-weight: 700;
  }
  .pass-count { color: #16a34a; }
  .fail-count { color: #dc2626; }
  .sep { color: var(--color-muted); margin: 0 0.1rem; }

  .violation-badge {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.65rem; font-weight: 600; color: #dc2626;
    background: rgba(220,38,38,0.08);
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
  }

  .no-violations {
    font-size: 0.8rem; color: #16a34a;
  }

  .action-link {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.2rem;
    border-radius: 0.3rem;
    color: var(--color-muted);
    transition: all 0.15s;
  }
  .action-link:hover { color: var(--lc-600); background: var(--lc-soft); }

  .empty-row {
    text-align: center; padding: 2rem;
    color: var(--color-muted);
  }
  .empty-row svg { display: block; margin: 0 auto 0.5rem; }

  .table-footer {
    padding: 0.5rem 0;
    font-size: 0.7rem; color: var(--color-muted);
    text-align: right;
  }

  @media (max-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .featured-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .header-actions { flex-wrap: wrap; }
    .header-actions .btn-primary,
    .header-actions .btn-secondary { flex: 1; justify-content: center; }
    .controls { flex-direction: column; align-items: stretch; }
    .controls-left { flex-direction: column; }
    .search-wrap { min-width: 100%; }
    .view-toggles { width: 100%; }
    .view-toggle { flex: 1; text-align: center; }
    .student-table { font-size: 0.7rem; }
    .student-table th, .student-table td { padding: 0.3rem 0.4rem; }
    .student-email { display: none; }
    .grade-bars { flex-wrap: wrap; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr; }
    .student-table { font-size: 0.6rem; }
    .student-table th, .student-table td { padding: 0.2rem 0.3rem; }
    .score-badge { font-size: 0.6rem; padding: 0.1rem 0.3rem; min-width: 32px; }
  }
</style>