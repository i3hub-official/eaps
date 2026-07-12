<!-- src/routes/lecturer/assessments/[id]/grade/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import FileText from '@lucide/svelte/icons/file-text';
	import Save from '@lucide/svelte/icons/save';

	let { data, form } = $props();

	let grades = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	function initGrades() {
		for (const session of data.pendingSessions) {
			for (const answer of session.answers) {
				grades[answer.answerId] = answer.currentMarks?.toString() ?? '';
			}
		}
	}

	$effect.pre(() => {
		initGrades();
	});

	function formatMarkInputName(answerId: string): string {
		return `grade_${answerId}`;
	}
</script>

<Topbar title={`Grade Essays — ${data.assessment.title}`} />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div>
		<h2 class="text-lg font-semibold">{data.assessment.title}</h2>
		<p class="text-sm text-muted-foreground">
			{data.assessment.course.code} · {data.assessment.course.title}
		</p>
	</div>

	{#if form?.success}
		<div class="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			<CheckCircle2 class="mt-0.5 size-4 shrink-0" />
			<div>
				<p class="font-semibold">Grades submitted</p>
				<p class="mt-0.5">
					{form.graded} essay{form.graded === 1 ? '' : 's'} graded
					{#if form.released > 0}
						· {form.released} result{form.released === 1 ? '' : 's'} auto-released
					{/if}
				</p>
			</div>
		</div>
	{:else if form?.error}
		<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	{#if data.allGraded}
		<Card class="flex flex-col items-center gap-3 p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-green-500/10 text-green-600">
				<CheckCircle2 class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">All essays graded</p>
				<p class="mt-1 text-sm text-muted-foreground">
					No pending ESSAY answers remain for this test. Results that are fully graded are automatically released.
				</p>
			</div>
		</Card>
	{:else}
		<p class="text-xs text-muted-foreground">
			{data.pendingSessions.length} student{data.pendingSessions.length === 1 ? '' : 's'} have pending ESSAY answer{data.pendingSessions.length === 1 ? '' : 's'} to grade.
		</p>

		<form method="POST" action="?/submitGrades" use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}>
			<div class="flex flex-col gap-6">
				{#each data.pendingSessions as session (session.sessionId)}
					<Card class="overflow-hidden p-0">
						<div class="flex items-center justify-between border-b bg-muted/40 px-6 py-3">
							<div>
								<p class="font-medium">{session.studentName}</p>
								<p class="text-xs text-muted-foreground">Matric: {session.matricNumber}</p>
							</div>
							<Badge variant="outline" class="font-normal">
								{session.essayCount} essay{session.essayCount === 1 ? '' : 's'}
							</Badge>
						</div>

						<div class="flex flex-col gap-4 p-6">
							{#each session.answers as answer (answer.answerId)}
								<div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
									<div class="flex items-start justify-between gap-2">
										<div class="flex flex-col gap-1">
											<p class="font-medium text-sm">{answer.questionBody}</p>
											<p class="text-xs text-muted-foreground">
												Full marks: {answer.marks} · Difficulty: <span class="capitalize">{answer.difficulty.toLowerCase()}</span>
											</p>
										</div>
									</div>

									<div class="rounded bg-background p-3">
										<p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
											{answer.textAnswer || '(No text provided)'}
										</p>
									</div>

									<div class="flex items-end gap-3">
										<div class="flex-1">
											<Label for={`grade_${answer.answerId}`} class="text-xs font-medium">
												Marks awarded
											</Label>
											<Input
												id={`grade_${answer.answerId}`}
												type="number"
												min="0"
												max={answer.marks}
												step="0.5"
												bind:value={grades[answer.answerId]}
												placeholder="0"
												class="mt-1"
											/>
										</div>
										<span class="text-sm text-muted-foreground">
											/ {answer.marks}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</Card>
				{/each}
			</div>

			<!-- Embed grades as JSON for form submission -->
			<input type="hidden" name="grades" value={JSON.stringify(grades)} />

			<div class="flex justify-end gap-2 pt-4">
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						<Save class="mr-2 size-4 animate-spin" />
						Submitting…
					{:else}
						<Save class="mr-2 size-4" />
						Submit all grades
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</main>