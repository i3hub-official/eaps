<!-- src/routes/invigilator/notifications/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import NotificationsPage from '$lib/components/ui/NotificationsPage.svelte';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<NotificationsPage
  notifications={data.notifications}
  unreadCount={data.unreadCount}
  {form}
  accentColor="#14b8a6"
  accentBg="rgba(20,184,166,.12)"
/>