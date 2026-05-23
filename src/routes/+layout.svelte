<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { initTheme } from '$lib/index.js';

  let { children } = $props();

  onMount(() => {
    initTheme();
  });
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="MOUAU eTest — Michael Okpara University Computer-Based Testing Platform" />
</svelte:head>

{@render children()}