<!-- src/routes/hod/profile/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';
  let { data }: { data: PageData } = $props();
</script>
<ProfilePage profile={data.profile} accentColor="#f59e0b" portalBase="/hod" />