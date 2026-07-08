<!-- src/lib/components/ui/theme-toggle/theme-toggle.svelte -->
<script lang="ts">
	import { setMode, resetMode, userPrefersMode } from 'mode-watcher';
	import { clsx } from 'clsx';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Monitor from '@lucide/svelte/icons/monitor';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	type ThemeMode = 'system' | 'light' | 'dark';

	const options: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
		{ value: 'system', label: 'System', Icon: Monitor },
		{ value: 'light',  label: 'Light',  Icon: Sun },
		{ value: 'dark',   label: 'Dark',   Icon: Moon }
	];

	let open = $state(false);
	let containerEl = $state<HTMLDivElement | null>(null);

	// Icon shown on the trigger button reflects the active mode.
	let activeIcon = $derived(
		options.find((o) => o.value === userPrefersMode.current)?.Icon ?? Monitor
	);

	function select(value: ThemeMode) {
		if (value === 'system') resetMode();
		else setMode(value);
		open = false;
	}

	function toggleOpen() {
		open = !open;
	}

	function handleClickOutside(event: MouseEvent) {
		if (containerEl && !containerEl.contains(event.target as Node)) {
			open = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}

	$effect(() => {
		if (!open) return;
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class={clsx('relative inline-block', className)} bind:this={containerEl}>
	<button
		type="button"
		onclick={toggleOpen}
		aria-haspopup="true"
		aria-expanded={open}
		aria-label="Change colour theme"
		title="Change colour theme"
		class="flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		{#if activeIcon}
			{@const Icon = activeIcon}
			<Icon class="size-4" aria-hidden="true" />
		{/if}
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-50 mt-2 flex min-w-[8rem] flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md"
		>
			{#each options as opt}
				{@const active = userPrefersMode.current === opt.value}
				<button
					type="button"
					role="menuitem"
					onclick={() => select(opt.value)}
					aria-pressed={active}
					class={clsx(
						'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
						active
							? 'bg-accent text-accent-foreground'
							: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
					)}
				>
					<opt.Icon class="size-3.5" aria-hidden="true" />
					<span>{opt.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>