<!-- src/lib/components/reports/views/AuditLogsView.svelte -->
<script lang="ts">
  import type { AuditLogData, ReportMeta, ReportParams } from '$lib/types/reports.js';
  import { ShieldCheck, AlertTriangle, Info, XCircle, Search } from '@lucide/svelte';

  interface Props {
    meta: ReportMeta;
    params: ReportParams;
    data: Record<string, unknown>;
  }

  let { meta, params, data }: Props = $props();

  const logs = $derived((data.logs as AuditLogData['logs']) ?? []);
  const summary = $derived((data.summary as AuditLogData['summary']) ?? null);
  const filters = $derived((data.filters as AuditLogData['filters']) ?? null);

  const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string; label: string }> = {
    info:    { icon: Info, color: '#3b82f6', bg: '#eff6ff', label: 'Info' },
    warning: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', label: 'Warning' },
    error:   { icon: XCircle, color: '#ef4444', bg: '#fef2f2', label: 'Error' },
    critical:{ icon: ShieldCheck, color: '#dc2626', bg: '#fef2f2', label: 'Critical' },
  };

  let searchTerm = $state(params.q ?? '');
  let severityFilter = $state('all');

  const filteredLogs = $derived(
    logs.filter((log) => {
      if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          log.user.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q) ||
          log.ip.includes(q)
        );
      }
      return true;
    })
  );

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
</script>

<div class="report-view">
  <!-- Summary Cards -->
  {#if summary}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><ShieldCheck size={18} /></div>
        <div class="stat-info">
          <span class="stat-value">{summary.totalLogs.toLocaleString()}</span>
          <span class="stat-label">Total Logs</span>
        </div>
      </div>
      {#each Object.entries(summary.bySeverity ?? {}) as [sev, count]}
        {@const cfg = severityConfig[sev] ?? severityConfig.info}
        <div class="stat-card">
          <div class="stat-icon" style="background: {cfg.bg}; color: {cfg.color}">
            <cfg.icon size={18} />
          </div>
          <div class="stat-info">
            <span class="stat-value">{count}</span>
            <span class="stat-label">{cfg.label}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Filters -->
  <div class="toolbar">
    <div class="search-box">
      <Search size={14} />
      <input
        type="text"
        placeholder="Search logs..."
        bind:value={searchTerm}
      />
    </div>
    <div class="severity-filters">
      <button class="filter-btn" class:active={severityFilter === 'all'} onclick={() => severityFilter = 'all'}>All</button>
      {#each Object.entries(severityConfig) as [key, cfg]}
        <button class="filter-btn" class:active={severityFilter === key} onclick={() => severityFilter = key}>
          <cfg.icon size={12} />
          {cfg.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Logs Table -->
  <div class="panel">
    <div class="panel-head">
      <h2>Audit Log Entries</h2>
      <span class="panel-sub">{filteredLogs.length} of {logs.length} entries</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Time</th>
            <th>User</th>
            <th>Role</th>
            <th>Action</th>
            <th>Entity</th>
            <th>IP Address</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredLogs.length === 0}
            <tr><td colspan="8" class="empty">No audit logs match your filters.</td></tr>
          {:else}
            {#each filteredLogs as log}
              {@const cfg = severityConfig[log.severity] ?? severityConfig.info}
              <tr>
                <td>
                  <span class="severity-badge" style="background: {cfg.bg}; color: {cfg.color}">
                    <cfg.icon size={12} />
                    {cfg.label}
                  </span>
                </td>
                <td class="time-cell">{formatTime(log.timestamp)}</td>
                <td class="user-cell">{log.user}</td>
                <td><span class="role-badge">{log.user_role}</span></td>
                <td class="action-cell">{log.action}</td>
                <td><span class="entity-badge">{log.entity}</span></td>
                <td class="mono">{log.ip}</td>
                <td>
                  {#if log.details && Object.keys(log.details).length > 0}
                    <details class="detail-pop">
                      <summary>View</summary>
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </details>
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .report-view { display: flex; flex-direction: column; gap: 1.25rem; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.875rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .stat-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

  .stat-info { display: flex; flex-direction: column; gap: 0.05rem; }
  .stat-value { font-size: 1.25rem; font-weight: 800; color: var(--color-text, #111827); line-height: 1; }
  .stat-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted, #6b7280); }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    min-width: 260px;
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    width: 100%;
    color: var(--color-text, #111827);
  }

  .severity-filters {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    background: var(--color-bg, #f9fafb);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-btn:hover { border-color: #3b82f6; color: #3b82f6; }
  .filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: white; }

  .panel {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }
  .panel-head h2 { font-size: 0.85rem; font-weight: 700; color: var(--color-text, #111827); margin: 0; }
  .panel-sub { font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .table-wrap { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  th {
    padding: 0.625rem 0.875rem;
    text-align: left;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #6b7280);
    background: var(--color-bg, #f9fafb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }

  td {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }

  tr:hover td { background: var(--color-bg, #f9fafb); }

  .empty { text-align: center; padding: 2.5rem; color: var(--color-muted, #6b7280); }

  .severity-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 0.375rem;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .time-cell { font-size: 0.75rem; color: var(--color-muted, #6b7280); }
  .user-cell { font-weight: 600; color: var(--color-text, #111827); }
  .action-cell { font-weight: 500; }

  .role-badge, .entity-badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    background: var(--color-bg, #f3f4f6);
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
  }

  .mono { font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size: 0.75rem; }
  .muted { color: var(--color-muted, #9ca3af); font-size: 0.8rem; }

  .detail-pop summary {
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    color: #3b82f6;
    list-style: none;
  }
  .detail-pop summary::-webkit-details-marker { display: none; }

  .detail-pop pre {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-bg, #f9fafb);
    border-radius: 0.5rem;
    font-size: 0.7rem;
    overflow-x: auto;
    max-width: 300px;
    border: 1px solid var(--color-border, #e5e7eb);
  }
</style>
