<!-- src/routes/(admin)/admin/system-flags/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { RefreshCw, LoaderCircle } from '@lucide/svelte/icons';
	import SystemFlagsManager from '$lib/components/admin/SystemFlagsManager.svelte';

	let refreshFn: (() => void) | undefined = $state();
	let loading = $state(false);
</script>

<svelte:head>
	<title>System Flags - Administration</title>
</svelte:head>

<Topbar
	title="System Flags Management"
	description="Control system-wide states like maintenance mode and shutdown. Changes take effect immediately."
>
	{#snippet actions()}
		<Button variant="outline" size="sm" onclick={() => refreshFn?.()} disabled={loading}>
			{#if loading}
				<LoaderCircle class="mr-2 size-4 animate-spin" />
			{:else}
				<RefreshCw class="mr-2 size-4" />
			{/if}
			Refresh
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<SystemFlagsManager bind:refresh={refreshFn} bind:loading />
</main>