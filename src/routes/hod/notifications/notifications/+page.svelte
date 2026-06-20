<!-- src/routes/hod/notifications/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import NotificationsPage from '$lib/components/ui/NotificationsPage.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<NotificationsPage {data} {form} accentColor="#f59e0b" />