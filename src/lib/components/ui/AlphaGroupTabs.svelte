<!-- src/lib/components/reports/ui/AlphaGroupTabs.svelte
 -->

 <script lang="ts">
  interface Props {
    letters:       string[];   // which letters have data
    activeLetter:  string;     // '' = all
    onselect:      (letter: string) => void;
  }

  let { letters, activeLetter, onselect }: Props = $props();

  const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
</script>

<div class="alpha-tabs" role="tablist" aria-label="Filter by letter">
  <button
    class="alpha-btn all"
    class:active={activeLetter === ''}
    onclick={() => onselect('')}
    role="tab"
    aria-selected={activeLetter === ''}
  >All</button>

  {#each ALL_LETTERS as letter}
    <button
      class="alpha-btn"
      class:active={activeLetter === letter}
      class:has-data={letters.includes(letter)}
      disabled={!letters.includes(letter)}
      onclick={() => onselect(letter)}
      role="tab"
      aria-selected={activeLetter === letter}
    >{letter}</button>
  {/each}
</div>

<style>
  .alpha-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    background: var(--color-bg, #f9fafb);
  }

  .alpha-btn {
    min-width: 28px;
    height: 28px;
    padding: 0 0.35rem;
    border: 1.5px solid transparent;
    border-radius: 0.375rem;
    background: none;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted, #9ca3af);
    cursor: not-allowed;
    transition: all 0.12s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .alpha-btn.all {
    min-width: 36px;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    border-color: var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
  }

  .alpha-btn.has-data {
    color: var(--color-text, #374151);
    cursor: pointer;
    border-color: var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
  }

  .alpha-btn.has-data:hover {
    border-color: var(--g500, #22c55e);
    color: var(--g600, #16a34a);
  }

  .alpha-btn.active {
    background: var(--g600, #16a34a);
    border-color: var(--g600, #16a34a);
    color: white;
  }

  .alpha-btn.all.active {
    background: var(--g600, #16a34a);
    border-color: var(--g600, #16a34a);
    color: white;
  }
</style>