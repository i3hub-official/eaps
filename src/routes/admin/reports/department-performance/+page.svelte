<script lang="ts">
  import type { PageData } from './$types';
  import { Layers, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let currentPage = $state(1);
  let itemsPerPage = $state(10);

  const filtered = $derived(
    data.departments.filter((d: any) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.college.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const totalPages = $derived(Math.ceil(filtered.length / itemsPerPage));
  const paginatedData = $derived(
    filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  );

  // Helper to get visible page numbers
  const visiblePages = $derived(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  });

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
  }

  function handleItemsPerPageChange(e: Event) {
    itemsPerPage = parseInt((e.target as HTMLSelectElement).value);
    currentPage = 1;
  }

  // Reset to first page when search changes
  $effect(() => {
    currentPage = 1;
  });
</script>

<svelte:head><title>Department Performance — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Department Performance</h1>
    <p class="subtitle">Department-level analytics: scores, pass rates, and student outcomes</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Layers size={16} />
      <input type="text" placeholder="Search departments or colleges..." bind:value={searchQuery} />
    </div>
    <div class="items-per-page">
      <label>Show</label>
      <select bind:value={itemsPerPage} onchange={handleItemsPerPageChange}>
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <span>entries</span>
    </div>
  </section>

  <section class="table-section">
    {#if filtered.length === 0}
      <div class="empty">
        <Layers size={28} />
        <p>{data.departments.length === 0 ? 'No department data available.' : 'No results found.'}</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>College</th>
              <th>Students</th>
              <th>Exams</th>
              <th>Avg Score</th>
              <th>Pass Rate</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedData as dept}
              <tr>
                <td>
                  <div class="dept-cell">
                    <div class="dept-icon"><Layers size={15} /></div>
                    <span class="dept-name">{dept.name}</span>
                  </div>
                </td>
                <td><span class="college-badge">{dept.college}</span></td>
                <td>{dept.students.toLocaleString()}</td>
                <td>{dept.exams}</td>
                <td>
                  <span
                    class="score-badge"
                    class:high={dept.avgScore >= 70}
                    class:medium={dept.avgScore >= 50 && dept.avgScore < 70}
                    class:low={dept.avgScore < 50}
                  >
                    {dept.avgScore}%
                  </span>
                </td>
                <td>
                  <div class="pass-bar">
                    <div class="pass-track">
                      <div class="pass-fill" style="width: {dept.passRate}%"></div>
                    </div>
                    <span>{dept.passRate}%</span>
                  </div>
                </td>
                <td>
                  {#if dept.trend === 'up'}
                    <span class="trend up"><TrendingUp size={15} /></span>
                  {:else if dept.trend === 'down'}
                    <span class="trend down"><TrendingDown size={15} /></span>
                  {:else}
                    <span class="trend stable"><Minus size={15} /></span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if totalPages > 1}
        <div class="pagination">
          <div class="pagination-info">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} departments
          </div>
          <div class="pagination-controls">
            <button
              class="page-btn"
              onclick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {#each visiblePages() as pageNum}
              <button
                class="page-btn num"
                class:active={currentPage === pageNum}
                onclick={() => goToPage(pageNum)}
              >
                {pageNum}
              </button>
            {/each}
            <button
              class="page-btn"
              onclick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .filters-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    flex: 1;
    min-width: 200px;
  }
  .search-box input {
    border: none;
    background: none;
    outline: none;
    color: var(--color-text);
    font-size: 0.875rem;
    width: 100%;
  }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .items-per-page {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .items-per-page select {
    padding: 0.35rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.8rem;
    cursor: pointer;
    font-family: inherit;
  }

  .table-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th {
    text-align: left;
    padding: 0.875rem 1rem;
    color: var(--color-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    white-space: nowrap;
  }
  .data-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-bg); }

  .dept-cell { display: flex; align-items: center; gap: 0.65rem; }
  .dept-icon {
    width: 30px;
    height: 30px;
    border-radius: 0.45rem;
    flex-shrink: 0;
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dept-name { font-weight: 600; color: var(--color-text); }

  .college-badge {
    padding: 0.2rem 0.55rem;
    border-radius: 0.375rem;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(59,130,246,0.1);
    color: #3b82f6;
  }

  .score-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .score-badge.high   { background: rgba(22,163,74,0.1);  color: #16a34a; }
  .score-badge.medium { background: rgba(245,158,11,0.1); color: #f59e0b; }
  .score-badge.low    { background: rgba(239,68,68,0.1);  color: #ef4444; }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-track {
    width: 60px;
    height: 6px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .pass-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .pass-bar span { font-size: 0.78rem; font-weight: 600; min-width: 36px; }

  .trend { display: inline-flex; align-items: center; }
  .trend.up     { color: #16a34a; }
  .trend.down   { color: #ef4444; }
  .trend.stable { color: var(--color-muted); }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 2rem;
    color: var(--color-muted);
    text-align: center;
  }
  .empty p { margin: 0; font-size: 0.875rem; }

  /* Pagination styles */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .pagination-info {
    font-size: 0.78rem;
    color: var(--color-muted);
  }
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    padding: 0 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.45rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .page-btn:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
  }
  .page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .page-btn.num.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  @media (max-width: 640px) {
    .pagination {
      flex-direction: column;
      align-items: center;
    }
    .items-per-page {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>