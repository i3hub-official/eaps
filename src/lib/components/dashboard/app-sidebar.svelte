<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/state';
	import { navByRole, roleLabel, type Role } from './nav-config';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

	let { role }: { role: Role } = $props();
	const sections = $derived(navByRole[role]);

	function isActive(href: string) {
		if (href === `/${role}`) return page.url.pathname === href;
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<div class="flex items-center gap-2.5 px-2 py-1.5">
			<div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary">
				<ShieldCheck class="size-4.5 text-primary-foreground" />
			</div>
			<div class="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
				<span class="text-sm font-semibold">MOUAU e-Test</span>
				<span class="text-[11px] text-muted-foreground">{roleLabel[role]}</span>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		{#each sections as section, i (i)}
			<Sidebar.Group>
				{#if section.label}
					<Sidebar.GroupLabel>{section.label}</Sidebar.GroupLabel>
				{/if}
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each section.items as item (item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)}>
									{#snippet child({ props }: { props: Record<string, unknown> })}
										<a href={item.href} {...props}>
											<item.icon />
											<span>{item.label}</span>
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
