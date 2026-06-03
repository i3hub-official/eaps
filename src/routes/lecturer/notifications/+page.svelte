<!-- src/routes/lecturer/notifications/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import NotificationsPage from '$lib/components/ui/NotificationsPage.svelte';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<NotificationsPage
  notifications={data.notifications}
  unreadCount={data.unreadCount}
  {form}
  accentColor="#a855f7"
  accentBg="rgba(168,85,247,.12)"
/>