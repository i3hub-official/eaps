<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import './app.css';
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
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/mouau_logo.png" />
  <link rel="apple-touch-icon" href="/mouau_logo.png" />
  
  <!-- Alternative sizes for better compatibility -->
  <link rel="icon" type="image/png" sizes="16x16" href="/mouau_logo.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/mouau_logo.png" />
  <link rel="icon" type="image/png" sizes="48x48" href="/mouau_logo.png" />
  <link rel="icon" type="image/png" sizes="64x64" href="/mouau_logo.png" />
  
  <!-- For modern browsers -->
  <link rel="shortcut icon" href="/mouau_logo.png" />
</svelte:head>

{@render children()}