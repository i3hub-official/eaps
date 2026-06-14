<!-- routes/admin/reports/[reportType]/+page.svelte -->

<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { meta, params, data: reportData } = $derived(data);
</script>

<div class="report-page">
  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <div class="report-header">
    <h1>{meta.label}</h1>
    <p class="description">{meta.description}</p>
  </div>

  <!-- ── Search bar (only for reports that support it) ───────────────────── -->
  {#if meta.supportsSearch}
    <form method="GET" class="search-bar">
      <input
        name="q"
        type="search"
        placeholder="Search..."
        value={params.q ?? ''}
      />
      <button type="submit">Search</button>
    </form>
  {/if}

  <!-- ── Date range (only for reports that support it) ───────────────────── -->
  {#if meta.supportsDateRange}
    <form method="GET" class="date-range">
      <input name="from" type="date" value={params.from ?? ''} />
      <input name="to"   type="date" value={params.to   ?? ''} />
      <button type="submit">Filter</button>
    </form>
  {/if}

  <!-- ── Report data — each report renders its own component ─────────────── -->
  <!-- 
    Two options here:
    Option A (simple): one big {#if meta.id === 'audit-logs'} block
    Option B (clean):  dynamic component per report type

    Start with Option A. Migrate to B when you have 5+ reports done.
  -->
  {#if meta.id === 'grade-distribution'}
    {@const grades = reportData.gradeData as Record<string, { count: number; percentage: number; range: string }>}
    <table>
      <thead>
        <tr><th>Grade</th><th>Range</th><th>Count</th><th>%</th></tr>
      </thead>
      <tbody>
        {#each Object.entries(grades) as [grade, info]}
          <tr>
            <td>{grade}</td>
            <td>{info.range}</td>
            <td>{info.count}</td>
            <td>{info.percentage}%</td>
          </tr>
        {/each}
      </tbody>
    </table>

  {:else if meta.id === 'audit-logs'}
    {@const logs = reportData.logs as any[]}
    <table>
      <thead>
        <tr><th>ID</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th><th>Time</th></tr>
      </thead>
      <tbody>
        {#each logs as log}
          <tr>
            <td>{log.id}</td>
            <td>{log.user}</td>
            <td>{log.action}</td>
            <td>{log.entity}</td>
            <td>{log.ip}</td>
            <td>{log.timestamp}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .report-page {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .report-header {
    margin-bottom: 1.5rem;
  }

  .report-header h1 {
    font-size: 1.875rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .description {
    color: #6b7280;
    margin: 0;
  }

  .search-bar,
  .date-range {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  input[type="search"],
  input[type="date"] {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  button[type="submit"] {
    padding: 0.5rem 1rem;
    background: #111827;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  button[type="submit"]:hover {
    background: #374151;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    background: #f9fafb;
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  tbody tr:hover {
    background: #f9fafb;
  }
</style>