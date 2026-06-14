<!-- src/routes/(admin)/security/incidents/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Shield } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const { incidents } = data;

  const SEV_CLASS: Record<string, string> = {
    low:      'sev-low',
    medium:   'sev-medium',
    high:     'sev-high',
    critical: 'sev-critical',
  };

  const STATUS_CLASS: Record<string, string> = {
    resolved:      'status-resolved',
    investigating: 'status-investigating',
    open:          'status-open',
  };

  function fmt(key: string) {
    return key.replace(/_/g, ' ');
  }
</script>

<svelte:head><title>Security Incidents — MOUAU eTest</title></svelte:head>

<div class="page">

  <header class="page-header">
    <div>
      <h1>Security Incidents</h1>
      <p class="subtitle">High-severity violations requiring administrative review</p>
    </div>
    <div class="header-badge">
      <Shield size={14} />
      <span>{incidents.length} incidents</span>
    </div>
  </header>

  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Description</th>
            <th>Severity</th>
            <th>Exam</th>
            <th>Student</th>
            <th>Detected</th>
            <th>Status</th>
            <th>Action taken</th>
          </tr>
        </thead>
        <tbody>
          {#if incidents.length === 0}
            <tr>
              <td colspan="9" class="empty-row">No security incidents recorded.</td>
            </tr>
          {:else}
            {#each incidents as inc}
              <tr>
                <td><code class="iid">{inc.id}</code></td>

                <td><span class="type-pill">{fmt(inc.type)}</span></td>

                <td class="desc-cell">{inc.description}</td>

                <td>
                  <span class="badge {SEV_CLASS[inc.severity] ?? 'sev-medium'}">
                    {inc.severity}
                  </span>
                </td>

                <td class="muted-cell truncate">{inc.exam}</td>

                <td class="student-cell">{inc.student}</td>

                <td class="time-cell">{inc.detectedAt}</td>

                <td>
                  <span class="badge {STATUS_CLASS[inc.status] ?? 'status-open'}">
                    {inc.status}
                  </span>
                </td>

                <td><span class="action-pill">{fmt(inc.action)}</span></td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

</div>

<style>
  .page {
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  h1 { font-size: 1.4rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--color-text); }
  .subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    background: rgba(59,130,246,0.08);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 999px;
    font-size: 0.75rem; font-weight: 700; color: #3b82f6;
    flex-shrink: 0;
  }

  /* ── Table card ──────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }

  .table-scroll { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; white-space: nowrap; }

  thead { background: var(--color-bg); }

  th {
    padding: 0.625rem 1rem; text-align: left;
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }

  /* ── Cell types ──────────────────────────────────────── */
  .iid {
    font-family: monospace; font-size: 0.72rem; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.4rem; border-radius: 0.3rem;
  }

  .type-pill,
  .action-pill {
    padding: 0.2rem 0.55rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.35rem;
    font-size: 0.72rem; font-weight: 600;
    text-transform: capitalize;
    color: var(--color-text);
    white-space: nowrap;
  }

  .desc-cell {
    max-width: 240px;
    white-space: normal;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--color-muted);
  }

  .muted-cell { color: var(--color-muted); font-size: 0.78rem; }

  .truncate {
    max-width: 160px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .student-cell { font-weight: 600; font-size: 0.82rem; }

  .time-cell {
    font-family: monospace; font-size: 0.75rem; color: var(--color-muted);
  }

  /* ── Badges ──────────────────────────────────────────── */
  .badge {
    display: inline-flex;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem; font-weight: 700;
    text-transform: capitalize; white-space: nowrap;
  }

  .sev-low      { background: rgba(22,163,74,0.1);   color: #16a34a; }
  .sev-medium   { background: rgba(245,158,11,0.1);  color: #d97706; }
  .sev-high     { background: rgba(59,130,246,0.12); color: #3b82f6; }
  .sev-critical { background: rgba(220,38,38,0.12);  color: #dc2626; }

  .status-open          { background: rgba(220,38,38,0.1);   color: #dc2626; }
  .status-investigating { background: rgba(245,158,11,0.1);  color: #d97706; }
  .status-resolved      { background: rgba(22,163,74,0.1);   color: #16a34a; }

  /* ── Empty ───────────────────────────────────────────── */
  .empty-row {
    text-align: center; padding: 3rem 1rem !important;
    color: var(--color-muted); font-size: 0.875rem;
  }

  /* ── Dark mode ───────────────────────────────────────── */
  :global(.dark) .header-badge { background: rgba(59,130,246,0.12); }
</style>