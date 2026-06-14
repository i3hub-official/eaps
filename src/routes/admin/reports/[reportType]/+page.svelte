<!-- src/routes/admin/reports/[reportType]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    FileText, Download, Calendar, Search, ArrowLeft,
    RefreshCw, Printer, ChevronDown, CheckCircle,
    AlertTriangle, Info, X
  } from '@lucide/svelte';
  import { tick } from 'svelte';
  import ReportRenderer from '$lib/components/reports/ReportRenderer.svelte';

  let { data }: { data: PageData } = $props();

  // ── Derived state ───────────────────────────────────────────────────────
  const { meta, params, data: reportData, summary } = $derived(data);

  // ── Local UI state ────────────────────────────────────────────────────
  let isExporting = $state(false);
  let isRefreshing = $state(false);
  let showDatePicker = $state(false);
  let searchInput = $state(params.q ?? '');
  let showToast = $state(false);
  let toastMessage = $state('');

  const dateRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '14d', label: 'Last 14 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  const currentRangeLabel = $derived(
    dateRanges.find(r => r.value === params.range)?.label ?? 'Custom Range'
  );

  // ── Actions ───────────────────────────────────────────────────────────

  function applySearch() {
    const url = new URL(window.location.href);
    if (searchInput.trim()) {
      url.searchParams.set('q', searchInput.trim());
    } else {
      url.searchParams.delete('q');
    }
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }

  function applyDateRange(range: string) {
    showDatePicker = false;
    const url = new URL(window.location.href);
    url.searchParams.set('range', range);
    url.searchParams.delete('from');
    url.searchParams.delete('to');
    window.location.href = url.toString();
  }

  function refreshData() {
    isRefreshing = true;
    window.location.reload();
  }

  async function exportToCSV() {
    isExporting = true;
    await tick();
    try {
      // Find the first array in the data to export
      const arrayKey = Object.keys(reportData).find(k => Array.isArray(reportData[k]));
      const rows = arrayKey ? (reportData[arrayKey] as unknown[]) : [];

      if (rows.length === 0) {
        showToastMessage('No data to export');
        return;
      }

      const headers = Object.keys(rows[0] as object);
      const csv = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => {
            const val = (row as Record<string, unknown>)[h];
            const str = val === null || val === undefined ? '' : String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${meta.id}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToastMessage('CSV exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      showToastMessage('Export failed');
    } finally {
      isExporting = false;
    }
  }

  function printReport() {
    window.print();
  }

  function showToastMessage(msg: string) {
    toastMessage = msg;
    showToast = true;
    setTimeout(() => showToast = false, 3000);
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') applySearch();
  }

  function goBack() {
    window.history.back();
  }
</script>

<svelte:head>
  <title>{meta.label} — Reports | MOUAU eTest</title>
</svelte:head>

<!-- Toast Notification -->
{#if showToast}
  <div class="toast" class:exit={!showToast}>
    <CheckCircle size={16} />
    <span>{toastMessage}</span>
  </div>
{/if}

<div class="report-page">
  <!-- ══ HEADER ═══════════════════════════════════════════════════════ -->
  <header class="page-header">
    <div class="header-main">
      <button class="back-btn" onclick={goBack} aria-label="Go back">
        <ArrowLeft size={18} />
      </button>
      <div class="header-icon">
        <FileText size={22} />
      </div>
      <div class="header-text">
        <h1>{meta.label}</h1>
        <p class="description">{meta.description}</p>
      </div>
    </div>

    <div class="header-actions">
      <!-- Date Range Picker -->
      {#if meta.supportsDateRange}
        <div class="dropdown">
          <button
            class="action-btn"
            onclick={() => showDatePicker = !showDatePicker}
            aria-expanded={showDatePicker}
          >
            <Calendar size={14} />
            <span>{currentRangeLabel}</span>
                           <ChevronRight size={14} class={"chevron " + (showDatePicker ? 'rotated' : '')}/>

          </button>
          {#if showDatePicker}
            <div class="dropdown-menu">
              {#each dateRanges as r}
                <button
                  class="dropdown-item"
                  class:active={params.range === r.value}
                  onclick={() => applyDateRange(r.value)}
                >
                  <span>{r.label}</span>
                  {#if params.range === r.value}
                    <CheckCircle size={14} class="check" />
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Refresh -->
      <button class="action-btn" onclick={refreshData} disabled={isRefreshing} title="Refresh data">
        <RefreshCw size={14} class={"spin " + (isRefreshing ? "spinning" : '')} />
      </button>

      <!-- Print -->
      <button class="action-btn" onclick={printReport} title="Print report">
        <Printer size={14} />
      </button>

      <!-- Export -->
      {#if meta.exportable !== false}
        <button
          class="action-btn primary"
          onclick={exportToCSV}
          disabled={isExporting}
          title="Export to CSV"
        >
          {#if isExporting}
            <RefreshCw size={14} class="spin" />
            <span>Exporting...</span>
          {:else}
            <Download size={14} />
            <span>Export CSV</span>
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <!-- ══ SEARCH BAR ═════════════════════════════════════════════════ -->
  {#if meta.supportsSearch}
    <div class="search-bar">
      <div class="search-input-wrap">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search {meta.label.toLowerCase()}..."
          bind:value={searchInput}
          onkeydown={handleSearchKeydown}
        />
      </div>
      <button class="search-btn" onclick={applySearch}>
        Search
      </button>
      {#if params.q}
        <a href="?" class="clear-search">Clear</a>
      {/if}
    </div>
  {/if}

  <!-- ══ META INFO ══════════════════════════════════════════════════ -->
  {#if summary}
    <div class="meta-bar">
      <div class="meta-left">
        {#if summary.loadTimeMs}
          <span class="meta-pill">
            <Info size={12} />
            Generated in {summary.loadTimeMs}ms
          </span>
        {/if}
        {#if summary.generatedAt}
          <span class="meta-pill">
            {new Date(summary.generatedAt).toLocaleString()}
          </span>
        {/if}
      </div>
      <div class="meta-right">
        {#if params.q}
          <span class="meta-pill active">
            Search: "{params.q}"
          </span>
        {/if}
        {#if params.range && params.range !== 'all'}
          <span class="meta-pill active">
            Range: {currentRangeLabel}
          </span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ══ REPORT CONTENT ═════════════════════════════════════════════ -->
  <main class="report-content">
    {#if reportData && Object.keys(reportData).length > 0}
      <ReportRenderer {meta} {params} data={reportData} />
    {:else}
      <div class="empty-state">
        <AlertTriangle size={40} />
        <h3>No Data Available</h3>
        <p>This report returned no data. Try adjusting your filters or check back later.</p>
      </div>
    {/if}
  </main>

  <!-- ══ FOOTER ═════════════════════════════════════════════════════ -->
  <footer class="page-footer">
    <span>MOUAU eTest Reporting System</span>
    {#if summary?.generatedAt}
      <span>Last updated: {new Date(summary.generatedAt).toLocaleString()}</span>
    {/if}
  </footer>
</div>

<style>
  /* ── Toast ───────────────────────────────────────────── */
  .toast {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #16a34a;
    color: white;
    border-radius: 0.625rem;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(22, 163, 74, 0.25);
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* ── Page Layout ─────────────────────────────────────── */
  .report-page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
  }

  /* ── Header ────────────────────────────────────────────── */
  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1.5px solid var(--color-border, #e5e7eb);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--color-surface, white);
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .back-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: 0.875rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .header-text { display: flex; flex-direction: column; gap: 0.15rem; }
  .header-text h1 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; color: var(--color-text, #111827); margin: 0; }
  .description { font-size: 0.85rem; color: var(--color-muted, #6b7280); margin: 0; }

  .header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  /* ── Buttons ─────────────────────────────────────────── */
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.875rem;
    border-radius: 0.625rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
    color: var(--color-text, #374151);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .action-btn.primary {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .action-btn.primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .chevron { transition: transform 0.2s; }
  .chevron.rotated { transform: rotate(180deg); }

  /* ── Dropdown ────────────────────────────────────────── */
  .dropdown { position: relative; }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 200px;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 50;
    overflow: hidden;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 1rem;
    width: 100%;
    background: none;
    border: none;
    font-size: 0.85rem;
    color: var(--color-text, #374151);
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
  }

  .dropdown-item:hover { background: var(--color-bg, #f9fafb); }
  .dropdown-item.active { background: rgba(59, 130, 246, 0.08); color: #3b82f6; }

  .check { color: #3b82f6; }

  /* ── Search Bar ──────────────────────────────────────── */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 260px;
    padding: 0.55rem 0.875rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.625rem;
    transition: border-color 0.15s;
  }

  .search-input-wrap:focus-within {
    border-color: #3b82f6;
  }

  .search-input-wrap input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.85rem;
    color: var(--color-text, #111827);
  }

  .search-btn {
    padding: 0.55rem 1.25rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.625rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .search-btn:hover { background: #1d4ed8; }

  .clear-search {
    font-size: 0.8rem;
    color: #ef4444;
    text-decoration: none;
    font-weight: 600;
    padding: 0.4rem 0.75rem;
  }

  .clear-search:hover { text-decoration: underline; }

  /* ── Meta Bar ────────────────────────────────────────── */
  .meta-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    align-items: center;
  }

  .meta-left, .meta-right {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.6rem;
    background: var(--color-bg, #f3f4f6);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
  }

  .meta-pill.active {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  /* ── Report Content ──────────────────────────────────── */
  .report-content {
    flex: 1;
    min-height: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 4rem 2rem;
    text-align: center;
    color: var(--color-muted, #9ca3af);
  }

  .empty-state h3 { font-size: 1.125rem; font-weight: 700; color: var(--color-text, #374151); margin: 0; }
  .empty-state p { font-size: 0.875rem; max-width: 400px; margin: 0; }

  /* ── Footer ───────────────────────────────────────────── */
  .page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
    font-size: 0.7rem;
    color: var(--color-muted, #9ca3af);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* ── Spin Animation ───────────────────────────────────── */
  .spin { animation: spin 1s linear infinite; }
  .spinning { animation: spin 1s linear infinite; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Print Styles ───────────────────────────────────── */
  @media print {
    .page-header .header-actions,
    .search-bar,
    .meta-bar,
    .page-footer,
    .back-btn {
      display: none !important;
    }
    .report-page {
      padding: 0;
      max-width: none;
    }
    .page-header {
      border-bottom: 2px solid #000;
      padding-bottom: 0.5rem;
    }
  }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 640px) {
    .report-page { padding: 1rem; }
    .header-text h1 { font-size: 1.25rem; }
    .header-actions { width: 100%; }
    .search-input-wrap { min-width: auto; width: 100%; }
  }
</style>
