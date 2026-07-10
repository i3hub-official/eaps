<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { AppSidebar } from '$lib/components/dashboard';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar role="exam-officer" />
	<Sidebar.Inset>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
