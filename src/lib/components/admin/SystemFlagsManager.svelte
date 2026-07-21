<!-- src/lib/components/admin/SystemFlagsManager.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		AlertCircle,
		CheckCircle2,
		XCircle,
		Wrench,
		Power,
		Trash2,
		LoaderCircle,
		RefreshCw
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
	let error = $state<string | null>(null);
	let updating = $state<Record<string, boolean>>({});
	let successMessage = $state<string | null>(null);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		fetchFlags();
		refresh = fetchFlags;
		refreshInterval = setInterval(() => {
			if (!loading && !error) {
				fetchFlags();
			}
		}, 10000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	async function fetchFlags() {
		loading = true;
		error = null;
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

			flags = await res.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			console.error('Fetch flags error:', err);
		} finally {
			loading = false;
		}
	}

	async function toggleFlag(key: 'maintenance' | 'shutdown') {
		if (!flags) return;

		const newValue = !flags[key];
		updating[key] = true;
		error = null;
		successMessage = null;

		const oldFlags = { ...flags };
		flags = { ...flags, [key]: newValue };

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

			successMessage = `${key} successfully set to ${newValue ? 'ON' : 'OFF'}`;

			setTimeout(() => {
				successMessage = null;
			}, 3000);
		} catch (err) {
			flags = oldFlags;
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			console.error('Toggle flag error:', err);
		} finally {
			updating[key] = false;
		}
	}

	async function clearCache() {
		error = null;
		successMessage = null;

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
			successMessage = data.message || 'Cache cleared successfully';

			await fetchFlags();

			setTimeout(() => {
				successMessage = null;
			}, 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			console.error('Clear cache error:', err);
		}
	}

	function getStatusBadge(value: boolean) {
		if (value) {
			return { variant: 'destructive' as const, icon: XCircle, label: 'Active' };
		}
		return { variant: 'secondary' as const, icon: CheckCircle2, label: 'Inactive' };
	}
</script>

<div class="space-y-6">
	{#if error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if successMessage}
		<Alert variant="default" class="border-green-500 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400">
			<CheckCircle2 class="size-4" />
			<AlertDescription>{successMessage}</AlertDescription>
		</Alert>
	{/if}

	{#if loading && !flags}
		<div class="flex flex-col items-center justify-center py-12">
			<LoaderCircle class="size-8 animate-spin text-muted-foreground" />
			<p class="mt-4 text-sm text-muted-foreground">Loading system flags...</p>
		</div>
	{:else if flags}
		<div class="grid gap-6 md:grid-cols-2">
			<Card class={flags.maintenance ? 'border-red-200 dark:border-red-800' : ''}>
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle class="flex items-center gap-2">
							<Wrench class="size-5" />
							Maintenance Mode
						</CardTitle>
						<Badge variant={getStatusBadge(flags.maintenance).variant}>
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

			<Card class={flags.shutdown ? 'border-red-200 dark:border-red-800' : ''}>
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle class="flex items-center gap-2">
							<Power class="size-5" />
							Shutdown Mode
						</CardTitle>
						<Badge variant={getStatusBadge(flags.shutdown).variant}>
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
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-center gap-3">
							<Wrench class="size-4 text-muted-foreground" />
							<span class="text-sm font-medium">Maintenance</span>
						</div>
						<Badge variant={flags.maintenance ? 'destructive' : 'secondary'}>
							{flags.maintenance ? 'Active' : 'Inactive'}
						</Badge>
					</div>
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-center gap-3">
							<Power class="size-4 text-muted-foreground" />
							<span class="text-sm font-medium">Shutdown</span>
						</div>
						<Badge variant={flags.shutdown ? 'destructive' : 'secondary'}>
							{flags.shutdown ? 'Active' : 'Inactive'}
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>