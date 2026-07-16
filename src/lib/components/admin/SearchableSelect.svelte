<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '$lib/components/ui/command/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Check, ChevronsUpDown } from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';

	type Item = { value: string; label: string; sublabel?: string };

	let {
		items = [],
		value = $bindable(''),
		placeholder = 'Select...',
		name = '',
		disabled = false,
		emptyText = 'No results found.',
		triggerClass = '',
	}: {
		items: Item[];
		value: string;
		placeholder?: string;
		name?: string;
		disabled?: boolean;
		emptyText?: string;
		triggerClass?: string;
	} = $props();

	let open = $state(false);

	let selectedLabel = $derived(items.find((i) => i.value === value)?.label ?? '');

	function selectItem(item: Item) {
		value = item.value;
		open = false;
	}
</script>

{#if name}
	<input type="hidden" {name} {value} />
{/if}

<Popover bind:open>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class={cn('w-full justify-between font-normal', !selectedLabel && 'text-muted-foreground', triggerClass)}
				{disabled}
			>
				{selectedLabel || placeholder}
				<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-[--bits-popover-anchor-width] p-0">
		<Command>
			<CommandInput placeholder="Search..." />
			<CommandList>
				<CommandEmpty>{emptyText}</CommandEmpty>
				<CommandGroup>
					{#each items as item (item.value)}
						<CommandItem value={item.label} onSelect={() => selectItem(item)}>
							<Check class={cn('mr-2 size-4', item.value === value ? 'opacity-100' : 'opacity-0')} />
							<span>{item.label}</span>
							{#if item.sublabel}
								<span class="ml-1 text-xs text-muted-foreground">· {item.sublabel}</span>
							{/if}
						</CommandItem>
					{/each}
				</CommandGroup>
			</CommandList>
		</Command>
	</PopoverContent>
</Popover>