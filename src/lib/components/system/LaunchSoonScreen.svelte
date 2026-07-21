<!-- src/lib/components/system/LaunchSoonScreen.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import RocketIcon from '@lucide/svelte/icons/rocket';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	interface Props {
		launchDate?: string; // human-readable label, e.g. "Monday, 21 July 2026"
		launchDateISO?: string; // actual target timestamp, e.g. "2026-07-21T09:00:00+01:00"
		message?: string;
		contactEmail?: string;
	}

	let {
		launchDate = '',
		launchDateISO = '',
		message = "We're putting the finishing touches on the platform. Check back soon.",
		contactEmail = ''
	}: Props = $props();

    let launchDateLabel = $derived(
	launchDateISO
		? new Date(launchDateISO).toLocaleDateString('en-GB', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})
		: ''
);

	let checking = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	// Countdown state
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let days = $state(0);
	let hours = $state(0);
	let minutes = $state(0);
	let seconds = $state(0);
	let hasTarget = $state(false);
	let hasPassed = $state(false);

	function tickCountdown() {
		if (!launchDateISO) return;
		const target = new Date(launchDateISO).getTime();
		if (Number.isNaN(target)) return;

		hasTarget = true;
		const diff = target - Date.now();

		if (diff <= 0) {
			hasPassed = true;
			days = hours = minutes = seconds = 0;
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
			// Give the server a moment to actually flip the flag, then check
			checkStatus(false);
			return;
		}

		days = Math.floor(diff / (1000 * 60 * 60 * 24));
		hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		seconds = Math.floor((diff % (1000 * 60)) / 1000);
	}

	async function checkStatus(manual = false) {
		if (manual) checking = true;
		try {
			const res = await fetch('/api/system-status');
			if (res.ok) {
				const flags = await res.json();
				if (!flags.launchSoon) {
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

		if (launchDateISO) {
			tickCountdown();
			countdownInterval = setInterval(tickCountdown, 1000);
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
		if (countdownInterval) clearInterval(countdownInterval);
	});

	function pad(n: number) {
		return String(n).padStart(2, '0');
	}
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
	<!-- Ambient grid backdrop -->
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.03]"
		style="background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 40px 40px;"
	></div>

	<!-- Subtle top bar accent -->
	<div class="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

	<div class="relative flex w-full max-w-md flex-col items-center gap-8 text-center">
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<span class="relative flex size-2">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40"></span>
				<span class="relative inline-flex size-2 rounded-full bg-primary/70"></span>
			</span>
			Checking automatically
		</div>

		<!-- Icon badge -->
		<div class="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 shadow-sm">
			<RocketIcon class="h-9 w-9 text-primary" strokeWidth={1.5} />
		</div>

		<!-- Heading block -->
		<div class="flex flex-col gap-3">
			<div class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
				Coming Soon
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">
				We're Launching Soon
			</h1>
			<p class="text-sm leading-relaxed text-muted-foreground">
				{message}
			</p>
		</div>

		<!-- Countdown -->
		{#if hasTarget && !hasPassed}
			<div class="grid w-full grid-cols-4 gap-2">
				<div class="flex flex-col items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 py-3">
					<span class="text-2xl font-bold tabular-nums text-foreground">{pad(days)}</span>
					<span class="text-[10px] uppercase tracking-wider text-muted-foreground">Days</span>
				</div>
				<div class="flex flex-col items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 py-3">
					<span class="text-2xl font-bold tabular-nums text-foreground">{pad(hours)}</span>
					<span class="text-[10px] uppercase tracking-wider text-muted-foreground">Hours</span>
				</div>
				<div class="flex flex-col items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 py-3">
					<span class="text-2xl font-bold tabular-nums text-foreground">{pad(minutes)}</span>
					<span class="text-[10px] uppercase tracking-wider text-muted-foreground">Min</span>
				</div>
				<div class="flex flex-col items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 py-3">
					<span class="text-2xl font-bold tabular-nums text-foreground">{pad(seconds)}</span>
					<span class="text-[10px] uppercase tracking-wider text-muted-foreground">Sec</span>
				</div>
			</div>
		{:else if hasPassed}
			<div class="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground">
				<RocketIcon class="h-3.5 w-3.5 shrink-0 text-primary" />
				<span>Almost there — finalizing launch…</span>
			</div>
		{/if}

		<!-- Launch date pill -->
		{#if launchDate}
			<div class="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground">
				<CalendarClockIcon class="h-3.5 w-3.5 shrink-0 text-primary" />
				<span>Launching <strong class="font-semibold">{launchDate}</strong></span>
			</div>
		{/if}

		{#if contactEmail}
			<div class="flex items-center justify-between w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-left">
				<span class="text-xs text-muted-foreground">Questions?</span>
				<a
					href="mailto:{contactEmail}"
					class="text-xs font-medium text-foreground underline-offset-2 hover:underline"
				>
					{contactEmail}
				</a>
			</div>
		{/if}

		<!-- Footer -->
		<div class="w-full border-t border-border pt-6">
			<p class="text-xs text-muted-foreground">
				This page refreshes automatically once we're live.
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				EA Proctoring System &mdash; Michael Okpara University of Agriculture, Umudike
			</p>
		</div>
	</div>
</div>