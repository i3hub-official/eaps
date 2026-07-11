<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { page } from '$app/state';
	import SessionClock from './session-clock.svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import Search from '@lucide/svelte/icons/search';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';
	import Menu from '@lucide/svelte/icons/menu';
	import User from '@lucide/svelte/icons/user';
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		userName,
		userInitials,
		actions
	}: {
		title: string;
		description?: string;
		userName?: string;
		userInitials?: string;
		actions?: Snippet;
	} = $props();

	function buildName(u: any): string | undefined {
		if (u?.name) return u.name;
		if (u?.firstName || u?.lastName) return `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim();
		return undefined;
	}

	function buildInitials(u: any): string | undefined {
		if (u?.initials) return u.initials;
		if (u?.firstName || u?.lastName) {
			return `${u.lastName?.[0] ?? ''}${u.firstName?.[0] ?? ''}`.toUpperCase() || undefined;
		}
		return undefined;
	}

	let resolvedName = $derived(userName ?? buildName(page.data.user) ?? 'Guest');
	let resolvedInitials = $derived(userInitials ?? buildInitials(page.data.user) ?? '?');
	let userDropdownOpen = $state(false);
</script>

<header
	class="sticky top-0 z-10 flex items-center justify-between gap-2 sm:gap-4 border-b bg-background/90 px-2 sm:px-4 py-2 sm:py-3 backdrop-blur"
>
	<!-- Left side: Menu button + Title -->
	<div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
		<Sidebar.Trigger asChild>
			<Button variant="ghost" size="icon" class="shrink-0" aria-label="Toggle sidebar">
				<Menu class="size-4 sm:size-5" />
			</Button>
		</Sidebar.Trigger>
		
		<Separator orientation="vertical" class="h-4 sm:h-5! hidden sm:block" />
		
		<div class="min-w-0 flex-1">
			<h1 class="text-sm sm:text-base font-semibold leading-tight truncate">{title}</h1>
			{#if description}
				<p class="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>
			{/if}
		</div>
	</div>

	<!-- Right side: Actions -->
	<div class="flex items-center gap-1 sm:gap-3 shrink-0">
		{#if actions}
			<div class="hidden sm:flex items-center gap-2">
				{@render actions()}
				<Separator orientation="vertical" class="h-5!" />
			</div>
			<!-- Mobile actions dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<Button variant="ghost" size="icon" class="sm:hidden" aria-label="Actions">
						<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="1" />
							<circle cx="19" cy="12" r="1" />
							<circle cx="5" cy="12" r="1" />
						</svg>
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-48">
					{#if actions}
						<div class="flex flex-col gap-1 p-1">
							{@render actions()}
						</div>
						<DropdownMenu.Separator />
					{/if}
					<DropdownMenu.Item onselect={() => {}}>
						<Search class="size-4" />
						Search
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}

		<SessionClock class="hidden sm:flex" />

		<ThemeToggle />

		<Button variant="ghost" size="icon" class="relative shrink-0" aria-label="Notifications">
			<Bell class="size-4 sm:size-4.5" />
			<span class="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 size-1.5 rounded-full bg-emerald-500"></span>
		</Button>

		<!-- User dropdown - single source of truth -->
		<DropdownMenu.Root bind:open={userDropdownOpen}>
			<DropdownMenu.Trigger asChild>
				<div class="flex items-center gap-2">
					<!-- Desktop user button -->
					<Button variant="ghost" class="hidden sm:flex items-center gap-2.5 border-l pl-3 focus-visible:outline-none h-10">
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground"
						>
							{resolvedInitials}
						</div>
						<span class="hidden text-sm font-medium lg:inline">{resolvedName}</span>
					</Button>
					<!-- Mobile user button -->
					<Button 
						variant="ghost" 
						size="icon" 
						class="sm:hidden shrink-0" 
						aria-label="User menu"
						onclick={() => (userDropdownOpen = !userDropdownOpen)}
					>
						<div class="flex size-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground">
							{resolvedInitials}
						</div>
					</Button>
				</div>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<!-- User info at top of dropdown (visible on mobile) -->
				<div class="flex items-center gap-2 px-2 py-1.5 sm:hidden">
					<div
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground"
					>
						{resolvedInitials}
					</div>
					<div class="flex flex-col min-w-0">
						<span class="text-sm font-medium truncate">{resolvedName}</span>
						<span class="text-xs text-muted-foreground truncate">{page.data.user?.email || ''}</span>
					</div>
				</div>
				<DropdownMenu.Separator class="sm:hidden" />
				
				<DropdownMenu.Item onselect={() => (window.location.href = '/profile')}>
					<User class="size-4" />
					Profile
				</DropdownMenu.Item>
				<DropdownMenu.Item onselect={() => (window.location.href = '/settings')}>
					<Settings class="size-4" />
					Account settings
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onselect={() => (window.location.href = '/logout')}>
					<LogOut class="size-4" />
					Sign out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>