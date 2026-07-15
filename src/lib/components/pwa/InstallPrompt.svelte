<!-- src/lib/components/pwa/InstallPrompt.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';
	import { toast } from 'svelte-sonner';

	let deferredPrompt: any = null;
	let canInstall = $state(false);

	onMount(() => {
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as any).standalone === true;

		if ('serviceWorker' in navigator) {
			import('virtual:pwa-register').then(({ registerSW }) => {
				registerSW({
					immediate: true,
					onNeedRefresh() {
						toast('A new version is available', {
							action: { label: 'Reload', onClick: () => window.location.reload() }
						});
					}
				});
			});
		}

		if (isStandalone) return; // already installed, nothing to prompt

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			canInstall = true;
		});

		window.addEventListener('appinstalled', () => {
			canInstall = false;
			deferredPrompt = null;
			toast.success('EAPS e-Test installed');
		});
	});

	async function install() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') canInstall = false;
		deferredPrompt = null;
	}
</script>

{#if canInstall}
	<Button size="sm" variant="outline" onclick={install} class="gap-2">
		<Download class="size-4" />
		Install app
	</Button>
{/if}