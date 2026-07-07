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
  <span class="icon-track" class:is-dark={theme === 'dark'}>
    <span class="icon sun"><Sun size={16} strokeWidth={2} color="var(--color-text)" /></span>
    <span class="icon moon"><Moon size={16} strokeWidth={2} color="var(--color-text)" /></span>
  </span>
</button>

<style>
  .theme-toggle {
    position: relative;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.625rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text);
    overflow: hidden;
    transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Force the icon color from here regardless of what an ancestor (e.g. a
     dark nav bar) sets on its own children — currentColor was silently
     inheriting white from a surrounding dark context instead of picking
     up this component's own --color-text. */
  .theme-toggle :global(svg) {
    color: var(--color-text) !important;
    stroke: var(--color-text) !important;
  }

  .theme-toggle:hover {
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
    color: var(--color-primary);
    box-shadow: 0 2px 4px 0 rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08);
    transform: translateY(-1px);
  }

  .theme-toggle:hover :global(svg) {
    color: var(--color-primary) !important;
    stroke: var(--color-primary) !important;
  }

  .theme-toggle:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .icon-track {
    position: relative;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.25s ease;
  }

  .moon {
    opacity: 0;
    transform: rotate(-60deg) scale(0.5);
  }

  .sun {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  .icon-track.is-dark .sun {
    opacity: 0;
    transform: rotate(60deg) scale(0.5);
  }

  .icon-track.is-dark .moon {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    .theme-toggle,
    .icon {
      transition: none;
    }
  }
</style>