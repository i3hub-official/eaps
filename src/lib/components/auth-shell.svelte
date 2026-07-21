<!-- src/lib/components/auth-shell.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	interface Props {
		heading: string;
		subheading?: string;
		children: Snippet;
		/**
		 * Called when the back button is pressed. If omitted, defaults to
		 * browser history.back(). Pass this on multi-step pages to go back
		 * a step instead of leaving the page.
		 */
		onBack?: () => void;
		/** Hide the back button entirely, e.g. on the first step of a flow or the initial login screen. */
		showBack?: boolean;
	}

	let { heading, subheading, children, onBack, showBack = true }: Props = $props();

	function handleBack() {
		if (onBack) {
			onBack();
		} else if (typeof window !== 'undefined') {
			window.history.back();
		}
	}

	function handleLogoError(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		img.style.display = 'none';
		const fallback = img.nextElementSibling as HTMLElement | null;
		if (fallback) fallback.style.display = 'flex';
	}
</script>

<div class="relative flex min-h-svh flex-col items-center justify-center overflow-y-auto bg-muted/30 px-4 py-6 sm:py-10">

	<!-- Top bar: back button + theme toggle, own row so they never overlap the heading -->
	<div class="mb-4 flex w-full max-w-md items-center justify-between sm:absolute sm:inset-x-0 sm:top-3 sm:mx-auto sm:mb-0 sm:px-5">
		{#if showBack}
			<button
				type="button"
				onclick={handleBack}
				aria-label="Go back"
				title="Go back"
				class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<ArrowLeft class="size-4" />
			</button>
		{:else}
			<div class="size-9"></div>
		{/if}

		<ThemeToggle />
	</div>

	<div class="w-full max-w-md py-2">

		<div class="mb-3 flex flex-col items-center gap-3 text-center">
			<div class="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-background p-2.0 shadow-sm">
				<img
					src="/mouau_logo.png"
					alt="MOUAU logo"
					class="size-full object-contain"
					onerror={handleLogoError}
				/>
				<span
					class="hidden size-full items-center justify-center text-lg font-bold text-primary"
					aria-hidden="true"
				>
					M
				</span>
			</div>

			<div class="flex flex-col gap-2 px-2">
				<p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-snug sm:text-xs">
					Michael Okpara University of Agriculture
				</p>
				<h1 class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
					{heading}
				</h1>
				{#if subheading}
					<p class="mt-1 text-sm text-muted-foreground">{subheading}</p>
				{/if}
			</div>
		</div>

		<div class="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-7 shadow-sm sm:px-8 sm:py-9">
			{@render children()}
		</div>

	</div>
</div>