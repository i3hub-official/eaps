<script lang="ts">
  import type { PageData } from './$types';
  import { Target, TrendingUp, TrendingDown, Award, AlertTriangle, Building2, ChevronLeft, ChevronRight } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const overall       = $derived(data.analysisData.find(r => r.category === 'Overall'));
  const totalPassed   = $derived(overall?.passed ?? 0);
  const totalFailed   = $derived(overall?.failed ?? 0);
  const totalStudents = $derived(totalPassed + totalFailed);
  const overallRate   = $derived(
    totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : '0.0'
  );

  // ── Pagination ───────────────────────────────────────────────────────────────
  const PAGE_SIZE = 10;
  let page = $state(1);

  const rows        = $derived(data.analysisData);
  const totalPages  = $derived(Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const paged       = $derived(rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

  function prev() { if (page > 1) page--; }
  function next() { if (page < totalPages) page++; }
</script>

<svelte:head><title>Pass / Fail Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Pass / Fail Analysis</h1>
    <p class="subtitle">Pass rates by department, course, and demographic breakdown</p>
  </header>

  <div class="summary-row">
    <div class="summary-card">
      <span class="sum-icon green"><Award size={18} /></span>
      <div>
        <span class="summary-value">{totalPassed.toLocaleString()}</span>
        <span class="summary-label">Passed</span>
      </div>
    </div>
    <div class="summary-card">
      <span class="sum-icon red"><AlertTriangle size={18} /></span>
      <div>
        <span class="summary-value">{totalFailed.toLocaleString()}</span>
        <span class="summary-label">Failed</span>
      </div>
    </div>
    <div class="summary-card">
      <span class="sum-icon green"><Target size={18} /></span>
      <div>
        <span class="summary-value">{overallRate}%</span>
        <span class="summary-label">Overall Pass Rate</span>
      </div>
    </div>
  </div>

  <div class="table-card">
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-dept">Department / Category</th>
            <th class="col-num">Passed</th>
            <th class="col-num">Failed</th>
            <th class="col-num">Total</th>
            <th class="col-rate">Pass Rate</th>
            <th class="col-trend">Trend</th>
          </tr>
        </thead>
        <tbody>
          {#if paged.length === 0}
            <tr><td colspan="6" class="empty">No data available.</td></tr>
          {:else}
            {#each paged as row}
              <tr class:highlight={row.category === 'Overall'}>
                <td class="col-dept">
                  <div class="dept-cell">
                    {#if row.category === 'Overall'}
                      <span class="row-icon overall"><Target size={14} /></span>
                    {:else}
                      <span class="row-icon"><Building2 size={14} /></span>
                    {/if}
                    <span class="dept-name">{row.category}</span>
                  </div>
                </td>
                <td class="col-num"><span class="count passed">{row.passed}</span></td>
                <td class="col-num"><span class="count failed">{row.failed}</span></td>
                <td class="col-num muted">{row.passed + row.failed}</td>
                <td class="col-rate">
                  <div class="bar-row">
                    <div class="bar-track">
                      <div class="bar-fill" style="width:{row.passRate}%"></div>
                    </div>
                    <span class="bar-label">{row.passRate}%</span>
                  </div>
                </td>
                <td class="col-trend">
                  <span class="trend {row.trend}">
                    {#if row.trend === 'up'}
                      <TrendingUp size={15} /> <span>Up</span>
                    {:else if row.trend === 'down'}
                      <TrendingDown size={15} /> <span>Down</span>
                    {:else}
                      <Target size={15} /> <span>Stable</span>
                    {/if}
                  </span>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <span class="page-info">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, rows.length)}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
      </span>
      <div class="page-controls">
        <button class="page-btn" onclick={prev} disabled={page === 1}>
          <ChevronLeft size={15} />
        </button>
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
          <button
            class="page-btn num"
            class:active={p === page}
            onclick={() => page = p}
          >{p}</button>
        {/each}
        <button class="page-btn" onclick={next} disabled={page === totalPages}>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  </div>
</div>
<style>
  .page { max-width: 1200px; padding: 1.75rem 2rem 4rem; margin: 0 auto; }

  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 {
    font-size: 1.65rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.25rem;
  }
  .subtitle { color: var(--color-muted); font-size: 0.82rem; margin: 0; }

  /* ── Summary cards ── */
  .summary-row {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1rem; margin-bottom: 1.5rem;
  }
  @media (max-width: 640px) { .summary-row { grid-template-columns: 1fr; } }

  .summary-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1rem 1.25rem;
    display: flex; align-items: center; gap: 0.875rem;
  }
  .sum-icon {
    width: 36px; height: 36px; border-radius: 0.6rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .sum-icon.green { background: rgba(22,163,74,0.1);  color: #16a34a; }
  .sum-icon.blue  { background: rgba(59,130,246,0.1); color: #3b82f6; }
  .sum-icon.red   { background: rgba(239,68,68,0.1);  color: #ef4444; }
  .summary-card div { display: flex; flex-direction: column; gap: 0.15rem; }
  .summary-value { font-size: 1.3rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .summary-label { font-size: 0.73rem; color: var(--color-muted); }

  /* ── Table card ── */
  .table-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
  }

  /* Scrollable wrapper — key for horizontal scroll */
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .table-scroll::-webkit-scrollbar { height: 4px; }
  .table-scroll::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .table-scroll::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

  .data-table {
    width: 100%; border-collapse: collapse; font-size: 0.855rem;
    min-width: 680px; /* forces scroll on narrow screens */
  }
  .data-table th {
    text-align: left; padding: 0.8rem 1rem;
    color: var(--color-muted); font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); white-space: nowrap;
  }
  .data-table td {
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    color: var(--color-text); vertical-align: middle; white-space: nowrap;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tbody tr:hover td { background: rgba(59,130,246,0.03); }
  .data-table tr.highlight td { background: rgba(59,130,246,0.05); }

  /* Column widths */
  .col-dept  { min-width: 220px; white-space: normal !important; }
  .col-num   { width: 90px; text-align: right; }
  .col-rate  { min-width: 180px; }
  .col-trend { width: 100px; }

  .dept-cell { display: flex; align-items: center; gap: 0.6rem; }
  .row-icon {
    width: 26px; height: 26px; border-radius: 0.4rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .row-icon.overall { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); color: #3b82f6; }
  .dept-name { font-weight: 600; color: var(--color-text); white-space: normal; }

  .count { font-weight: 700; font-size: 0.875rem; }
  .count.passed { color: #16a34a; }
  .count.failed { color: #ef4444; }
  .muted { color: var(--color-muted); }

  .bar-row { display: flex; align-items: center; gap: 0.625rem; }
  .bar-track {
    width: 90px; height: 6px; border-radius: 999px;
    background: var(--color-border); overflow: hidden; flex-shrink: 0;
  }
  .bar-fill {
    height: 100%; border-radius: 999px;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    min-width: 3px; transition: width 0.4s ease;
  }
  .bar-label { font-size: 0.78rem; font-weight: 700; min-width: 40px; }

  .trend {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.78rem; font-weight: 600;
  }
  .trend.up     { color: #16a34a; }
  .trend.down   { color: #ef4444; }
  .trend.stable { color: var(--color-muted); }

  .empty {
    text-align: center; padding: 3rem;
    color: var(--color-muted); font-size: 0.875rem;
  }

  /* ── Pagination ── */
  .pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1rem; border-top: 1px solid var(--color-border);
    flex-wrap: wrap; gap: 0.75rem;
  }
  .page-info { font-size: 0.78rem; color: var(--color-muted); }
  .page-controls { display: flex; align-items: center; gap: 0.3rem; }

  .page-btn {
    display: flex; align-items: center; justify-content: center;
    min-width: 32px; height: 32px; padding: 0 0.5rem;
    border: 1px solid var(--color-border); border-radius: 0.45rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.8rem; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all 0.15s;
  }
  .page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .page-btn.num.active {
    background: #3b82f6; border-color: #3b82f6; color: white;
  }
</style>