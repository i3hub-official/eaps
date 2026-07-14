<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import SessionClock from './session-clock.svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import type { Snippet } from 'svelte';
	import { normalizeUser } from '$lib/utils/user.js';

	let {
		title,
		description,
		userName,
		userInitials,
		actions,
		backHref
	}: {
		title: string;
		description?: string;
		userName?: string;
		userInitials?: string;
		actions?: Snippet;
		backHref?: string | true;
	} = $props();

	function handleBack() {
		if (backHref === true) {
			history.back();
		} else if (backHref) {
			goto(backHref);
		}
	}

	let normalized = $derived(normalizeUser(page.data.user));
	let resolvedName = $derived(userName ?? normalized?.name ?? 'Guest');
	let resolvedInitials = $derived(userInitials ?? normalized?.initials ?? '?');

	// The first path segment is the portal base (student/admin/deo/lecturer/
	// invigilator) — every portal now has a /profile page at that base, so
	// this resolves correctly regardless of which portal Topbar is rendered
	// inside, without each layout needing to pass its own profile href down.
	let profileHref = $derived(`/${page.url.pathname.split('/')[1] ?? ''}/profile`);
</script>

<header
	class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur sm:gap-4 sm:px-4 sm:py-3"
>
	<div class="flex min-w-0 items-center gap-2 sm:gap-3">
		<Sidebar.Trigger class="shrink-0" />
		<Separator orientation="vertical" class="hidden h-5! sm:block" />
		{#if backHref}
			<Button
				variant="ghost"
				size="icon"
				class="shrink-0"
				aria-label="Go back"
				onclick={handleBack}
			>
				<ChevronLeft class="size-4.5" />
			</Button>
		{/if}
		<div class="flex min-w-0 flex-col">
			<h1 class="truncate text-sm font-semibold leading-tight sm:text-base">{title}</h1>
			{#if description}
				<p class="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
			{/if}
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-1.5 sm:gap-3">
		{#if actions}
			<div class="hidden items-center gap-1.5 sm:flex sm:gap-3">
				{@render actions()}
			</div>
			<Separator orientation="vertical" class="hidden h-5! sm:block" />
		{/if}

		<SessionClock class="hidden md:flex" />

		<ThemeToggle />

		<Button variant="ghost" size="icon" class="relative" aria-label="Notifications">
			<Bell class="size-4.5" />
			<span class="absolute top-2 right-2 size-1.5 rounded-full bg-emerald-500"></span>
		</Button>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props }: { props: Record<string, unknown> })}
					<button
						{...props}
						class="flex items-center gap-2 pl-1.5 focus-visible:outline-none sm:gap-2.5 sm:border-l sm:pl-3"
					>
						<div
							class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-primary-foreground sm:size-8 sm:text-xs"
						>
							{resolvedInitials}
						</div>
						<span class="hidden text-sm font-medium lg:inline">{resolvedName}</span>
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				{#if actions}
					<div class="flex flex-col gap-1 border-b p-1 sm:hidden">
						{@render actions()}
					</div>
				{/if}
				<DropdownMenu.Item>
					{#snippet child({ props }: { props: Record<string, unknown> })}
						<a href={profileHref} {...props}>
							<Settings />
							Account settings
						</a>
					{/snippet}
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