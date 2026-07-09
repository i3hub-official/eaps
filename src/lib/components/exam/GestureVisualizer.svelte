<!-- src/lib/components/exam/GestureVisualizer.svelte -->
<script lang="ts">
	import { cn } from '$lib/utils.js';
	
	type GestureIcon = 'left' | 'right' | 'blink' | 'nod' | 'mouth';
	
	let { icon, active = false, size = 'md' }: { 
		icon: GestureIcon;
		active?: boolean;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizeClasses = {
		sm: 'w-8 h-8',
		md: 'w-12 h-12',
		lg: 'w-16 h-16'
	};

	const iconPaths = {
		left: 'M15 18l-6-6 6-6',
		right: 'M9 18l6-6-6-6',
		blink: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
		nod: 'M12 5v14M5 12l7-7 7 7',
		mouth: 'M8 14s1.5 2 4 2 4-2 4-2'
	};
</script>

<div 
	class={cn(
		"rounded-full border-2 transition-all duration-300 flex items-center justify-center",
		sizeClasses[size],
		active 
			? "border-primary bg-primary/10 text-primary" 
			: "border-border bg-background text-muted-foreground"
	)}
>
	<svg 
		class={cn(
			"stroke-current",
			size === 'sm' && "w-4 h-4",
			size === 'md' && "w-6 h-6",
			size === 'lg' && "w-8 h-8"
		)} 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke-width="2.5" 
		stroke-linecap="round" 
		stroke-linejoin="round"
	>
		{#if icon === 'blink'}
			<path d={iconPaths[icon]}/>
			<circle cx="12" cy="12" r="3"/>
		{:else if icon === 'mouth'}
			<circle cx="12" cy="12" r="10"/>
			<path d={iconPaths[icon]}/>
		{:else}
			<path d={iconPaths[icon]}/>
		{/if}
	</svg>
</div>