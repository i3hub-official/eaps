<!-- src/lib/components/reports/ui/Pagination.svelte -->


<script lang="ts">
  interface Props {
    page:      number;
    pageSize:  number;
    total:     number;
    onchange:  (page: number, pageSize: number) => void;
  }

  let { page, pageSize, total, onchange }: Props = $props();

  const PAGE_SIZES = [10, 20, 30, 50, 100];

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const from       = $derived((page - 1) * pageSize + 1);
  const to         = $derived(Math.min(page * pageSize, total));

  // Window of page numbers to show (max 7)
  const pageNumbers = $derived(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  });

  function go(p: number) {
    if (p < 1 || p > totalPages) return;
    onchange(p, pageSize);
  }

  function changeSize(e: Event) {
    const size = parseInt((e.target as HTMLSelectElement).value);
    onchange(1, size);
  }
</script>

<div class="pagination">
  <div class="pagination-left">
    <span class="count-label">
      {#if total === 0}
        No results
      {:else}
        {from}–{to} of {total.toLocaleString()}
      {/if}
    </span>

    <label class="page-size-label">
      Show
      <select value={pageSize} onchange={changeSize} class="page-size-select">
        {#each PAGE_SIZES as size}
          <option value={size}>{size}</option>
        {/each}
      </select>
      per page
    </label>
  </div>

  <div class="pagination-right">
    <button class="pg-btn" onclick={() => go(1)}       disabled={page === 1}          aria-label="First page">«</button>
    <button class="pg-btn" onclick={() => go(page - 1)} disabled={page === 1}          aria-label="Previous page">‹</button>

    {#each pageNumbers() as p}
      {#if p === '...'}
        <span class="pg-ellipsis">…</span>
      {:else}
        <button
          class="pg-btn"
          class:active={p === page}
          onclick={() => go(p as number)}
          aria-current={p === page ? 'page' : undefined}
        >{p}</button>
      {/if}
    {/each}

    <button class="pg-btn" onclick={() => go(page + 1)} disabled={page === totalPages}  aria-label="Next page">›</button>
    <button class="pg-btn" onclick={() => go(totalPages)} disabled={page === totalPages} aria-label="Last page">»</button>
  </div>
</div>

<style>
  .pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
  }

  .pagination-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .count-label {
    font-size: 0.8rem;
    color: var(--color-muted, #6b7280);
    font-weight: 500;
  }

  .page-size-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--color-muted, #6b7280);
  }

  .page-size-select {
    padding: 0.25rem 0.5rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.8rem;
    background: var(--color-surface, white);
    color: var(--color-text, #111827);
    cursor: pointer;
  }

  .pagination-right {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .pg-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 0.5rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--color-surface, white);
    color: var(--color-text, #374151);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pg-btn:hover:not(:disabled):not(.active) {
    border-color: var(--g600, #16a34a);
    color: var(--g600, #16a34a);
  }

  .pg-btn.active {
    background: var(--g600, #16a34a);
    border-color: var(--g600, #16a34a);
    color: white;
  }

  .pg-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .pg-ellipsis {
    padding: 0 0.25rem;
    color: var(--color-muted, #9ca3af);
    font-size: 0.875rem;
    user-select: none;
  }
</style>