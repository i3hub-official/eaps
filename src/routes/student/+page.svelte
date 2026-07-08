<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	const upcoming = [
		{ course: 'CSC 301 — Data Structures & Algorithms', type: 'Mid-Semester Exam', when: 'Tomorrow, 9:00 AM', duration: '90 min' },
		{ course: 'MTH 204 — Numerical Methods', type: 'Practice Test', when: 'Wed, 2:00 PM', duration: '45 min' },
		{ course: 'ENG 202 — Technical Writing', type: 'Assignment due', when: 'Fri, 11:59 PM', duration: '—' }
	];

	const courses = [
		{ code: 'CSC 301', name: 'Data Structures & Algorithms', progress: 72 },
		{ code: 'MTH 204', name: 'Numerical Methods', progress: 58 },
		{ code: 'ENG 202', name: 'Technical Writing', progress: 90 },
		{ code: 'PHY 210', name: 'Electromagnetism', progress: 40 }
	];
</script>

<Topbar title="Welcome back, Adaeze" description="Here's what's happening across your courses" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<Card.Root class="xl:col-span-2">
			<Card.Header class="flex-row items-center justify-between">
				<div>
					<Card.Title>Upcoming</Card.Title>
					<Card.Description>Tests, exams, and assignments due soon</Card.Description>
				</div>
				<CalendarClock class="size-4.5 text-muted-foreground" />
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#each upcoming as u (u.course)}
					<div class="flex items-center justify-between gap-3 rounded-md border p-3.5">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm font-medium">{u.course}</span>
							<span class="text-xs text-muted-foreground">{u.type} · {u.duration}</span>
						</div>
						<Badge>{u.when}</Badge>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Quick actions</Card.Title>
				<Card.Description>Jump back into your work</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				<Button variant="outline" class="justify-between"><span class="flex items-center gap-2"><ClipboardList class="size-4" />Continue assignment</span><ArrowRight /></Button>
				<Button variant="outline" class="justify-between"><span class="flex items-center gap-2"><BookOpen class="size-4" />Practice question bank</span><ArrowRight /></Button>
				<Separator class="my-1" />
				<p class="px-1 text-xs text-muted-foreground">
					Overall attendance this semester: <span class="font-medium text-foreground">96%</span>
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Your courses</Card.Title>
			<Card.Description>Progress across registered courses this semester</Card.Description>
		</Card.Header>
		<Card.Content class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each courses as c (c.code)}
				<div class="rounded-md border p-3.5">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium">{c.code} — {c.name}</span>
						<span class="font-mono text-xs text-muted-foreground">{c.progress}%</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div class="h-full rounded-full bg-primary" style="width: {c.progress}%"></div>
					</div>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</main>
 n