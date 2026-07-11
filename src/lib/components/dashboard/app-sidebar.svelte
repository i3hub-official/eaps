<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/state';
	import { navByRole, roleLabel, type Role } from './nav-config';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { cn } from '$lib/utils.js';

	let { role }: { role: Role } = $props();
	const sections = $derived(navByRole[role]);

	const sidebar = Sidebar.useSidebar();

	function isActive(href: string) {
		if (href === `/${role}`) return page.url.pathname === href;
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function menuLinkClass(propsClass: unknown) {
		return cn(
			propsClass as string,
			'gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0'
		);
	}

	// On mobile the sidebar renders as an overlay sheet; close it after
	// navigating so the destination page isn't hidden behind the drawer.
	function handleNavClick() {
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<div
			class="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
		>
			<div class="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
				<div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary">
					<ShieldCheck class="size-4.5 text-primary-foreground" />
				</div>
				<div class="flex min-w-0 flex-col leading-tight">
					<span class="truncate text-sm font-semibold">MOUAU e-Test</span>
					<span class="truncate text-[11px] text-muted-foreground">{roleLabel[role]}</span>
				</div>
			</div>
			<div
				class="hidden size-8 shrink-0 items-center justify-center rounded-md bg-primary group-data-[collapsible=icon]:flex"
			>
				<ShieldCheck class="size-4.5 text-primary-foreground" />
			</div>
		</div>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each sections as section, i (i)}
			<Sidebar.Group class="group-data-[collapsible=icon]:py-1.5">
				{#if section.label}
					<Sidebar.GroupLabel class="group-data-[collapsible=icon]:hidden">
						{section.label}
					</Sidebar.GroupLabel>
				{/if}
				<Sidebar.GroupContent>
					<Sidebar.Menu class="group-data-[collapsible=icon]:gap-2">
						{#each section.items as item (item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={isActive(item.href)}
									size="lg"
									tooltipContent={item.label}
								>
									{#snippet child({ props }: { props: Record<string, unknown> })}
										<a
											href={item.href}
											{...props}
											class={menuLinkClass(props.class)}
											onclick={handleNavClick}
										>
											<item.icon class="size-5 shrink-0 group-data-[collapsible=icon]:!size-6" />
											<span class="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Rail />
</Sidebar.Root>