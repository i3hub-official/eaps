<!-- src/routes/vc-dvc/profile/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';
  let { data }: { data: PageData } = $props();
</script>
<ProfilePage profile={data.profile} accentColor="#8b5cf6" portalBase="/vc-dvc" />