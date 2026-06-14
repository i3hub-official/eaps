<!-- src/lib/components/reports/ui/ReportToolbar.svelte
 -->
<script lang="ts">
  import type { ViewMode } from '$lib/types/reports.js';
  import { LayoutList, LayoutGrid, CreditCard, GalleryHorizontal, ArrowUpDown, GroupIcon } from '@lucide/svelte';

  interface Props {
    viewMode:        ViewMode;
    availableViews:  ViewMode[];
    sortKey:         string;
    sortDir:         'asc' | 'desc';
    groupByAlpha:    boolean;
    sortableColumns: { key: string; label: string }[];
    onViewChange:    (v: ViewMode) => void;
    onSortChange:    (key: string, dir: 'asc' | 'desc') => void;
    onGroupToggle:   () => void;
  }

  let {
    viewMode, availableViews, sortKey, sortDir,
    groupByAlpha, sortableColumns,
    onViewChange, onSortChange, onGroupToggle,
  }: Props = $props();

  const VIEW_ICONS: Record<ViewMode, typeof LayoutList> = {
    list:     LayoutList,
    grid:     LayoutGrid,
    card:     CreditCard,
    carousel: GalleryHorizontal,
  };

  const VIEW_LABELS: Record<ViewMode, string> = {
    list:     'List',
    grid:     'Grid',
    card:     'Cards',
    carousel: 'Carousel',
  };

  let showSortMenu = $state(false);

  function toggleSort(key: string) {
    if (sortKey === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
    showSortMenu = false;
  }
</script>

<div class="toolbar">
  <!-- View toggle -->
  <div class="view-toggle">
    {#each availableViews as view}
      {@const Icon = VIEW_ICONS[view]}
      <button
        class="toggle-btn"
        class:active={viewMode === view}
        onclick={() => onViewChange(view)}
        title={VIEW_LABELS[view]}
      >
        <Icon size={15} />
        <span>{VIEW_LABELS[view]}</span>
      </button>
    {/each}
  </div>

  <div class="toolbar-right">
    <!-- Group by alpha -->
    <button
      class="tool-btn"
      class:active={groupByAlpha}
      onclick={onGroupToggle}
      title="Group alphabetically"
    >
      <GroupIcon size={14} />
      <span>A–Z</span>
    </button>

    <!-- Sort -->
    {#if sortableColumns.length > 0}
      <div class="sort-wrap">
        <button
          class="tool-btn"
          class:active={showSortMenu}
          onclick={() => showSortMenu = !showSortMenu}
        >
          <ArrowUpDown size={14} />
          <span>Sort{sortKey ? `: ${sortableColumns.find(c => c.key === sortKey)?.label ?? sortKey}` : ''}</span>
        </button>

        {#if showSortMenu}
          <div class="sort-menu">
            {#each sortableColumns as col}
              <button
                class="sort-item"
                class:active={sortKey === col.key}
                onclick={() => toggleSort(col.key)}
              >
                <span>{col.label}</span>
                {#if sortKey === col.key}
                  <span class="sort-dir">{sortDir === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .view-toggle {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-bg, #f3f4f6);
    border-radius: 0.625rem;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
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
    color: var(--g600, #16a34a);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.75rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--color-surface, white);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tool-btn:hover, .tool-btn.active {
    border-color: var(--g600, #16a34a);
    color: var(--g600, #16a34a);
  }

  .sort-wrap { position: relative; }

  .sort-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 200px;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    z-index: 50;
    overflow: hidden;
  }

  .sort-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.6rem 1rem;
    border: none;
    background: none;
    font-size: 0.82rem;
    color: var(--color-text, #374151);
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
  }

  .sort-item:hover  { background: var(--color-bg, #f9fafb); }
  .sort-item.active { color: var(--g600, #16a34a); font-weight: 700; }

  .sort-dir {
    font-weight: 800;
    color: var(--g600, #16a34a);
  }
</style>