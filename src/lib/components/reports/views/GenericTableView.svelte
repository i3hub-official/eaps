<!-- src/lib/components/reports/views/GenericTableView.svelte -->
<script lang="ts">
  import type { ReportMeta, ReportParams } from '$lib/types/reports.js';
  import { Table, Search, FileJson } from '@lucide/svelte';

  interface Props {
    meta: ReportMeta;
    params: ReportParams;
    data: Record<string, unknown>;
  }

  let { meta, data }: Props = $props();

  let viewMode = $state<'table' | 'json'>('table');
  let searchTerm = $state('');

  // Try to find an array in the data to render as a table
  const arrayKey = $derived(
    Object.keys(data).find(k => Array.isArray(data[k])) ?? ''
  );

  const tableData = $derived(
    arrayKey ? (data[arrayKey] as unknown[]) : []
  );

  const columns = $derived(
    tableData.length > 0 ? Object.keys(tableData[0] as object) : []
  );

  const filteredData = $derived(
    searchTerm
      ? tableData.filter((row) => {
          const q = searchTerm.toLowerCase();
          return Object.values(row as object).some(
            v => String(v).toLowerCase().includes(q)
          );
        })
      : tableData
  );

  function formatCell(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function isNumeric(value: unknown): boolean {
    return typeof value === 'number';
  }
</script>

<div class="report-view">
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="view-toggle">
      <button class="toggle-btn" class:active={viewMode === 'table'} onclick={() => viewMode = 'table'}>
        <Table size={14} /> Table
      </button>
      <button class="toggle-btn" class:active={viewMode === 'json'} onclick={() => viewMode = 'json'}>
        <FileJson size={14} /> JSON
      </button>
    </div>
    <div class="search-box">
      <Search size={14} />
      <input type="text" placeholder="Filter rows..." bind:value={searchTerm} />
    </div>
  </div>

  {#if viewMode === 'table'}
    {#if columns.length === 0}
      <div class="panel">
        <div class="empty">
          <p>No tabular data found in this report.</p>
          <p class="empty-sub">Try switching to JSON view to inspect the raw data.</p>
        </div>
      </div>
    {:else}
      <div class="panel">
        <div class="panel-head">
          <h2>{meta.label} Data</h2>
          <span class="panel-sub">{filteredData.length} of {tableData.length} rows</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                {#each columns as col}
                  <th>{col.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each filteredData as row}
                <tr>
                  {#each columns as col}
                    {@const val = (row as Record<string, unknown>)[col]}
                    <td class:num={isNumeric(val)} title={formatCell(val)}>
                      {formatCell(val)}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {:else}
    <div class="panel">
      <div class="panel-head">
        <h2>Raw JSON</h2>
      </div>
      <div class="json-body">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .report-view { display: flex; flex-direction: column; gap: 1rem; }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
  }

  .view-toggle {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-bg, #f3f4f6);
    border-radius: 0.5rem;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
  }

  .toggle-btn.active {
    background: var(--color-surface, white);
    color: var(--color-text, #111827);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    min-width: 220px;
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    width: 100%;
    color: var(--color-text, #111827);
  }

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
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tr:hover td { background: var(--color-bg, #f9fafb); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }

  .empty {
    text-align: center;
    padding: 3rem;
    color: var(--color-muted, #6b7280);
  }
  .empty-sub { font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7; }

  .json-body {
    padding: 1.25rem;
    overflow-x: auto;
  }

  .json-body pre {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--color-text, #1f2937);
  }
</style>
