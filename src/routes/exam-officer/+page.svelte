<script lang="ts">
	import { Topbar, StatCard } from '$lib/components/dashboard';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Database from '@lucide/svelte/icons/database';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import FilePlus from '@lucide/svelte/icons/file-plus';

	const stats = [
		{ label: 'Questions in bank', value: '4,832', delta: '+120 this week', deltaTone: 'up' as const, icon: Database, accent: 'primary' as const },
		{ label: 'Pending approvals', value: '5', delta: 'Awaiting sign-off', deltaTone: 'neutral' as const, icon: ShieldCheck, accent: 'gold' as const },
		{ label: 'Scheduled this week', value: '11', delta: '3 colleges', deltaTone: 'neutral' as const, icon: CalendarPlus, accent: 'primary' as const },
		{ label: 'Open incidents', value: '2', delta: 'Needs review', deltaTone: 'down' as const, icon: TriangleAlert, accent: 'danger' as const }
	];

	const approvals = [
		{ exam: 'CSC 301 — Mid-Semester Exam', requestedBy: 'Dr. E. Nwosu', status: 'pending' as const },
		{ exam: 'AGR 210 — Practical Test', requestedBy: 'Dr. F. Aliyu', status: 'pending' as const },
		{ exam: 'ECO 105 — CA Test', requestedBy: 'Dr. S. Bello', status: 'approved' as const },
		{ exam: 'BIO 202 — Final Exam', requestedBy: 'Dr. K. Umeh', status: 'pending' as const }
	];

	const statusBadge = {
		pending: { label: 'Pending', variant: 'outline' as const },
		approved: { label: 'Approved', variant: 'secondary' as const }
	};
</script>

<Topbar title="Examination office" description="Create, schedule, and approve assessments across departments" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each stats as s (s.label)}
			<StatCard label={s.label} value={s.value} delta={s.delta} deltaTone={s.deltaTone} icon={s.icon} accent={s.accent} />
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<Card.Root class="xl:col-span-2">
			<Card.Header>
				<Card.Title>Approval queue</Card.Title>
				<Card.Description>Exams awaiting sign-off before they go live</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2.5">
				{#each approvals as a (a.exam)}
					<div class="flex items-center justify-between gap-3 rounded-md border p-3.5">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm font-medium">{a.exam}</span>
							<span class="text-xs text-muted-foreground">Requested by {a.requestedBy}</span>
						</div>
						<Badge variant={statusBadge[a.status].variant}>{statusBadge[a.status].label}</Badge>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Create new</Card.Title>
				<Card.Description>Start a new assessment</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				<Button variant="outline" class="justify-start"><FilePlus />Exam</Button>
				<Button variant="outline" class="justify-start"><FilePlus />Test</Button>
				<Button variant="outline" class="justify-start"><FilePlus />Assignment</Button>
				<Button variant="outline" class="justify-start"><FilePlus />Practice set</Button>
			</Card.Content>
		</Card.Root>
	</div>
</main>
