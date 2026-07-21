<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import './app.css';
    import { browser } from '$app/environment';
    import { onMount, setContext } from 'svelte';
    import type { Snippet } from 'svelte';

    import { ModeWatcher } from 'mode-watcher';
    import { Toaster } from '$lib/components/ui/sonner';

    import { faceModels } from '$lib/stores/faceModels.svelte';

    import MaintenanceScreen from '$lib/components/system/MaintenanceScreen.svelte';
    import VpnBlockedScreen from '$lib/components/system/VpnBlockedScreen.svelte';
    import ShutdownScreen from '$lib/components/system/ShutdownScreen.svelte';
    import LaunchSoonScreen from '$lib/components/system/LaunchSoonScreen.svelte';

    interface LayoutData {
        systemState: 'maintenance' | 'vpn_blocked' | 'shutdown' | 'launch_soon' | null;
        detectedIp: string | null;
        launchDateISO?: string | null;
    }

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

    setContext('faceModels', faceModels);

    const systemState = data?.systemState ?? null;
    const detectedIp = data?.detectedIp ?? null;

    onMount(async () => {
        if (!browser) return;
        await faceModels.load();
    });
</script>

<svelte:head>
    <link rel="preconnect" href="/models/human/" />
    <link rel="dns-prefetch" href="/models/human/" />
</svelte:head>

<ModeWatcher />
<Toaster richColors position="top-right" />

{#if systemState === 'maintenance'}
	<MaintenanceScreen ... />
{:else if systemState === 'vpn_blocked'}
	<VpnBlockedScreen detectedIp="" />
{:else if systemState === 'shutdown'}
	<ShutdownScreen />
{:else if systemState === 'launch_soon'}
	<LaunchSoonScreen
		launchDateISO={data.launchDateISO ?? undefined}
		message="We're putting the finishing touches on the platform. Check back soon."
		contactEmail="examoffice@mouau.edu.ng"
	/>
{:else}
	{@render children()}
{/if}