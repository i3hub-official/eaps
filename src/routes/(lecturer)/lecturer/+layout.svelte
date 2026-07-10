<!-- src/routes/(lecturer)/lecturer/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import AppSidebar from '$lib/components/dashboard/app-sidebar.svelte';
	import Topbar from '$lib/components/dashboard/topbar.svelte';
	import { SidebarProvider } from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();
</script>

<SidebarProvider>
	<div class="flex min-h-screen">
		<AppSidebar role="lecturer" />
		<div class="flex flex-1 flex-col">
			<Topbar />
			<main class="flex-1 p-6">
				{@render children()}
			</main>
		</div>
	</div>
	<Toaster />
</SidebarProvider>