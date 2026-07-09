<!-- src/routes/student/attendance/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Clock from '@lucide/svelte/icons/clock';
	import FileQuestion from '@lucide/svelte/icons/file-question';

	let { data } = $props();

	function formatDate(d: string | Date) {
		return new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' });
	}

	const statusConfig: Record<
		string,
		{ label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }
	> = {
		PRESENT: { label: 'Present', variant: 'default', icon: CheckCircle2 },
		LATE: { label: 'Late', variant: 'secondary', icon: Clock },
		EXCUSED: { label: 'Excused', variant: 'outline', icon: FileQuestion },
		ABSENT: { label: 'Absent', variant: 'destructive', icon: XCircle }
	};

	function percentColor(pct: number | null) {
		if (pct === null) return 'text-muted-foreground';
		if (pct >= 75) return 'text-primary';
		if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
		return 'text-destructive';
	}
</script>

<Topbar title="Attendance" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data.noActiveSession}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<CalendarCheck class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No active semester</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Attendance records will appear once a session and semester are active.
				</p>
			</div>
		</Card>
	{:else if data.courses.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<CalendarCheck class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No attendance records yet</p>
				<p class="mt-1 text-sm text-muted-foreground">
					You need an approved course registration this semester before attendance can be tracked.
				</p>
			</div>
		</Card>
	{:else}
		<p class="text-sm text-muted-foreground">
			{data.session?.name} — {data.semester?.type.charAt(0)}{data.semester?.type.slice(1).toLowerCase()} Semester
		</p>

		<Accordion.Root type="multiple" class="flex flex-col gap-3">
			{#each data.courses as course (course.courseId)}
				<Accordion.Item value={course.courseId} class="rounded-lg border px-4">
					<Accordion.Trigger class="hover:no-underline">
						<div class="flex flex-1 flex-wrap items-center justify-between gap-3 pr-2">
							<div class="flex items-center gap-2">
								<Badge variant="secondary" class="font-normal">{course.courseCode}</Badge>
								<span class="text-sm font-medium">{course.courseTitle}</span>
							</div>
							<div class="flex items-center gap-3 text-sm">
								<span class="text-muted-foreground">
									{course.presentCount}/{course.totalSessions} classes
								</span>
								{#if course.attendancePercent !== null}
									<span class="font-semibold {percentColor(course.attendancePercent)}">
										{course.attendancePercent}%
									</span>
								{/if}
							</div>
						</div>
					</Accordion.Trigger>
					<Accordion.Content>
						{#if course.records.length === 0}
							<p class="py-4 text-sm text-muted-foreground">
								No attendance sessions have been recorded for this course yet.
							</p>
						{:else}
							<div class="flex flex-col divide-y">
								{#each course.records as record (record.attendanceSessionId)}
									{@const config = record.status ? statusConfig[record.status] : null}
									<div class="flex items-center justify-between gap-3 py-2.5 text-sm">
										<div class="flex flex-col">
											<span class="font-medium">{record.title ?? formatDate(record.date)}</span>
											<span class="text-xs text-muted-foreground">{formatDate(record.date)}</span>
											{#if record.note}
												<span class="text-xs italic text-muted-foreground">{record.note}</span>
											{/if}
										</div>
										{#if config}
											{@const Icon = config.icon}
											<Badge variant={config.variant} class="gap-1">
												<Icon class="size-3" />
												{config.label}
											</Badge>
										{:else}
											<Badge variant="outline">Not marked</Badge>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{/if}
</main>