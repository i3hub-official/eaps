<!-- src/routes/lecturer/results/by-exam/+page.svelte -->
 
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    ChevronDown, ChevronRight, Search, Download, 
    FileSpreadsheet, FileText, Eye, FileSearch, 
    Users, AlertCircle, CheckCircle2, XCircle, 
    Clock, BarChart3, Award
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedExam = $state<string>('all');
  let selectedStatus = $state<string>('all');
  let expandedExams = $state<Set<string>>(new Set());

  const filteredResults = $derived(() => {
    let results = data.results;
    
    if (selectedExam !== 'all') {
      results = results.filter(r => r.examId === selectedExam);
    }
    
    if (selectedStatus !== 'all') {
      results = results.filter(r => r.status === selectedStatus);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r => 
        r.studentName.toLowerCase().includes(q) ||
        r.studentMatric?.toLowerCase().includes(q) ||
        r.examTitle.toLowerCase().includes(q)
      );
    }
    
    return results;
  });

  // Group by exam
  const groupedResults = $derived(() => {
    const groups: Record<string, { examId: string; examTitle: string; courseCode: string; status: string; scheduledStart: string; results: any[] }> = {};
    
    for (const r of filteredResults()) {
      if (!groups[r.examId]) {
        groups[r.examId] = {
          examId: r.examId,
          examTitle: r.examTitle,
          courseCode: r.courseCode,
          status: r.status,
          scheduledStart: r.scheduledStart,
          results: []
        };
      }
      groups[r.examId].results.push(r);
    }
    
    return Object.values(groups);
  });

  function toggleExam(examId: string) {
    if (expandedExams.has(examId)) {
      expandedExams.delete(examId);
    } else {
      expandedExams.add(examId);
    }
    expandedExams = new Set(expandedExams);
  }

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
    if (percentage >= 40) return 'grade-d';
    return 'grade-f';
  }

  function viewExam(examId: string) {
    goto(`/lecturer/exams/${examId}`);
  }

  function getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      draft: 'badge-draft',
      scheduled: 'badge-scheduled',
      active: 'badge-active',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled'
    };
    return map[status] || 'badge-draft';
  }

  function getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
</script>

