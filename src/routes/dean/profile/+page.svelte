<!-- src/routes/dean/profile/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';
  let { data }: { data: PageData } = $props();
</script>
<ProfilePage profile={data.profile} /><!-- src/routes/dean/profile/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';
  let { data }: { data: PageData } = $props();
</script>
<ProfilePage profile={data.profile} accentColor="#10b981" portalBase="/dean" />