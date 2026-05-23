<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import './layout.css';
  import { page } from '$app/stores';

  let { children } = $props();

  // Read theme from localStorage on mount, default to light
  let theme = $state('light');

  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<svelte:window onload={initTheme} />

<div data-theme={theme}>
  {@render children()}
</div>