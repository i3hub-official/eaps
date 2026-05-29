<script lang="ts">
  import { ScrollText, Search, Shield, UserPlus, FileEdit, Trash2, Eye, Clock, Filter } from 'lucide-svelte';

  let logs = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(logs.filter(l => l.user.toLowerCase().includes(searchQuery.toLowerCase()) || l.action.toLowerCase().includes(searchQuery.toLowerCase()) || l.details.toLowerCase().includes(searchQuery.toLowerCase())));

  function getActionIcon(action: string) {
    const icons = { USER_CREATED: UserPlus, EXAM_CREATED: FileEdit, USER_SUSPENDED: Shield, EXAM_UPDATED: FileEdit, VIOLATION_FLAGGED: Eye, USER_DELETED: Trash2 };
    return icons[action as keyof typeof icons] || ScrollText;
  }
  function getActionColor(action: string) {
    const colors = { USER_CREATED: 'action-create', EXAM_CREATED: 'action-create', USER_SUSPENDED: 'action-suspend', EXAM_UPDATED: 'action-update', VIOLATION_FLAGGED: 'action-alert', USER_DELETED: 'action-delete' };
    return colors[action as keyof typeof colors] || 'action-default';
  }
</script>

<svelte:head><title>Audit Logs — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Audit Logs</h1>
    <p class="subtitle">Complete trail of admin actions, system events, and data changes</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search audit logs..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Action</th>
          <th>Entity</th>
          <th>Details</th>
          <th>IP Address</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as log}
          {@const ActionIcon = getActionIcon(log.action)}
          <tr>
            <td><span class="log-id">{log.id}</span></td>
            <td>{log.user}</td>
            <td>
              <span class="action-badge {getActionColor(log.action)}">
                <ActionIcon size={12} />
                {log.action.replace('_', ' ')}
              </span>
            </td>
            <td>
              <span class="entity-badge">{log.entity} <span class="entity-id">{log.entityId}</span></span>
            </td>
            <td class="details-cell">{log.details}</td>
            <td><span class="ip-badge">{log.ip}</span></td>
            <td class="time-cell">{log.timestamp}</td>
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

  .log-id { font-family: monospace; font-size: 0.8rem; color: var(--color-muted); background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; }

  .action-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
  .action-create { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .action-update { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .action-suspend { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .action-delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .action-alert { background: rgba(220, 38, 38, 0.15); color: #dc2626; }
  .action-default { background: var(--color-bg); color: var(--color-text); }

  .entity-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; color: var(--color-text); }
  .entity-id { font-family: monospace; font-size: 0.75rem; color: var(--color-muted); background: var(--color-bg); padding: 0.125rem 0.25rem; border-radius: 0.25rem; }

  .details-cell { max-width: 300px; font-size: 0.8rem; line-height: 1.4; }
  .ip-badge { font-family: monospace; font-size: 0.75rem; color: var(--color-muted); background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
  .time-cell { font-size: 0.8rem; color: var(--color-muted); font-family: monospace; }
</style>