<!-- src/routes/student/assignments/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	let { data, form } = $props();

	let startingId = $state<string | null>(null);

	function formatDate(d: string | Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function dueBadge(a: (typeof data.assignments)[number]) {
		if (!a.dueDate) return { label: 'No due date', variant: 'outline' as const };
		if (a.submission) return { label: 'Submitted', variant: 'default' as const };
		if (a.isPastDue && a.isLate) return { label: 'Late submission', variant: 'secondary' as const };
		if (a.isPastDue) return { label: 'Past due', variant: 'destructive' as const };
		return { label: `Due ${formatDate(a.dueDate)}`, variant: 'outline' as const };
	}
</script>

<Topbar title="Assignments" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if form?.startError}
		<div
			class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{form.startError}</span>
		</div>
	{/if}

	{#if data.assignments.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<ClipboardList class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No assignments yet</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Assignments from your lecturers will show up here once published.
				</p>
			</div>
		</Card>
	{:else}
		<div class="flex flex-col gap-3">
			{#each data.assignments as a (a.id)}
				{@const badge = dueBadge(a)}
				<Card class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex flex-col gap-1.5">
						<div class="flex flex-wrap items-center gap-2">
							{#if a.course}
								<Badge variant="secondary" class="font-normal">{a.course.code}</Badge>
							{/if}
							<p class="font-semibold leading-snug">{a.title}</p>
						</div>

						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
							<span class="flex items-center gap-1">
								<CalendarClock class="size-3.5" />
								{a.dueDate ? `Due ${formatDate(a.dueDate)}` : 'No due date'}
							</span>
							<span>{a.questionCount} question{a.questionCount === 1 ? '' : 's'}</span>
							<span class="flex items-center gap-1">
								<RotateCcw class="size-3.5" />
								{a.attemptsUsed}/{a.maxAttempts} attempts used
							</span>
							{#if a.isLate && a.latePenaltyPercent}
								<span class="text-destructive">−{a.latePenaltyPercent}% late penalty</span>
							{/if}
						</div>

						{#if a.result?.isReleased}
							<div class="mt-1 flex items-center gap-2 text-sm">
								<CheckCircle2 class="size-4 text-primary" />
								<span class="font-medium">
									{a.result.marksObtained}/{a.result.totalMarks} ({a.result.percentage}%)
								</span>
								{#if a.result.grade}
									<Badge variant="outline" class="font-normal">{a.result.grade}</Badge>
								{/if}
							</div>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<Badge variant={badge.variant} class="whitespace-nowrap">{badge.label}</Badge>

						{#if a.submission}
							<span class="text-xs text-muted-foreground">
								Submitted {formatDate(a.submission.submittedAt)}
							</span>
						{:else}
							<form
								method="POST"
								action="?/start"
								use:enhance={() => {
									startingId = a.id;
									return async ({ update }) => {
										await update();
										startingId = null;
									};
								}}
							>
								<input type="hidden" name="assessmentId" value={a.id} />
								<Button
									type="submit"
									size="sm"
									disabled={(!a.canStart && !a.inProgressSessionId) || startingId === a.id}
								>
									{#if startingId === a.id}
										Starting…
									{:else if a.inProgressSessionId}
										Resume
									{:else if a.canStart}
										Start
									{:else}
										Unavailable
									{/if}
								</Button>
							</form>
						{/if}
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</main>