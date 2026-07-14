<!-- src/routes/(admin)/admin/profile/+page.svelte -->
<!-- Identical for (deo)/deo/profile/+page.svelte, (lecturer)/lecturer/profile/+page.svelte,
     (invigilator)/invigilator/profile/+page.svelte -->
<script lang="ts">
	import Topbar from '$lib/components/dashboard/topbar.svelte';
	import ProfileView from '$lib/components/profile/profile-view.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Topbar title="Account settings" description="Manage your profile, security, and preferences" />
<main class="flex-1 overflow-y-auto">
	<ProfileView profile={data.profile} />
</main>