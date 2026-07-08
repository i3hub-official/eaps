<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SessionClock from './session-clock.svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import Search from '@lucide/svelte/icons/search';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';

	let {
		title,
		description,
		userName = 'Chidi Okafor',
		userInitials = 'CO'
	}: { title: string; description?: string; userName?: string; userInitials?: string } = $props();
</script>

<header
	class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background/90 px-4 py-3 backdrop-blur"
>
	<div class="flex items-center gap-3">
		<Sidebar.Trigger />
		<Separator orientation="vertical" class="h-5!" />
		<div class="flex flex-col">
			<h1 class="text-base font-semibold leading-tight">{title}</h1>
			{#if description}
				<p class="text-xs text-muted-foreground">{description}</p>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-3">
		<SessionClock class="hidden sm:flex" />

		<Button variant="outline" size="sm" class="hidden gap-2 text-muted-foreground md:flex">
			<Search class="size-3.5" />
			Search
			<kbd class="rounded border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
		</Button>

		<Button variant="ghost" size="icon" class="relative" aria-label="Notifications">
			<Bell class="size-4.5" />
			<span class="absolute top-2 right-2 size-1.5 rounded-full bg-emerald-500"></span>
		</Button>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props }: { props: Record<string, unknown> })}
					<button
						{...props}
						class="flex items-center gap-2.5 border-l pl-3 focus-visible:outline-none"
					>
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground"
						>
							{userInitials}
						</div>
						<span class="hidden text-sm font-medium lg:inline">{userName}</span>
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<DropdownMenu.Item>
					<Settings />
					Account settings
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive">
					{#snippet child({ props }: { props: Record<string, unknown> })}
						<a href="/logout" {...props}>
							<LogOut />
							Sign out
						</a>
					{/snippet}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>
