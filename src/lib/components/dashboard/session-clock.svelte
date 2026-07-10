<!-- src/lib/components/dashboard/session-clock.svelte -->
<script lang="ts">
	import { cn } from '$lib/utils';

	let { class: className }: { class?: string } = $props();

	let now = $state(new Date());

	$effect(() => {
		const id = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(id);
	});

	const time = $derived(
		now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	);
	const date = $derived(
		now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
	);
</script>

<div class={cn('flex items-center gap-2 font-mono text-xs text-muted-foreground', className)}>
	<span class="relative flex size-1.5">
		<span
			class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"
		></span>
		<span class="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
	</span>
	<span>{date}</span>
	<span class="text-border">·</span>
	<span class="font-medium text-foreground">{time}</span>
</div>
