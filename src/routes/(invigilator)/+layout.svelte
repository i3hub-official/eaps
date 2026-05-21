<script lang="ts">
  import Navbar from '$lib/components/ui/Navbar.svelte';
  import type { LayoutData } from './$types';
  let { data, children }: { data: LayoutData; children: any } = $props();
</script>
<Navbar user={data.user} />
<main style="max-width:1280px; margin:0 auto; padding:1.5rem 1rem;">
  {@render children()}
</main>
