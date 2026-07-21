<!-- src/lib/components/system/MaintenanceScreen.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	interface Props {
		estimatedReturn?: string;
		message?: string;
	}

	let {
		estimatedReturn = '',
		message = 'We are performing scheduled maintenance to improve the platform. Please check back shortly.'
	}: Props = $props();

	let checking = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	async function checkStatus(manual = false) {
		if (manual) checking = true;
		try {
			const res = await fetch('/api/system-status');
			if (res.ok) {
				const flags = await res.json();
				if (!flags.maintenance) {
					window.location.reload();
					return;
				}
			}
		} catch {
			// Silently ignore — will retry on next poll
		} finally {
			if (manual) {
				await new Promise((r) => setTimeout(r, 400));
				checking = false;
			}
		}
	}

	onMount(() => {
		pollInterval = setInterval(() => checkStatus(false), 8000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.03]"
		style="background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 40px 40px;"
	></div>

	<div class="relative flex w-full max-w-md flex-col items-center gap-8 text-center">
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<span class="relative flex size-2">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground/40"></span>
				<span class="relative inline-flex size-2 rounded-full bg-muted-foreground/60"></span>
			</span>
			Checking automatically
		</div>

		<div class="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted shadow-sm">
			<WrenchIcon class="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
		</div>

		<div class="flex flex-col gap-3">
			<div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				System Notice
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">
				Under Maintenance
			</h1>
			<p class="text-sm leading-relaxed text-muted-foreground">
				{message}
			</p>
		</div>

		{#if estimatedReturn}
			<div class="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-foreground">
				<ClockIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<span>Expected back <strong class="font-semibold">{estimatedReturn}</strong></span>
			</div>
		{/if}

		<!-- <button
			onclick={() => checkStatus(true)}
			disabled={checking}
			class="flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
		>
			<RefreshCwIcon class="h-3.5 w-3.5 {checking ? 'animate-spin' : ''}" />
			{checking ? 'Checking…' : 'Check now'}
		</button> -->

		<div class="w-full border-t border-border pt-6">
			<p class="text-xs text-muted-foreground">
				This page refreshes automatically once maintenance ends.
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				EA Proctoring System &mdash; Michael Okpara University of Agriculture, Umudike
			</p>
		</div>
	</div>
</div>