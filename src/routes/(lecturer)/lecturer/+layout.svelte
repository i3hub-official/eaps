<!-- src/routes/(lecturer)/lecturer/+layout.svelte -->
<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { AppSidebar } from '$lib/components/dashboard';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar role="lecturer" />
	<Sidebar.Inset class="min-w-0 overflow-x-hidden">
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>