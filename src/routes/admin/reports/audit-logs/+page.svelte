<!-- src/routes/admin/reports/audit-logs/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Search, Shield } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let searchValue = $state('');

  function handleSearch(e: Event) {
    e.preventDefault();
    const q = searchValue.trim();
    window.location.href = `?q=${encodeURIComponent(q)}`;
  }
</script>

<svelte:head>
  <title>Audit Logs — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>Audit Logs</h1>
      <p class="subtitle">System activity trail — last 200 entries</p>
    </div>

    <form onsubmit={handleSearch} class="search-form">
      <div class="search-input-wrap">
        <Search size={15} />
        <input
          bind:value={searchValue}
          name="q"
          type="text"
          placeholder="Search user, action, entity…"
        />
      </div>
      <button type="submit" class="search-btn">Search</button>
    </form>
  </header>

  {#if data.logs.length === 0}
    <div class="empty-state">
      <Shield size={40} opacity={0.3} />
      <p>No audit logs found.</p>
    </div>
  {:else}
    <section class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Details</th>
              <th>IP</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {#each data.logs as log}
              <tr>
                <td class="mono muted">{log.id}</td>
                <td class="bold">{log.user}</td>
                <td><span class="action-badge">{log.action}</span></td>
                <td class="muted">{log.entity}</td>
                <td class="mono muted">{log.entityId}</td>
                <td class="muted truncate" title={log.details}>{log.details}</td>
                <td class="mono muted">{log.ip}</td>
                <td class="mono muted nowrap">{log.timestamp}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<style>
  .page { max-width: 1200px; }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  .subtitle {
    color: var(--color-muted);
    margin-top: 0.25rem;
    font-size: 0.9rem;
  }

  .search-form { display: flex; gap: 0.5rem; align-items: center; }
  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: var(--color-muted);
  }
  .search-input-wrap input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text);
    width: 220px;
  }
  .search-input-wrap input::placeholder { color: var(--color-muted); }
  .search-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: #3b82f6;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .search-btn:hover { opacity: 0.85; }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 200px;
    border: 2px dashed var(--color-border);
    border-radius: 0.75rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  thead { background: var(--color-bg); }
  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    white-space: nowrap;
  }
  td {
    padding: 0.75rem 1rem;
    color: var(--color-text);
    border-top: 1px solid var(--color-border);
  }
  tbody tr:hover { background: rgba(255,255,255,0.02); }

  .mono { font-family: monospace; font-size: 0.8rem; }
  .muted { color: var(--color-muted); }
  .bold { font-weight: 600; }
  .nowrap { white-space: nowrap; }
  .truncate { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .action-badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 0.375rem;
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    font-family: monospace;
    font-size: 0.78rem;
    font-weight: 500;
  }
</style>