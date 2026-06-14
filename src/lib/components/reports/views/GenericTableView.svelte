<script lang="ts">
  import type { ReportMeta, ReportParams, ViewMode } from '$lib/types/reports.js';
  import { formatId, isIdKey, isRawId } from '$lib/utils/formatId.js';
import Pagination     from '$lib/components/ui/Pagination.svelte';
import ReportToolbar  from '$lib/components/ui/ReportToolbar.svelte';
import AlphaGroupTabs from '$lib/components/ui/AlphaGroupTabs.svelte';
import ExportBar      from '$lib/components/ui/ExportBar.svelte';

  interface Props {
    meta:   ReportMeta;
    params: ReportParams;
    data:   Record<string, unknown>;
  }

  let { meta, data }: Props = $props();

  // ── Find the primary array in data ───────────────────────────────────
  const arrayKey  = $derived(Object.keys(data).find(k => Array.isArray(data[k])) ?? '');
  const rawData   = $derived(arrayKey ? (data[arrayKey] as Record<string, unknown>[]) : []);
  const columns   = $derived(rawData.length > 0 ? Object.keys(rawData[0]) : []);

  // Columns to show (hide pure UUID columns)
  const visibleCols = $derived(
    columns.filter(k => {
      const sample = rawData[0]?.[k];
      if (typeof sample === 'string' && isRawId(sample) && !isIdKey(k)) return false;
      return true;
    })
  );

  const sortableCols = $derived(
    visibleCols.map(k => ({
      key:   k,
      label: k.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }))
  );

  // ── UI state ──────────────────────────────────────────────────────────
  let viewMode     = $state<ViewMode>('list');
  let page         = $state(1);
  let pageSize     = $state(20);
  let sortKey      = $state('');
  let sortDir      = $state<'asc' | 'desc'>('asc');
  let groupByAlpha = $state(false);
  let activeLetter = $state('');
  let searchTerm   = $state('');

  const AVAILABLE_VIEWS: ViewMode[] = ['list', 'grid'];

  // ── Derive name field for grouping ────────────────────────────────────
  const nameField = $derived(
    columns.find(k => ['name', 'title', 'full_name', 'fullName', 'label', 'code'].includes(k)) ?? columns[0] ?? ''
  );

  // ── Pipeline: filter → sort → group → paginate ───────────────────────
  const filtered = $derived(
    searchTerm
      ? rawData.filter(row =>
          Object.values(row).some(v =>
            String(v ?? '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : rawData
  );

  const letterFiltered = $derived(
    activeLetter && nameField
      ? filtered.filter(row =>
          String(row[nameField] ?? '').toUpperCase().startsWith(activeLetter)
        )
      : filtered
  );

  const sorted = $derived(() => {
    if (!sortKey) return letterFiltered;
    return [...letterFiltered].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  });

  const availableLetters = $derived(
    [...new Set(
      filtered.map(row => String(row[nameField] ?? '').toUpperCase()[0]).filter(Boolean)
    )].sort()
  );

  const paginated = $derived(sorted().slice((page - 1) * pageSize, page * pageSize));

  // ── Cell formatter ─────────────────────────────────────────────────
  function formatCell(key: string, val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'string' && isIdKey(key) && isRawId(val)) return formatId(val);
    if (typeof val === 'string' && isIdKey(key)) return val.toUpperCase();
    if (typeof val === 'number') return val.toLocaleString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  function colLabel(k: string) {
    return k.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function handlePageChange(p: number, ps: number) {
    page = p; pageSize = ps;
  }

  function handleSort(key: string, dir: 'asc' | 'desc') {
    sortKey = key; sortDir = dir; page = 1;
  }

  function handleViewChange(v: ViewMode) {
    viewMode = v;
  }

  function handleGroupToggle() {
    groupByAlpha = !groupByAlpha;
    activeLetter = '';
    page = 1;
  }

  function handleLetterSelect(letter: string) {
    activeLetter = letter;
    page = 1;
  }
</script>

<div class="generic-view">
  <!-- Toolbar -->
  <div class="toolbar-row">
    <ReportToolbar
      {viewMode}
      availableViews={AVAILABLE_VIEWS}
      {sortKey} {sortDir}
      {groupByAlpha}
      sortableColumns={sortableCols}
      onViewChange={handleViewChange}
      onSortChange={handleSort}
      onGroupToggle={handleGroupToggle}
    />
    <ExportBar rows={filtered} filename={meta.id} sheetName={meta.label} />
  </div>

  <!-- Search -->
  <div class="search-row">
    <input
      class="search-input"
      type="search"
      placeholder="Search all fields..."
      bind:value={searchTerm}
      oninput={() => { page = 1; }}
    />
    <span class="result-count">{filtered.length.toLocaleString()} results</span>
  </div>

  <!-- Alpha tabs -->
  {#if groupByAlpha}
    <AlphaGroupTabs
      letters={availableLetters}
      activeLetter={activeLetter}
      onselect={handleLetterSelect}
    />
  {/if}

  <!-- Panel -->
  <div class="panel">
    {#if viewMode === 'list'}
      <!-- ── LIST / TABLE ──────────────────────────────────────────── -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              {#each visibleCols as col}
                <th
                  class:sortable={true}
                  class:sorted={sortKey === col}
                  onclick={() => handleSort(col, sortKey === col && sortDir === 'asc' ? 'desc' : 'asc')}
                >
                  {colLabel(col)}
                  {#if sortKey === col}
                    <span class="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  {/if}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#if paginated.length === 0}
              <tr>
                <td colspan={visibleCols.length} class="empty">No data matches your filters.</td>
              </tr>
            {:else}
              {#each paginated as row}
                <tr>
                  {#each visibleCols as col}
                    {@const val = row[col]}
                    <td
                      class:num={typeof val === 'number'}
                      class:id-cell={isIdKey(col)}
                      title={formatCell(col, val)}
                    >
                      {formatCell(col, val)}
                    </td>
                  {/each}
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

    {:else}
      <!-- ── GRID ───────────────────────────────────────────────────── -->
      <div class="grid-wrap">
        {#if paginated.length === 0}
          <div class="empty-grid">No data matches your filters.</div>
        {:else}
          <div class="cards-grid">
            {#each paginated as row}
              <div class="data-card">
                {#if nameField}
                  <div class="card-title">{String(row[nameField] ?? '—')}</div>
                {/if}
                <div class="card-fields">
                  {#each visibleCols.filter(c => c !== nameField) as col}
                    <div class="card-field">
                      <span class="field-label">{colLabel(col)}</span>
                      <span class="field-value" class:id-val={isIdKey(col)}>
                        {formatCell(col, row[col])}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Pagination -->
    <Pagination
      {page}
      {pageSize}
      total={sorted().length}
      onchange={handlePageChange}
    />
  </div>
</div>

<style>
  .generic-view { display: flex; flex-direction: column; gap: 1rem; }

  .toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1;
    min-width: 240px;
    padding: 0.55rem 0.875rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.625rem;
    font-size: 0.85rem;
    outline: none;
    background: var(--color-surface, white);
    color: var(--color-text, #111827);
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: var(--g500, #22c55e); }

  .result-count {
    font-size: 0.78rem;
    color: var(--color-muted, #6b7280);
    white-space: nowrap;
  }

  .panel {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
  }

  /* ── Table ── */
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
    cursor: pointer;
    user-select: none;
    transition: color 0.15s;
  }

  th:hover, th.sorted { color: var(--g600, #16a34a); }

  .sort-indicator { margin-left: 0.25rem; font-weight: 800; color: var(--g600, #16a34a); }

  td {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--g-soft, rgba(22,163,74,0.04)); }

  .num      { text-align: right; font-variant-numeric: tabular-nums; }
  .id-cell  { font-family: ui-monospace, monospace; font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .empty { text-align: center; padding: 3rem; color: var(--color-muted, #9ca3af); }

  /* ── Grid ── */
  .grid-wrap { padding: 1.25rem; }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (max-width: 1100px) { .cards-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 760px)  { .cards-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px)  { .cards-grid { grid-template-columns: 1fr; } }

  .data-card {
    background: var(--color-bg, #f9fafb);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
    padding: 1rem;
    transition: all 0.2s;
  }

  .data-card:hover {
    border-color: var(--g400, #4ade80);
    box-shadow: 0 4px 16px var(--g-soft, rgba(22,163,74,0.08));
    transform: translateY(-1px);
  }

  .card-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text, #111827);
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-fields { display: flex; flex-direction: column; gap: 0.4rem; }

  .card-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
  }

  .field-label {
    color: var(--color-muted, #6b7280);
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .field-value {
    font-weight: 600;
    color: var(--color-text, #111827);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .id-val {
    font-family: ui-monospace, monospace;
    font-size: 0.7rem;
    color: var(--color-muted, #6b7280);
  }

  .empty-grid {
    padding: 3rem;
    text-align: center;
    color: var(--color-muted, #9ca3af);
  }
</style>