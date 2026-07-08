<!-- src/lib/components/auth-shell.svelte -->
<!--
  Shared layout shell for all (auth) routes.
  Renders: MOUAU logo + wordmark, heading/subheading, card slot, theme toggle.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';

	interface Props {
		heading: string;
		subheading?: string;
		children: Snippet;
	}

	let { heading, subheading, children }: Props = $props();

	function handleLogoError(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		img.style.display = 'none';
		const fallback = img.nextElementSibling as HTMLElement | null;
		if (fallback) fallback.style.display = 'flex';
	}
</script>

<div class="relative flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-16 md:py-20">

	<!-- Theme toggle — top-right corner -->
	<div class="absolute right-5 top-5">
		<ThemeToggle />
	</div>

	<div class="w-full max-w-md">

		<!-- Logo + wordmark -->
		<div class="mb-10 flex flex-col items-center gap-4 text-center">
			<div class="flex size-16 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
				<img
					src="/mouau_logo.png"
					alt="MOUAU logo"
					class="size-10 object-contain"
					onerror={handleLogoError}
				/>
				<span
					class="hidden size-10 items-center justify-center text-sm font-bold text-primary"
					aria-hidden="true"
				>
					M
				</span>
			</div>

			<div class="flex flex-col gap-1.5">
				<p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Michael Okpara University of Agriculture
				</p>
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{heading}
				</h1>
				{#if subheading}
					<p class="mt-1 text-sm text-muted-foreground">{subheading}</p>
				{/if}
			</div>
		</div>

		<!-- Form card -->
		<div class="flex flex-col gap-6 rounded-2xl border border-border bg-card px-8 py-9 shadow-sm">
			{@render children()}
		</div>

	</div>
</div>