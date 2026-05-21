<!-- src/lib/components/ui/ThemeToggle.svelte -->
<script lang="ts">
  import { theme } from '$lib/theme.svelte';
  import { Sun, Moon } from 'lucide-svelte';
</script>

<button
  onclick={() => theme.toggle()}
  title="Toggle theme"
  aria-label="Toggle dark/light mode"
  style="
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.4rem;
    cursor: pointer;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  "
  onmouseenter={(e) => (e.currentTarget.style.background = 'var(--border)')}
  onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
>
  {#if theme.dark}
    <Sun size={16} />
  {:else}
    <Moon size={16} />
  {/if}
</button>
