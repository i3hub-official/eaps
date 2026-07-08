<script lang="ts">
	import { Topbar, StatCard } from '$lib/components/dashboard';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Users from '@lucide/svelte/icons/users';
	import Radio from '@lucide/svelte/icons/radio';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Download from '@lucide/svelte/icons/download';

	const stats = [
		{ label: 'Enrolled students', value: '18,204', delta: '+2.1% this session', deltaTone: 'up' as const, icon: Users, accent: 'primary' as const },
		{ label: 'Active exam sessions', value: '6', delta: '3 colleges live now', deltaTone: 'neutral' as const, icon: Radio, accent: 'primary' as const },
		{ label: 'Flagged incidents (24h)', value: '3', delta: '−2 vs yesterday', deltaTone: 'down' as const, icon: TriangleAlert, accent: 'danger' as const },
		{ label: 'Avg. attendance', value: '94.8%', delta: '+0.6pt this term', deltaTone: 'up' as const, icon: CalendarCheck, accent: 'gold' as const }
	];

	const liveSessions = [
		{ course: 'CSC 301 — Data Structures', college: 'Physical Sciences', candidates: 214, status: 'in-progress' as const },
		{ course: 'AGR 210 — Soil Science', college: 'Agriculture', candidates: 168, status: 'in-progress' as const },
		{ course: 'ECO 105 — Microeconomics', college: 'Management Sciences', candidates: 302, status: 'ending-soon' as const },
		{ course: 'BIO 202 — Genetics', college: 'Biological Sciences', candidates: 96, status: 'flagged' as const }
	];

	const sessionBadge = {
		'in-progress': { label: 'In progress', variant: 'secondary' as const },
		'ending-soon': { label: 'Ending soon', variant: 'outline' as const },
		flagged: { label: 'Attention needed', variant: 'destructive' as const }
	};

	const auditLog = [
		{ time: '09:42:11', actor: 'E. Nwosu (Exam Officer)', action: 'Published exam', target: 'CSC 301 — Mid-Semester Exam', ip: '10.20.4.12' },
		{ time: '09:38:57', actor: 'System', action: 'Auto-locked session', target: 'Student ID 20211045 — device mismatch', ip: '—' },
		{ time: '09:15:03', actor: 'F. Aliyu (Invigilator)', action: 'Flagged candidate', target: 'ECO 105 — tab switch detected', ip: '10.20.7.88' },
		{ time: '08:52:40', actor: 'Admin (You)', action: 'Updated department', target: 'Dept. of Crop Science', ip: '10.20.1.4' },
		{ time: '08:30:19', actor: 'S. Bello (Lecturer)', action: 'Uploaded question bank', target: 'BIO 202 — 120 questions (CSV)', ip: '10.20.9.21' }
	];
</script>

<Topbar title="Admin overview" description="Institution-wide snapshot across colleges and active examinations" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each stats as s (s.label)}
			<StatCard label={s.label} value={s.value} delta={s.delta} deltaTone={s.deltaTone} icon={s.icon} accent={s.accent} />
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<Card.Root class="xl:col-span-2">
			<Card.Header class="flex-row items-center justify-between">
				<div>
					<Card.Title>Recent audit activity</Card.Title>
					<Card.Description>Latest system and staff actions across the platform</Card.Description>
				</div>
				<Button variant="outline" size="sm"><Download />Export</Button>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Time</Table.Head>
							<Table.Head>Actor</Table.Head>
							<Table.Head>Action</Table.Head>
							<Table.Head>Target</Table.Head>
							<Table.Head>IP</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each auditLog as row (row.time)}
							<Table.Row>
								<Table.Cell class="font-mono text-xs text-muted-foreground">{row.time}</Table.Cell>
								<Table.Cell class="font-medium">{row.actor}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{row.action}</Table.Cell>
								<Table.Cell>{row.target}</Table.Cell>
								<Table.Cell class="font-mono text-xs text-muted-foreground">{row.ip}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Live exam sessions</Card.Title>
				<Card.Description>Real-time snapshot from invigilation feeds</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#each liveSessions as s (s.course)}
					<div class="flex flex-col gap-1.5 rounded-md border p-3">
						<div class="flex items-start justify-between gap-2">
							<span class="text-sm font-medium">{s.course}</span>
							<Badge variant={sessionBadge[s.status].variant}>{sessionBadge[s.status].label}</Badge>
						</div>
						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span>{s.college}</span>
							<span class="font-mono">{s.candidates} candidates</span>
						</div>
					</div>
				{/each}
				<Button variant="ghost" size="sm" class="w-full">View all sessions</Button>
			</Card.Content>
		</Card.Root>
	</div>
</main>
