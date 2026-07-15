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

    let { children }: { children: Snippet } = $props();

    setContext('faceModels', faceModels);

    // --- System state (drive from your server/env/store as needed) ---
    // Set only one to true at a time; all false renders the app normally.
    const systemState: 'maintenance' | 'vpn_blocked' | 'shutdown' | null = null;

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
    <MaintenanceScreen
        estimatedReturn="2:00 PM WAT"
        message="We are performing scheduled maintenance to improve the platform. Please check back shortly."
    />
{:else if systemState === 'vpn_blocked'}
    <VpnBlockedScreen detectedIp="" />
{:else if systemState === 'shutdown'}
    <ShutdownScreen
        reason="The examination platform has been shut down by the administration pending review."
        reopenDate="Monday, 21 July 2025"
        contactEmail="examoffice@mouau.edu.ng"
    />
{:else}
    {@render children()}
{/if}