<!-- src/lib/components/admin/SystemFlagsManager.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		XCircle,
		CheckCircle2,
		Wrench,
		Power,
		Trash2,
		LoaderCircle,
		RefreshCw,
		Radio
	} from '@lucide/svelte/icons';

	interface SystemFlags {
		maintenance: boolean;
		shutdown: boolean;
	}

	let {
		refresh = $bindable<(() => void) | undefined>(undefined),
		loading = $bindable(true)
	} = $props();

	let flags = $state<SystemFlags | null>(null);
	let hasError = $state(false);
	let updating = $state<Record<string, boolean>>({});
	let refreshInterval: ReturnType<typeof setInterval> | null = null;
	let lastSynced = $state<Date | null>(null);
	let justChanged = $state<Record<string, boolean>>({});

	onMount(() => {
		fetchFlags();
		refresh = fetchFlags;
		refreshInterval = setInterval(() => {
			if (!loading && !hasError) {
				fetchFlags(true);
			}
		}, 10000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	function flashKey(key: string) {
		justChanged = { ...justChanged, [key]: true };
		setTimeout(() => {
			justChanged = { ...justChanged, [key]: false };
		}, 900);
	}

	async function fetchFlags(silent = false) {
		if (!silent) loading = true;
		hasError = false;
		try {
			const res = await fetch('/api/admin/system-flags', {
				credentials: 'include'
			});

			if (!res.ok) {
				let errorMessage = `Failed to fetch flags: ${res.statusText}`;
				try {
					const errorData = await res.json();
					errorMessage = errorData.message || errorMessage;
				} catch (e) {
					// If response is not JSON, use status text
				}
				throw new Error(errorMessage);
			}

			const previous = flags;
			const next: SystemFlags = await res.json();

			// Flash any flag that changed since our last known state (e.g. another admin toggled it)
			if (previous) {
				(Object.keys(next) as (keyof SystemFlags)[]).forEach((k) => {
					if (previous[k] !== next[k]) flashKey(k);
				});
			}

			flags = next;
			lastSynced = new Date();
		} catch (err) {
			hasError = true;
			const message = err instanceof Error ? err.message : 'Unknown error occurred';
			if (!silent) toast.error(message);
			console.error('Fetch flags error:', err);
		} finally {
			loading = false;
		}
	}

	async function toggleFlag(key: 'maintenance' | 'shutdown') {
		if (!flags) return;

		const newValue = !flags[key];
		updating[key] = true;

		// Instant optimistic update — UI reflects the change immediately
		const oldFlags = { ...flags };
		flags = { ...flags, [key]: newValue };
		flashKey(key);

		try {
			const res = await fetch('/api/admin/system-flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ key, value: newValue }),
			});

			if (!res.ok) {
				let errorMessage = `Failed to update flag: ${res.statusText}`;
				try {
					const errorData = await res.json();
					errorMessage = errorData.message || errorMessage;
				} catch (e) {
					// If response is not JSON, use status text
				}
				throw new Error(errorMessage);
			}

			const updated = await res.json();
			flags = updated;
			lastSynced = new Date();

			const label = key === 'maintenance' ? 'Maintenance mode' : 'Shutdown mode';

if (newValue) {
  // Enabling is disruptive — red/crimson alert
  toast.error(`${label} ENABLED`, {
    description: 'Non-admin users are now affected immediately.',
    style: 'background: #7f1d1d; color: #fecaca; border: 1px solid #991b1b;'
  });
} else {
  // Disabling restores access — green success
  toast.success(`${label} DISABLED`, {
    description: 'Access has been restored for all users.',
    style: 'background: #14532d; color: #bbf7d0; border: 1px solid #166534;'
  });
}
		} catch (err) {
			flags = oldFlags;
			const message = err instanceof Error ? err.message : 'Unknown error occurred';
			toast.error(message);
			console.error('Toggle flag error:', err);
		} finally {
			updating[key] = false;
		}
	}

	async function clearCache() {
		try {
			const res = await fetch('/api/admin/system-flags/cache', {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) {
				let errorMessage = `Failed to clear cache: ${res.statusText}`;
				try {
					const errorData = await res.json();
					errorMessage = errorData.message || errorMessage;
				} catch (e) {
					// If response is not JSON, use status text
				}
				throw new Error(errorMessage);
			}

			const data = await res.json();
			toast.success(data.message || 'Cache cleared successfully');

			await fetchFlags();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error occurred';
			toast.error(message);
			console.error('Clear cache error:', err);
		}
	}

	function getStatusBadge(value: boolean) {
		if (value) {
			return { variant: 'destructive' as const, icon: XCircle, label: 'Active' };
		}
		return { variant: 'secondary' as const, icon: CheckCircle2, label: 'Inactive' };
	}

	function timeAgo(date: Date | null) {
		if (!date) return '';
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 5) return 'just now';
		if (seconds < 60) return `${seconds}s ago`;
		return `${Math.floor(seconds / 60)}m ago`;
	}
</script>

<div class="space-y-6">
	<!-- Live sync indicator -->
	<div class="flex items-center gap-2 text-xs text-muted-foreground">
		<span class="relative flex size-2">
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
			<span class="relative inline-flex size-2 rounded-full bg-green-500"></span>
		</span>
		<Radio class="size-3" />
		Live
		{#if lastSynced}
			<span class="text-muted-foreground/60">· synced {timeAgo(lastSynced)}</span>
		{/if}
	</div>

	{#if loading && !flags}
		<div class="flex flex-col items-center justify-center py-12">
			<LoaderCircle class="size-8 animate-spin text-muted-foreground" />
			<p class="mt-4 text-sm text-muted-foreground">Loading system flags...</p>
		</div>
	{:else if flags}
		<div class="grid gap-6 md:grid-cols-2">
			<Card
				class={[
					'transition-all duration-300',
					flags.maintenance ? 'border-red-200 dark:border-red-800' : '',
					justChanged.maintenance ? 'ring-2 ring-primary/50 scale-[1.01]' : ''
				].join(' ')}
			>
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle class="flex items-center gap-2">
							<Wrench class="size-5" />
							Maintenance Mode
						</CardTitle>
						<Badge variant={getStatusBadge(flags.maintenance).variant} class="transition-all duration-300">
							<svelte:component this={getStatusBadge(flags.maintenance).icon} class="mr-1 size-3" />
							{getStatusBadge(flags.maintenance).label}
						</Badge>
					</div>
					<CardDescription>
						When active, all non-admin users are redirected to the maintenance screen.
						Admin users can still access the system.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant={flags.maintenance ? 'destructive' : 'default'}
						class="w-full"
						onclick={() => toggleFlag('maintenance')}
						disabled={updating['maintenance']}
					>
						{#if updating['maintenance']}
							<LoaderCircle class="mr-2 size-4 animate-spin" />
							Updating...
						{:else}
							{flags.maintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
						{/if}
					</Button>
				</CardContent>
			</Card>

			<Card
				class={[
					'transition-all duration-300',
					flags.shutdown ? 'border-red-200 dark:border-red-800' : '',
					justChanged.shutdown ? 'ring-2 ring-primary/50 scale-[1.01]' : ''
				].join(' ')}
			>
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle class="flex items-center gap-2">
							<Power class="size-5" />
							Shutdown Mode
						</CardTitle>
						<Badge variant={getStatusBadge(flags.shutdown).variant} class="transition-all duration-300">
							<svelte:component this={getStatusBadge(flags.shutdown).icon} class="mr-1 size-3" />
							{getStatusBadge(flags.shutdown).label}
						</Badge>
					</div>
					<CardDescription>
						When active, all non-admin users see a shutdown notice and cannot access the system.
						Admin users can still access the system.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant={flags.shutdown ? 'destructive' : 'default'}
						class="w-full"
						onclick={() => toggleFlag('shutdown')}
						disabled={updating['shutdown']}
					>
						{#if updating['shutdown']}
							<LoaderCircle class="mr-2 size-4 animate-spin" />
							Updating...
						{:else}
							{flags.shutdown ? 'Disable Shutdown' : 'Enable Shutdown'}
						{/if}
					</Button>
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Trash2 class="size-5" />
					Cache Management
				</CardTitle>
				<CardDescription>
					Flags are read directly from the database. If you update the database manually,
					click below to force a refresh.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button variant="outline" onclick={clearCache}>
					<RefreshCw class="mr-2 size-4" />
					Force Refresh
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-base">Current System Status</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex items-center justify-between rounded-lg border p-4 transition-all duration-300 {justChanged.maintenance ? 'bg-primary/5' : ''}">
						<div class="flex items-center gap-3">
							<Wrench class="size-4 text-muted-foreground" />
							<span class="text-sm font-medium">Maintenance</span>
						</div>
						<Badge variant={flags.maintenance ? 'destructive' : 'secondary'} class="transition-all duration-300">
							{flags.maintenance ? 'Active' : 'Inactive'}
						</Badge>
					</div>
					<div class="flex items-center justify-between rounded-lg border p-4 transition-all duration-300 {justChanged.shutdown ? 'bg-primary/5' : ''}">
						<div class="flex items-center gap-3">
							<Power class="size-4 text-muted-foreground" />
							<span class="text-sm font-medium">Shutdown</span>
						</div>
						<Badge variant={flags.shutdown ? 'destructive' : 'secondary'} class="transition-all duration-300">
							{flags.shutdown ? 'Active' : 'Inactive'}
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>