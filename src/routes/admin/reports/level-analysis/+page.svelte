<!-- src/routes/(admin)/admin/reports/student-performance/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { 
    Users, Search, Filter, GraduationCap, Award, 
    TrendingUp, TrendingDown, Minus, AlertTriangle,
    Trophy, Star, Target, Building2, ChevronDown
  } from 'lucide-svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedLevel = $state('');
  let selectedDept = $state('');
  let showFilters = $state(false);

  const filtered = $derived(
    data.students.filter((s: any) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !s.matricNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedLevel && s.level !== selectedLevel) return false;
      if (selectedDept && s.department !== selectedDept) return false;
      return true;
    })
  );

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedLevel) params.set('level', selectedLevel);
    if (selectedDept) params.set('dept', selectedDept);
    goto(`/admin/reports/student-performance?${params.toString()}`);
  }

  function resetFilters() {
    searchQuery = '';
    selectedLevel = '';
    selectedDept = '';
    goto('/admin/reports/student-performance');
  }
</script>

<svelte:head><title>Student Performance — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Student Performance</h1>
    <p class="subtitle">Track individual student performance, exam history, and academic progress</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input 
        type="text" 
        placeholder="Search by name or matric number..." 
        bind:value={searchQuery}
        onkeyup={(e) => e.key === 'Enter' && applyFilters()}
      />
    </div>
    
    <button class="filter-btn" onclick={() => showFilters = !showFilters}>
      <Filter size={14} />
      Filters
      {#if selectedLevel || selectedDept}
        <span class="filter-badge">active</span>
      {/if}
    </button>
    
    <button class="search-btn" onclick={applyFilters}>
      Apply Filters
    </button>
    
    {(selectedLevel || selectedDept || searchQuery) && (
      <button class="reset-btn" onclick={resetFilters}>
        Reset
      </button>
    )}
  </section>

  {#if showFilters}
    <div class="filters-panel">
      <div class="filter-group">
        <label><GraduationCap size={14} /> Level</label>
        <select bind:value={selectedLevel}>
          <option value="">All Levels</option>
          {#each data.filters.levels as l}
            <option value={l}>{l} Level</option>
          {/each}
        </select>
      </div>
      
      <div class="filter-group">
        <label><Building2 size={14} /> Department</label>
        <select bind:value={selectedDept}>
          <option value="">All Departments</option>
          {#each data.filters.departments as d}
            <option value={d.name}>{d.name}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  <div class="stats-summary">
    <div class="stat-box">
      <div class="stat-icon"><Users size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{data.students.length}</span>
        <span class="stat-label">Active Students</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-icon"><Award size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">
          {data.students.filter((s: any) => s.avgScore >= 70).length}
        </span>
        <span class="stat-label">Top Performers (≥70%)</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-icon"><Target size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">
          {Math.round(data.students.reduce((acc: number, s: any) => acc + s.avgScore, 0) / data.students.length || 0)}%
        </span>
        <span class="stat-label">Avg Score Overall</span>
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-icon"><AlertTriangle size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">
          {data.students.reduce((acc: number, s: any) => acc + s.totalViolations, 0)}
        </span>
        <span class="stat-label">Total Violations</span>
      </div>
    </div>
  </div>

  <section class="table-section">
    {#if filtered.length === 0}
      <div class="empty">
        <Users size={32} />
        <p>No students found.</p>
        <p class="empty-hint">Try adjusting your search or filters</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Matric No</th>
              <th>Level</th>
              <th>Department</th>
              <th class="num">Exams</th>
              <th class="num">Avg Score</th>
              <th class="num">Pass Rate</th>
              <th class="num">Passed/Failed</th>
              <th class="num">Violations</th>
              <th>Performance</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as student}
              <tr>
                <td>
                  <div class="student-cell">
                    <div class="student-avatar">{student.name.charAt(0)}</div>
                    <span class="student-name">{student.name}</span>
                  </div>
                </td>
                <td class="mono">{student.matricNumber}</td>
                <td><span class="level-badge">{student.level}</span></td>
                <td class="muted">{student.department}</td>
                <td class="num">{student.examsCompleted}/{student.examsTaken}</td>
                <td class="num">
                  <span class="score-badge" 
                        class:excellent={student.performance === 'excellent'}
                        class:good={student.performance === 'good'}
                        class:average={student.performance === 'average'}
                        class:poor={student.performance === 'poor'}>
                    {student.avgScore}%
                  </span>
                </td>
                <td class="num">
                  <div class="pass-bar">
                    <div class="pass-track">
                      <div class="pass-fill" style="width: {student.passRate}%"></div>
                    </div>
                    <span>{student.passRate}%</span>
                  </div>
                </td>
                <td class="num">
                  <span class="pass-count">{student.examsPassed}</span>
                  <span class="fail-count">/{student.examsFailed}</span>
                </td>
                <td class="num">
                  {#if student.totalViolations > 0}
                    <span class="violation-badge">{student.totalViolations}</span>
                  {:else}
                    <span class="violation-none">—</span>
                  {/if}
                </td>
                <td>
                  <span class="perf-badge" class:excellent={student.performance === 'excellent'}
                                          class:good={student.performance === 'good'}
                                          class:average={student.performance === 'average'}
                                          class:poor={student.performance === 'poor'}>
                    {#if student.performance === 'excellent'}
                      <Trophy size={12} /> Excellent
                    {:else if student.performance === 'good'}
                      <Star size={12} /> Good
                    {:else if student.performance === 'average'}
                      <Target size={12} /> Average
                    {:else}
                      <AlertTriangle size={12} /> Poor
                    {/if}
                  </span>
                </td>
                <td>
                  {#if student.scoreRange > 30}
                    <span class="trend volatile"><TrendingUp size={14} /> Volatile</span>
                  {:else if student.avgScore >= 70}
                    <span class="trend up"><TrendingUp size={14} /> Rising</span>
                  {:else if student.avgScore <= 45}
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

  .filters-bar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    flex: 1;
    min-width: 250px;
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    color: var(--color-text);
    font-size: 0.875rem;
    width: 100%;
  }

  .search-box :global(svg) {
    color: var(--color-muted);
  }

  .filter-btn, .search-btn, .reset-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .filter-btn:hover {
    border-color: #16a34a;
    color: #16a34a;
  }

  .search-btn {
    background: #16a34a;
    border: none;
    color: white;
  }

  .search-btn:hover {
    background: #15803d;
  }

  .reset-btn {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }

  .reset-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
  }

  .filter-badge {
    background: #16a34a;
    color: white;
    font-size: 0.6rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }

  .filters-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 200px;
  }

  .filter-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .filter-group select {
    padding: 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-size: 0.85rem;
  }

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
    background: rgba(22, 163, 74, 0.1);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #16a34a;
  }

  .stat-info {
    flex: 1;
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
    font-size: 0.75rem;
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

  .student-cell {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .student-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #a78bfa);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.75rem;
    color: white;
    flex-shrink: 0;
  }

  .student-name {
    font-weight: 600;
    color: var(--color-text);
  }

  .mono {
    font-family: monospace;
    font-size: 0.8rem;
  }

  .level-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .muted {
    color: var(--color-muted);
  }

  .score-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .score-badge.excellent {
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
  }

  .score-badge.good {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .score-badge.average {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .score-badge.poor {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

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
    background: #16a34a;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .pass-bar span {
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 36px;
  }

  .pass-count {
    color: #16a34a;
    font-weight: 700;
  }

  .fail-count {
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  .violation-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .violation-none {
    color: var(--color-muted);
  }

  .perf-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .perf-badge.excellent {
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
  }

  .perf-badge.good {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .perf-badge.average {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .perf-badge.poor {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .trend {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .trend.up {
    color: #16a34a;
  }

  .trend.down {
    color: #ef4444;
  }

  .trend.volatile {
    color: #f59e0b;
  }

  .trend.stable {
    color: var(--color-muted);
  }

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

  @media (max-width: 1024px) {
    .data-table {
      font-size: 0.75rem;
    }
    
    .data-table th,
    .data-table td {
      padding: 0.5rem;
    }
  }

  @media (max-width: 768px) {
    .page {
      padding: 0.75rem;
    }

    .stats-summary {
      grid-template-columns: repeat(2, 1fr);
    }

    .filters-bar {
      flex-wrap: wrap;
    }

    .search-box {
      width: 100%;
    }
  }
</style>