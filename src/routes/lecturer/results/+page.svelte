<script lang="ts">
  import { 
    BarChart2, TrendingUp, Users, CheckCircle, XCircle, 
    ArrowRight, FileText, Building2, GraduationCap, 
    CalendarDays, Layers, ChevronDown 
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  let activeTab = $state<'all' | 'college' | 'department' | 'semester' | 'level'>('all');
  let expandedGroup = $state<string | null>(null);

  const tabs = [
    { id: 'all', label: 'All Exams', icon: FileText },
    { id: 'college', label: 'By College', icon: Building2 },
    { id: 'department', label: 'By Department', icon: Layers },
    { id: 'semester', label: 'By Semester', icon: CalendarDays },
    { id: 'level', label: 'By Level', icon: GraduationCap },
  ] as const;

  function toggleGroup(key: string) {
    expandedGroup = expandedGroup === key ? null : key;
  }

  function getPassRate(passed: number, total: number) {
    return total > 0 ? Math.round((passed / total) * 100) : 0;
  }
</script>

<svelte:head><title>Exam Results — MOUAU eTest</title></svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-icon">
      <BarChart2 size={20} />
    </div>
    <div class="header-text">
      <h1>Exam Results</h1>
      <p>Performance overview for completed examinations</p>
    </div>
  </div>

  {#if data.results.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <FileText size={40} />
      </div>
      <h3>No Results Yet</h3>
      <p>Exams you create will appear here once students have completed them.</p>
    </div>
  {:else}
    <!-- Stats Summary -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon--blue">
          <FileText size={16} />
        </div>
        <div class="stat-info">
          <span class="stat-value">{data.results.length}</span>
          <span class="stat-label">Total Exams</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--green">
          <Users size={16} />
        </div>
        <div class="stat-info">
          <span class="stat-value">{data.results.reduce((a, r) => a + r.submitted, 0)}</span>
          <span class="stat-label">Submissions</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--emerald">
          <CheckCircle size={16} />
        </div>
        <div class="stat-info">
          <span class="stat-value">{data.results.reduce((a, r) => a + r.passed, 0)}</span>
          <span class="stat-label">Passed</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--red">
          <XCircle size={16} />
        </div>
        <div class="stat-info">
          <span class="stat-value">{data.results.reduce((a, r) => a + r.failed, 0)}</span>
          <span class="stat-label">Failed</span>
        </div>
      </div>
    </div>

    <!-- Grouping Tabs -->
    <div class="tabs-bar">
      {#each tabs as tab}
        <button
          class="tab-btn"
          class:tab-btn--active={activeTab === tab.id}
          onclick={() => activeTab = tab.id}
        >
          <tab.icon size={14} />
          <span>{tab.label}</span>
        </button>
      {/each}
    </div>

    <!-- Content -->
    {#if activeTab === 'all'}
      {@render examTable(data.results)}
    {:else}
      {@render groupedView(activeTab)}
    {/if}
  {/if}
</div>

{#snippet examTable(exams: typeof data.results)}
  <div class="table-card">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Examination</th>
            <th>Course</th>
            <th class="numeric">Students</th>
            <th class="numeric">Submitted</th>
            <th class="numeric">Passed</th>
            <th class="numeric">Failed</th>
            <th class="numeric">Avg Score</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each exams as r}
            <tr class="table-row">
              <td>
                <div class="exam-name">{r.exam_title}</div>
                {#if r.level}
                  <span class="meta-tag">Level {r.level}</span>
                {/if}
                {#if r.semester}
                  <span class="meta-tag">{r.semester}</span>
                {/if}
              </td>
              <td>
                <span class="course-badge">{r.course_code}</span>
              </td>
              <td class="numeric">{r.total_students}</td>
              <td class="numeric">
                <span class="metric-badge metric-badge--submitted">{r.submitted}</span>
              </td>
              <td class="numeric">
                <span class="metric-badge metric-badge--pass">{r.passed}</span>
              </td>
              <td class="numeric">
                <span class="metric-badge metric-badge--fail">{r.failed}</span>
              </td>
              <td class="numeric">
                {#if r.avg_score != null}
                  <span class="score-badge" 
                    class:score-badge--high={r.avg_score >= 70} 
                    class:score-badge--mid={r.avg_score >= 50 && r.avg_score < 70} 
                    class:score-badge--low={r.avg_score < 50}>
                    {r.avg_score}%
                  </span>
                {:else}
                  <span class="score-empty">—</span>
                {/if}
              </td>
              <td>
                <a href="/lecturer/results/{r.exam_id}" class="view-link">
                  <span>Details</span>
                  <ArrowRight size={14} />
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/snippet}

{#snippet groupedView(type: typeof activeTab)}
  <div class="groups-list">
    {#each data.groupings[`by${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof data.groupings] as group (group[type === 'college' ? 'college_id' : type === 'department' ? 'department_id' : type])}
      <div class="group-card">
        <button class="group-header" onclick={() => toggleGroup(group[type === 'college' ? 'college_id' : type === 'department' ? 'department_id' : type])}>
          <div class="group-title">
            <div class="group-icon">
              {#if type === 'college'}
                <Building2 size={16} />
              {:else if type === 'department'}
                <Layers size={16} />
              {:else if type === 'semester'}
                <CalendarDays size={16} />
              {:else}
                <GraduationCap size={16} />
              {/if}
            </div>
            <div class="group-info">
              <span class="group-name">
                {type === 'college' ? group.college_name : 
                 type === 'department' ? group.department_name : 
                 type === 'level' ? `Level ${group.level}` : group.semester}
              </span>
              <span class="group-meta">{group.exams.length} exam{group.exams.length === 1 ? '' : 's'} • {group.total_students} students</span>
            </div>
          </div>
          <div class="group-stats">
            <div class="group-stat">
              <span class="group-stat-value" style="color: #10b981">{group.passed}</span>
              <span class="group-stat-label">Passed</span>
            </div>
            <div class="group-stat">
              <span class="group-stat-value" style="color: #ef4444">{group.failed}</span>
              <span class="group-stat-label">Failed</span>
            </div>
            <div class="group-stat">
              <span class="group-stat-value">{group.avg_score ?? '—'}{#if group.avg_score != null}%{/if}</span>
              <span class="group-stat-label">Avg</span>
            </div>
            <div class="group-stat">
              <span class="group-stat-value" style="color: #3b82f6">{getPassRate(group.passed, group.submitted)}%</span>
              <span class="group-stat-label">Pass Rate</span>
            </div>
            <ChevronDown size={16} class="chevron" style="transform: rotate({expandedGroup === (group[type === 'college' ? 'college_id' : type === 'department' ? 'department_id' : type]) ? '180deg' : '0deg'}); transition: transform 0.2s" />
          </div>
        </button>

        {#if expandedGroup === (group[type === 'college' ? 'college_id' : type === 'department' ? 'department_id' : type])}
          <div class="group-exams" transition:slide>
            {@render examTable(group.exams)}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

<style>
  /* ── Page Layout ─────────────────────────────────────────────── */
  .page {
    padding: 1.5rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ─────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding-bottom: 0.5rem;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h1 {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .header-text p {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
  }

  /* ── Stats Grid ──────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition: all 0.15s;
  }

  .stat-card:hover {
    border-color: var(--color-border-hover);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-icon--blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .stat-icon--green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
  .stat-icon--emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .stat-icon--red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  /* ── Tabs ────────────────────────────────────────────────────── */
  .tabs-bar {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-muted);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .tab-btn:hover {
    color: var(--color-text);
    background: var(--color-surface);
  }

  .tab-btn--active {
    background: var(--color-surface) !important;
    color: #3b82f6 !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  /* ── Table ───────────────────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    background: var(--color-bg);
  }

  th {
    padding: 0.875rem 1.25rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  td {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .table-row {
    transition: background 0.12s;
  }

  .table-row:hover {
    background: var(--color-bg);
  }

  .numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .exam-name {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .meta-tag {
    display: inline-block;
    margin-top: 0.25rem;
    margin-right: 0.375rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .course-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    font-family: 'SF Mono', Monaco, monospace;
    font-variant-numeric: tabular-nums;
  }

  .metric-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .metric-badge--submitted { background: rgba(59, 130, 246, 0.08); color: #3b82f6; }
  .metric-badge--pass { background: rgba(16, 185, 129, 0.08); color: #10b981; }
  .metric-badge--fail { background: rgba(239, 68, 68, 0.08); color: #ef4444; }

  .score-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .score-badge--high { background: rgba(16, 185, 129, 0.1); color: #059669; }
  .score-badge--mid { background: rgba(245, 158, 11, 0.1); color: #d97706; }
  .score-badge--low { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

  .score-empty {
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .view-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: rgba(59, 130, 246, 0.06);
    border: 1px solid rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .view-link:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateX(2px);
  }

  /* ── Grouped View ──────────────────────────────────────────── */
  .groups-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .group-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 1rem 1.25rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    text-align: left;
    transition: background 0.12s;
  }

  .group-header:hover {
    background: var(--color-bg);
  }

  .group-title {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .group-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.625rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .group-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .group-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .group-meta {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .group-stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .group-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
  }

  .group-stat-value {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .group-stat-label {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .chevron {
    color: var(--color-muted);
    margin-left: 0.5rem;
  }

  .group-exams {
    padding: 0 1.25rem 1.25rem;
    border-top: 1px solid var(--color-border);
  }

  .group-exams .table-card {
    border: none;
    box-shadow: none;
    border-radius: 0;
  }

  /* ── Empty State ─────────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 5rem 2rem;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 1rem;
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }

  .empty-state h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .empty-state p {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
    max-width: 320px;
    line-height: 1.5;
  }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .page { padding: 1rem; }
    .stats-grid { grid-template-columns: 1fr; }
    .group-stats { gap: 0.75rem; }
    .group-stat-label { display: none; }
    th, td { padding: 0.75rem; }
  }
</style>