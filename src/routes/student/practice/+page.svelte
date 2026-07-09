<!-- src/routes/student/practice/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Clock from '@lucide/svelte/icons/clock';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	let { data, form } = $props();

	let startingId = $state<string | null>(null);
</script>

<Topbar title="Practice" />

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

	{#if data.practiceAssessments.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<Dumbbell class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No practice tests available</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Check back once your lecturers publish practice material for your courses.
				</p>
			</div>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.practiceAssessments as a (a.id)}
				<Card class="flex flex-col gap-4 p-5">
					<div class="flex items-start justify-between gap-2">
						<div>
							{#if a.course}
								<Badge variant="secondary" class="mb-1.5 font-normal">{a.course.code}</Badge>
							{/if}
							<p class="font-semibold leading-snug">{a.title}</p>
						</div>
					</div>

					<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
						<span class="flex items-center gap-1">
							<Clock class="size-3.5" />
							{a.durationMinutes} min
						</span>
						<span>{a.questionCount} question{a.questionCount === 1 ? '' : 's'}</span>
						<span class="flex items-center gap-1">
							<RotateCcw class="size-3.5" />
							{a.attemptsUsed}/{a.maxAttempts >= 999 ? '∞' : a.maxAttempts} attempts used
						</span>
					</div>

					{#if a.lastResult}
						<div class="rounded-md bg-muted px-3 py-2 text-sm">
							<span class="text-muted-foreground">Last score: </span>
							<span class="font-medium">
								{a.lastResult.marksObtained}/{a.lastResult.totalMarks} ({a.lastResult.percentage}%)
							</span>
							{#if a.lastResult.grade}
								<Badge variant="outline" class="ml-2 font-normal">{a.lastResult.grade}</Badge>
							{/if}
						</div>
					{/if}

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
						class="mt-auto"
					>
						<input type="hidden" name="assessmentId" value={a.id} />
						<Button
							type="submit"
							class="w-full"
							disabled={(!a.canStart && !a.inProgressSessionId) || startingId === a.id}
						>
							{#if startingId === a.id}
								Starting…
							{:else if a.inProgressSessionId}
								Resume attempt
							{:else if a.canStart}
								Start practice
							{:else}
								No attempts left
							{/if}
						</Button>
					</form>
				</Card>
			{/each}
		</div>
	{/if}
</main>