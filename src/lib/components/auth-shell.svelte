<script lang="ts">
	import type { Snippet } from 'svelte';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

	let {
		heading,
		subheading,
		children
	}: { heading: string; subheading: string; children: Snippet } = $props();
</script>

<div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
	<div class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
		<div
			class="pointer-events-none absolute inset-0 opacity-[0.07]"
			style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;"
		></div>

		<div class="relative flex items-center gap-2.5">
			<div class="flex size-8 items-center justify-center rounded-md bg-white/10">
				<ShieldCheck class="size-4.5 text-primary-foreground" />
			</div>
			<span class="text-sm font-semibold">MOUAU e-Test</span>
		</div>

		<div class="relative flex flex-col gap-4">
			<p class="text-3xl leading-tight font-medium text-balance">
				Secure, proctored assessments for the entire university community.
			</p>
			<p class="max-w-sm text-sm text-white/70">
				Every device is verified, every session is logged, and every result is auditable.
			</p>
		</div>

		<p class="relative text-xs text-white/50">
			© {new Date().getFullYear()} Michael Okpara University of Agriculture, Umudike
		</p>
	</div>

	<div class="flex items-center justify-center bg-background p-6 sm:p-10">
		<div class="flex w-full max-w-sm flex-col gap-8">
			<div class="flex flex-col gap-1.5 text-center lg:text-left">
				<h1 class="text-xl font-semibold">{heading}</h1>
				<p class="text-sm text-muted-foreground">{subheading}</p>
			</div>
			{@render children()}
		</div>
	</div>
</div>
