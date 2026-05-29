<script lang="ts">
  import { ShieldCheck, Users, ClipboardList, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-svelte';

  let invigilators = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(invigilators.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())));

  function getStatusColor(s: string) {
    return { active: 'status-active', offline: 'status-offline' }[s] || 'status-offline';
  }
</script>

<svelte:head><title>Invigilator Assignments — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Invigilator Assignments</h1>
    <p class="subtitle">Monitor invigilator workload, response times, and session coverage</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <ShieldCheck size={16} />
      <input type="text" placeholder="Search invigilators..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Invigilator</th>
          <th>Assigned Exams</th>
          <th>Active Sessions</th>
          <th>Total Students</th>
          <th>Violations Handled</th>
          <th>Avg Response</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as inv}
          <tr>
            <td>
              <div class="invigilator-cell">
                <div class="invigilator-avatar">{inv.name.charAt(0)}</div>
                <span class="invigilator-name">{inv.name}</span>
              </div>
            </td>
            <td>{inv.assignedExams}</td>
            <td>
              <span class="active-count" class:alert={inv.activeSessions > 2}>
                {inv.activeSessions} <ClipboardList size={12} />
              </span>
            </td>
            <td>{inv.totalStudents.toLocaleString()}</td>
            <td>
              <span class="violation-count" class:alert={inv.violationsHandled > 10}>
                <AlertTriangle size={12} />
                {inv.violationsHandled}
              </span>
            </td>
            <td>{inv.responseTime}</td>
            <td><span class="status-badge {getStatusColor(inv.status)}">{inv.status}</span></td>
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

  .invigilator-cell { display: flex; align-items: center; gap: 0.75rem; }
  .invigilator-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #f97316); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; }
  .invigilator-name { font-weight: 600; color: var(--color-text); }

  .active-count { display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #16a34a; }
  .active-count.alert { color: #ef4444; }

  .violation-count { display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: var(--color-muted); }
  .violation-count.alert { color: #ef4444; }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-active { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-offline { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
</style>