<script lang="ts">
	import type { Component } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils';

	let {
		label,
		value,
		delta,
		deltaTone = 'neutral',
		icon: Icon,
		accent = 'primary'
	}: {
		label: string;
		value: string;
		delta?: string;
		deltaTone?: 'up' | 'down' | 'neutral';
		icon?: Component<any>;
		accent?: 'primary' | 'gold' | 'danger';
	} = $props();

	const accentBg: Record<string, string> = {
		primary: 'bg-secondary text-secondary-foreground',
		gold: 'bg-amber-100 text-accent-foreground',
		danger: 'bg-destructive/10 text-destructive'
	};

	const deltaColor: Record<string, string> = {
		up: 'text-emerald-600',
		down: 'text-destructive',
		neutral: 'text-muted-foreground'
	};
</script>

<Card.Root class="p-5">
	<div class="flex items-start justify-between gap-3">
		<div class="flex flex-col gap-1">
			<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
			<span class="text-2xl font-semibold">{value}</span>
			{#if delta}
				<span class={cn('text-xs font-medium', deltaColor[deltaTone])}>{delta}</span>
			{/if}
		</div>
		{#if Icon}
			<div class={cn('flex size-9 shrink-0 items-center justify-center rounded-md', accentBg[accent])}>
				<Icon class="size-4.5" />
			</div>
		{/if}
	</div>
</Card.Root>
