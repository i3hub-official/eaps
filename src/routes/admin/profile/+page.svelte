<!-- src/routes/admin/profile/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';

  let { data }: { data: PageData } = $props();
</script>

<ProfilePage profile={data.profile} />