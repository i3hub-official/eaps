<!-- src/routes/hod/profile/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<ProfilePage {data} {form} accentColor="#f59e0b" portalBase="/hod" />
