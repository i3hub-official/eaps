<script lang="ts">
	import { Topbar, SessionClock } from '$lib/components/dashboard';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Camera from '@lucide/svelte/icons/camera';
	import Wifi from '@lucide/svelte/icons/wifi';
	import Laptop from '@lucide/svelte/icons/laptop';
	import Flag from '@lucide/svelte/icons/flag';
	import Square from '@lucide/svelte/icons/square';

	type Signal = 'ok' | 'weak' | 'down';

	const signalTone: Record<Signal, string> = {
		ok: 'text-[var(--success)]',
		weak: 'text-[var(--gold-500)]',
		down: 'text-destructive'
	};

	const candidates = [
		{ id: '20211045', name: 'C. Okafor', device: 'ok' as Signal, camera: 'ok' as Signal, network: 'ok' as Signal, flagged: false },
		{ id: '20210987', name: 'A. Nwachukwu', device: 'ok' as Signal, camera: 'weak' as Signal, network: 'ok' as Signal, flagged: false },
		{ id: '20211302', name: 'B. Eze', device: 'ok' as Signal, camera: 'ok' as Signal, network: 'down' as Signal, flagged: true },
		{ id: '20210711', name: 'T. Ibrahim', device: 'weak' as Signal, camera: 'ok' as Signal, network: 'ok' as Signal, flagged: false },
		{ id: '20211199', name: 'F. Yusuf', device: 'ok' as Signal, camera: 'down' as Signal, network: 'ok' as Signal, flagged: true },
		{ id: '20210856', name: 'K. Umeh', device: 'ok' as Signal, camera: 'ok' as Signal, network: 'ok' as Signal, flagged: false }
	];
</script>

<Topbar title="Live candidates — ECO 105" description="Microeconomics · 302 registered · Room: BYOD (remote)" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<Card.Root class="flex flex-row flex-wrap items-center justify-between gap-4 p-4">
		<div class="flex items-center gap-6">
			<div class="flex flex-col">
				<span class="text-xs font-medium text-muted-foreground uppercase">Session time</span>
				<SessionClock />
			</div>
			<div class="h-8 w-px bg-border"></div>
			<div class="flex flex-col">
				<span class="text-xs font-medium text-muted-foreground uppercase">Candidates online</span>
				<span class="font-mono text-sm font-semibold">298 / 302</span>
			</div>
			<div class="flex flex-col">
				<span class="text-xs font-medium text-muted-foreground uppercase">Flagged</span>
				<span class="font-mono text-sm font-semibold text-destructive">2</span>
			</div>
		</div>
		<Button variant="destructive" size="sm"><Square class="size-3.5 fill-current" />End exam</Button>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Candidate grid</Card.Title>
			<Card.Description>
				Device, camera, and network status per candidate — no strict restriction, flagged sessions are logged out automatically
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each candidates as c (c.id)}
				<div class="flex flex-col gap-3 rounded-md border p-3.5" class:border-destructive={c.flagged}>
					<div class="flex items-center justify-between">
						<div class="flex flex-col leading-tight">
							<span class="text-sm font-medium">{c.name}</span>
							<span class="font-mono text-xs text-muted-foreground">{c.id}</span>
						</div>
						{#if c.flagged}
							<Badge variant="destructive">Flagged</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-4 text-xs">
						<span class="flex items-center gap-1 {signalTone[c.device]}"><Laptop class="size-3.5" />Device</span>
						<span class="flex items-center gap-1 {signalTone[c.camera]}"><Camera class="size-3.5" />Camera</span>
						<span class="flex items-center gap-1 {signalTone[c.network]}"><Wifi class="size-3.5" />Network</span>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" class="flex-1">View</Button>
						<Button variant="ghost" size="icon" aria-label="Flag candidate"><Flag class="size-4" /></Button>
					</div>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</main>
