<!-- src/lib/components/ui/ThemeToggle.svelte -->
<script lang="ts">
  import { Sun, Moon } from '@lucide/svelte';
  import { toggleTheme, getTheme } from '$lib/index.js';

  let theme = $derived(getTheme());
</script>

<button
  class="theme-toggle"
  onclick={toggleTheme}
  type="button"
  aria-label="Toggle {theme === 'dark' ? 'light' : 'dark'} mode"
  title="Switch to {theme === 'dark' ? 'light' : 'dark'} mode"
>
  {#if theme === 'dark'}
    <Sun size={16} />
  {:else}
    <Moon size={16} />
  {/if}
</button>

<style>
  .theme-toggle {
    width: 2.25rem; height: 2.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .theme-toggle:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-primary);
    color: var(--color-text);
  }
</style>