<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import Navbar from '$lib/components/ui/Navbar.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/enroll',    label: 'Face Enrollment' },
  ];
</script>

<Navbar user={data.user} {links} />
<main>
  {@render children()}
</main>

<style>
  main { min-height: calc(100vh - 56px); }
</style>