<!-- src/routes/student/exams/kiosk/+layout@.svelte -->
<!--
  Resets to the root layout, escaping the student dashboard shell entirely.
  The kiosk page owns the full viewport with no navbar, sidebar, or breadcrumb.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <!-- Prevent the kiosk from being indexed or framed -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>
 
{@render children()}
 
<style>
  /* Ensure the kiosk page fills the viewport with no inherited shell spacing */
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  :global(html) {
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  /* Reset any potential inherited styles */
  :global(*) {
    box-sizing: border-box;
  }
</style>