<div class="page">
  <div class="filters">
    <div class="filter-group">
      <div class="filter-item">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search by student, exam..."
          bind:value={searchQuery}
        />
      </div>
    </div>

    <div class="filter-group">
      <select bind:value={selectedExam}>
        <option value="all">All Exams</option>
        {#each data.exams as exam}
          <option value={exam.id}>{exam.title} ({exam.courseCode})</option>
        {/each}
      </select>

      <select bind:value={selectedStatus}>
        <option value="all">All Status</option>
        <option value="completed">Completed</option>
        <option value="active">Active</option>
        <option value="scheduled">Scheduled</option>
        <option value="draft">Draft</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  </div>

  {#if groupedResults().length === 0}
    <div class="empty-state">
      <FileSearch size={48} strokeWidth={1.2} />
      <p class="empty-title">No results found</p>
      <p class="empty-sub">Try adjusting your filters or check back later.</p>
    </div>
  {:else}
    <div class="results-list">
      {#each groupedResults() as group}
        <div class="exam-group">
          <div
            class="exam-header"
            onclick={() => toggleExam(group.examId)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExam(group.examId); } }}
          >
            <div class="exam-info">
              {#if expandedExams.has(group.examId)}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <span class="exam-title">{group.examTitle}</span>
              <span class="course-code">{group.courseCode}</span>
              <span class="status-badge {getStatusBadge(group.status)}">{getStatusLabel(group.status)}</span>
              <span class="student-count">
                <Users size={12} />
                {group.results.length} student{group.results.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div class="exam-actions" onclick={(e) => e.stopPropagation()}>
              <button
                class="btn-icon"
                onclick={() => viewExam(group.examId)}
                title="View Exam"
                type="button"
              >
                <Eye size={14} />
              </button>
              <button
                class="btn-icon"
                onclick={() => {}}
                title="Export to Excel"
                type="button"
              >
                <FileSpreadsheet size={14} />
              </button>
              <button
                class="btn-icon"
                onclick={() => {}}
                title="Export to PDF"
                type="button"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>

          {#if expandedExams.has(group.examId)}
            <div class="exam-details">
              <table>
                <thead>
                  <tr>
                    <th>S/N</th>
                    <th>Student</th>
                    <th>Matric No.</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Violations</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each group.results as r, i}
                    <tr>
                      <td>{i + 1}</td>
                      <td>{r.studentName}</td>
                      <td>{r.studentMatric || '—'}</td>
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
                      <td>{r.violationCount}</td>
                      <td>
                        {#if r.passed === true}
                          <span class="badge success">
                            <CheckCircle2 size={11} /> Passed
                          </span>
                        {:else if r.passed === false}
                          <span class="badge danger">
                            <XCircle size={11} /> Failed
                          </span>
                        {:else}
                          <span class="badge muted">
                            <Clock size={11} /> Pending
                          </span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>

              <div class="exam-summary">
                <div class="summary-stat">
                  <span class="stat-label">Average Score</span>
                  <span class="stat-value">
                    {#if group.results.filter(r => r.score !== null).length > 0}
                      {(group.results.reduce((sum, r) => sum + (r.score || 0), 0) / group.results.filter(r => r.score !== null).length).toFixed(1)}
                    {:else}
                      —
                    {/if}
                  </span>
                </div>
                <div class="summary-stat">
                  <span class="stat-label">Pass Rate</span>
                  <span class="stat-value">
                    {#if group.results.filter(r => r.passed !== null).length > 0}
                      {((group.results.filter(r => r.passed === true).length / group.results.filter(r => r.passed !== null).length) * 100).toFixed(1)}%
                    {:else}
                      —
                    {/if}
                  </span>
                </div>
                <div class="summary-stat">
                  <span class="stat-label">Total Students</span>
                  <span class="stat-value">{group.results.length}</span>
                </div>
                <div class="summary-stat">
                  <span class="stat-label">Avg Violations</span>
                  <span class="stat-value">
                    {(group.results.reduce((sum, r) => sum + r.violationCount, 0) / group.results.length).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
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

  .filter-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
    padding: 0.375rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-muted);
    transition: border-color 0.15s;
  }

  .filter-item:focus-within {
    border-color: var(--lc-600, #4f46e5);
  }

  .filter-item input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.82rem;
    color: var(--color-text);
    font-family: inherit;
    width: 100%;
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
  }

  .filter-group select:focus {
    border-color: var(--lc-600, #4f46e5);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    text-align: center;
    color: var(--color-muted);
  }

  .empty-state :global(svg) {
    color: var(--color-muted);
    opacity: 0.5;
  }

  .empty-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .empty-sub {
    font-size: 0.875rem;
    margin: 0;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .exam-group {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--color-surface);
  }

  .exam-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.875rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.12s;
    gap: 0.5rem;
  }

  .exam-header:hover {
    background: var(--color-bg);
  }

  .exam-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
    color: var(--color-text);
  }

  .exam-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .course-code {
    font-weight: 700;
    color: var(--lc-600, #4f46e5);
    font-size: 0.78rem;
    background: var(--lc-soft, rgba(79,70,229,0.06));
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
  }

  .status-badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .badge-draft { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .badge-scheduled { background: rgba(59,130,246,0.1); color: #2563eb; }
  .badge-active { background: rgba(34,197,94,0.12); color: #15803d; }
  .badge-completed { background: rgba(107,114,128,0.12); color: var(--color-muted); }
  .badge-cancelled { background: rgba(239,68,68,0.1); color: #ef4444; }

  .student-count {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .student-count :global(svg) {
    flex-shrink: 0;
  }

  .exam-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-icon {
    width: 30px;
    height: 30px;
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
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

  .exam-details {
    padding: 0 1rem 1rem;
    overflow-x: auto;
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
  .grade-f { color: #dc2626; background: rgba(220,38,38,0.08); }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge :global(svg) {
    flex-shrink: 0;
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

  .exam-summary {
    display: flex;
    gap: 2rem;
    padding: 0.75rem 0.75rem 0;
    margin-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .summary-stat {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .stat-label {
    font-size: 0.68rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }

  .stat-value {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--color-text);
  }

  @media (max-width: 640px) {
    .filters {
      flex-direction: column;
    }

    .filter-group {
      width: 100%;
    }

    .filter-item {
      min-width: unset;
    }

    .filter-group select {
      flex: 1;
      min-width: unset;
    }

    .exam-header {
      flex-wrap: wrap;
    }

    .exam-info {
      flex-wrap: wrap;
    }

    .exam-summary {
      flex-wrap: wrap;
      gap: 0.75rem;
    }
  }
</style>