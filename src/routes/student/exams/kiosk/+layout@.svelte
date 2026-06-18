<!-- src/routes/student/exams/kiosk/+layout@.svelte -->
<!--
  Resets to the root layout, escaping the student dashboard shell entirely.
  The kiosk page owns the full viewport with no navbar, sidebar, or breadcrumb.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

{@render children()}