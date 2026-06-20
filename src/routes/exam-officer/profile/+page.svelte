<!-- src/routes/exam-officer/profile/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import ProfilePage from '$lib/components/ui/ProfilePage.svelte';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>
<ProfilePage {data} {form} accentColor="#0ea5e9" portalBase="/exam-officer" />
