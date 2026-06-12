<!-- src/routes/student/exam/[examId]/session/+layout@.svelte -->
<!-- The @.svelte suffix resets the layout chain — no navbar, no sidebar, nothing -->
<!-- Green-tinted background for the kiosk to match brand -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

 let { children } = $props();
 
  onMount(() => {
    if (!browser) return;
    // Ensure dark background for kiosk to reduce eye strain
    document.documentElement.style.background = '#0a0f0d';
  });


</script>

{@render children()}

<style>
  :global(html) {
    background: #0a0f0d;
  }
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>