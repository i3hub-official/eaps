<script lang="ts">
  import { AlertTriangle, Shield, EyeOff, Clock, TrendingUp, TrendingDown, Filter, Search } from 'lucide-svelte';

  let violations = $state([]);

  let summary = $state({});

  let searchQuery = $state('');
  let filtered = $derived(violations.filter(v => v.student.toLowerCase().includes(searchQuery.toLowerCase()) || v.matric.toLowerCase().includes(searchQuery.toLowerCase()) || v.type.toLowerCase().includes(searchQuery.toLowerCase())));

  function getSeverityColor(s: string) {
    return { low: 'sev-low', medium: 'sev-medium', high: 'sev-high', critical: 'sev-critical' }[s] || 'sev-medium';
  }
  function getActionColor(a: string) {
    return { warning: 'act-warning', invigilator_alerted: 'act-alert', exam_paused: 'act-paused', auto_submitted: 'act-auto' }[a] || 'act-warning';
  }
</script>

<svelte:head><title>Violations Overview — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Violations Overview</h1>
    <p class="subtitle">Real-time security incident monitoring and violation logs</p>
  </header>

  <section class="summary-row">
    <div class="summary-card alert">
      <AlertTriangle size={20} />
      <div>
        <span class="summary-value">{summary.total}</span>
        <span class="summary-label">Total Violations</span>
      </div>
    </div>
    <div class="summary-card">
      <Clock size={20} />
      <div>
        <span class="summary-value">{summary.today}</span>
        <span class="summary-label">Today</span>
      </div>
    </div>
    <div class="summary-card critical">
      <Shield size={20} />
      <div>
        <span class="summary-value">{summary.critical}</span>
        <span class="summary-label">Critical</span>
      </div>
    </div>
    <div class="summary-card">
      <EyeOff size={20} />
      <div>
        <span class="summary-value">{summary.high}</span>
        <span class="summary-label">High Severity</span>
      </div>
    </div>
  </section>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search violations..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Student</th>
          <th>Exam</th>
          <th>Type</th>
          <th>Severity</th>
          <th>Action</th>
          <th>Flagged At</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as v}
          <tr>
            <td><span class="violation-id">{v.id}</span></td>
            <td>
              <div class="student-cell">
                <span class="student-name">{v.student}</span>
                <span class="student-matric">{v.matric}</span>
              </div>
            </td>
            <td>{v.exam}</td>
            <td><span class="type-badge">{v.type.replace('_', ' ')}</span></td>
            <td><span class="severity-badge {getSeverityColor(v.severity)}">{v.severity}</span></td>
            <td><span class="action-badge {getActionColor(v.action)}">{v.action.replace('_', ' ')}</span></td>
            <td class="time-cell">{v.flaggedAt}</td>
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

  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 768px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #f59e0b; }
  .summary-card.alert { color: #ef4444; }
  .summary-card.critical { color: #dc2626; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-box { display: flex; align-items: center; gap: 0.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.5rem 0.75rem; flex: 1; min-width: 200px; }
  .search-box input { border: none; background: none; outline: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .violation-id { font-family: monospace; font-size: 0.8rem; color: var(--color-muted); background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; }

  .student-cell { display: flex; flex-direction: column; }
  .student-name { font-weight: 600; color: var(--color-text); }
  .student-matric { font-size: 0.75rem; color: var(--color-muted); }

  .type-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: var(--color-bg); color: var(--color-text); text-transform: capitalize; }

  .severity-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .sev-low { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .sev-medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .sev-high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .sev-critical { background: rgba(220, 38, 38, 0.15); color: #dc2626; }

  .action-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .act-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .act-alert { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .act-paused { background: rgba(220, 38, 38, 0.15); color: #dc2626; }
  .act-auto { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

  .time-cell { font-size: 0.8rem; color: var(--color-muted); font-family: monospace; }
</style>