<!-- src/lib/components/ui/Spinner.svelte -->
<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg';
    label?: string;
  }
  let { size = 'md', label = 'Loading…' }: Props = $props();
</script>

<div class="spinner size-{size}" role="status" aria-label={label}>
  <span class="sr-only">{label}</span>
</div>

<style>
  .spinner {
    border-radius: 50%;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    animation: spin 0.7s linear infinite;
  }
  .size-sm { width: 1rem;   height: 1rem;   border-width: 2px; }
  .size-md { width: 1.5rem; height: 1.5rem; border-width: 2px; }
  .size-lg { width: 2.5rem; height: 2.5rem; border-width: 3px; }

  @keyframes spin { to { transform: rotate(360deg); } }

  .sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); border: 0;
  }
</style>