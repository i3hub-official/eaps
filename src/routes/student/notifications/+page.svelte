<!-- src/routes/student/notifications/+page.svelte -->

<script lang="ts">
  import type { PageData } from './$types';
  import NotificationsPage from '$lib/components/ui/NotificationsPage.svelte';

  let { data }: { data: PageData } = $props();
</script>

<NotificationsPage notifications={data.notifications} unreadCount={data.unreadCount} />