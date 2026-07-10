<script lang="ts">
	import './app.css';
	import { browser } from '$app/environment';
	import { onMount, setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';

	import { faceModels } from '$lib/stores/faceModels.svelte';
	import { registerServiceWorker } from '$lib/client/service-worker';

	let { children }: { children: Snippet } = $props();

	setContext('faceModels', faceModels);

	onMount(async () => {
		if (!browser) return;

		await registerServiceWorker();
		await faceModels.load();
	});
</script>

<svelte:head>
	<link rel="preconnect" href="/models/human/" />
</svelte:head>

<ModeWatcher />
<Toaster richColors position="top-right" />

{@render children()}