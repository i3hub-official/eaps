<!-- src/routes/(lecturer)/lecturer/grade/[id]/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import {
		ChevronLeft,
		Save,
		Zap,
		User,
		GraduationCap,
		BookOpen,
		Clock,
		CheckCircle,
		XCircle,
		AlertCircle,
		LoaderCircle,
		ArrowLeft,
		FileText,
		Calendar,
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';

	let { data, form } = $props();

	const { answer, question, student, grader, assessment, session, isAutoGradable } = data;

	let marksInput = $state(answer.marksAwarded?.toString() || '');
	let isCorrect = $state(answer.isCorrect ?? false);
	let isSubmitting = $state(false);
	let isAutoGrading = $state(false);
	let showExplanation = $state(false);

	function getTypeLabel(type: string) {
		const labels: Record<string, string> = {
			SINGLE_CHOICE: 'Single Choice',
			MULTIPLE_CHOICE: 'Multiple Choice',
			TRUE_FALSE: 'True/False',
			FILL_BLANK: 'Fill Blank',
			MATCHING: 'Matching',
			ESSAY: 'Essay',
			ORDERING: 'Ordering',
		};
		return labels[type] || type;
	}

	function getTypeColor(type: string) {
		const colors: Record<string, string> = {
			SINGLE_CHOICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			MULTIPLE_CHOICE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
			TRUE_FALSE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
			FILL_BLANK: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
			MATCHING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			ESSAY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			ORDERING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
		};
		return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
	}

	function getDifficultyLabel(difficulty: string) {
		const labels: Record<string, string> = {
			EASY: 'Easy',
			MEDIUM: 'Medium',
			HARD: 'Hard',
			EXPERT: 'Expert',
		};
		return labels[difficulty] || difficulty;
	}

	function getOptionLetter(index: number) {
		return String.fromCharCode(65 + index);
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { label: string; variant: string }> = {
			PENDING: { label: 'Pending', variant: 'secondary' },
			IN_PROGRESS: { label: 'In Progress', variant: 'default' },
			PAUSED: { label: 'Paused', variant: 'outline' },
			SUBMITTED: { label: 'Submitted', variant: 'default' },
			TIMED_OUT: { label: 'Timed Out', variant: 'destructive' },
			DISQUALIFIED: { label: 'Disqualified', variant: 'destructive' },
		};
		return variants[status] || { label: status, variant: 'secondary' };
	}

	async function handleAutoGrade() {
		if (isAutoGrading) return;
		isAutoGrading = true;

		const fd = new FormData();
		fd.set('answerId', answer.id);

		try {
			const res = await fetch('?/autoGrade', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				toast.success(result.message || 'Auto-graded successfully');
				marksInput = result.marks.toString();
				// Update isCorrect based on auto-grade result
				await invalidateAll();
			} else {
				toast.error(result.error || 'Failed to auto-grade');
			}
		} catch (err) {
			toast.error('Failed to auto-grade');
		} finally {
			isAutoGrading = false;
		}
	}
</script>

<svelte:head>
	<title>Grade Submission — EA Proctoring System</title>
</svelte:head>

<Topbar 
	title="Grade Submission" 
	description={`${student.name} • ${assessment.courseCode}`}
>
	{#snippet actions()}
		<Button href="/lecturer/grade" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back to Submissions
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if form?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	<!-- Student & Assessment Info -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Student</CardTitle>
				<User class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-sm font-medium">{student.name}</div>
				<p class="text-xs text-muted-foreground font-mono">{student.matricNumber}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Assessment</CardTitle>
				<FileText class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-sm font-medium truncate" title={assessment.title}>{assessment.title}</div>
				<p class="text-xs text-muted-foreground">{assessment.courseCode}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Session Status</CardTitle>
				<Clock class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<Badge variant={getStatusBadge(session.status).variant}>
					{getStatusBadge(session.status).label}
				</Badge>
				<p class="text-xs text-muted-foreground mt-1">
					Attempt {session.attemptNumber}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Submitted</CardTitle>
				<Calendar class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-sm">
					{session.submittedAt ? formatDate(session.submittedAt) : 'Not submitted'}
				</div>
				<p class="text-xs text-muted-foreground">
					Started {formatDate(session.startedAt)}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Question -->
	<Card>
		<CardHeader>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<CardTitle>Question</CardTitle>
					<CardDescription>
						{getTypeLabel(question.type)} • {getDifficultyLabel(question.difficulty)} • {question.marks} marks
					</CardDescription>
				</div>
				<div class="flex gap-2">
					<Badge class={getTypeColor(question.type)}>
						{getTypeLabel(question.type)}
					</Badge>
					<Badge variant="outline">{getDifficultyLabel(question.difficulty)}</Badge>
					<Badge variant="outline">{question.marks} marks</Badge>
				</div>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="rounded-lg bg-muted/30 p-4">
				<p class="text-base font-medium">{question.body}</p>
			</div>

			{#if question.options.length > 0}
				<div class="space-y-2">
					<h4 class="text-sm font-medium text-muted-foreground">Options</h4>
					{#each question.options as option, index}
						<div class={cn(
							"flex items-start gap-3 rounded-lg border p-3 transition-colors",
							option.isSelected && option.isCorrect ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "",
							option.isSelected && !option.isCorrect ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "",
							!option.isSelected && option.isCorrect ? "border-green-300/50 bg-green-50/30 dark:bg-green-950/10" : "",
							!option.isSelected && !option.isCorrect ? "hover:bg-muted/30" : ""
						)}>
							<div class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
								{getOptionLetter(index)}
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm break-words">{option.body}</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								{#if option.isSelected}
									<Badge variant="default" class="gap-1">
										<CheckCircle class="size-3" />
										Selected
									</Badge>
								{/if}
								{#if option.isCorrect}
									<Badge variant="outline" class="gap-1 text-green-600 border-green-400">
										<CheckCircle class="size-3" />
										Correct
									</Badge>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if question.explanation}
				<div class="mt-4">
					<Button variant="ghost" size="sm" onclick={() => showExplanation = !showExplanation}>
						{#if showExplanation}
							Hide Explanation
						{:else}
							Show Explanation
						{/if}
					</Button>
					{#if showExplanation}
						<div class="mt-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 p-3">
							<p class="text-sm text-blue-700 dark:text-blue-400">{question.explanation}</p>
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Student Answer -->
	<Card>
		<CardHeader>
			<CardTitle>Student's Answer</CardTitle>
			<CardDescription>
				The student's selected response
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if answer.textAnswer}
				<div class="rounded-lg bg-muted/30 p-4">
					<p class="text-sm font-mono whitespace-pre-wrap break-words">{answer.textAnswer}</p>
				</div>
			{:else if answer.selectedOptions && answer.selectedOptions.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each answer.selectedOptions as optId}
						{@const option = question.options.find(o => o.id === optId)}
						<Badge variant="outline" class="text-sm py-1 px-3">
							{option ? option.body : optId}
						</Badge>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No answer provided</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Grading -->
	<Card>
		<CardHeader>
			<CardTitle>Grade</CardTitle>
			<CardDescription>
				{answer.isManualGraded ? 'Manually graded' : 'Not yet graded'}
				{#if answer.gradedAt}
					• {formatDate(answer.gradedAt)} by {grader.name}
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/grade" use:enhance={({ result }) => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message || 'Grade saved');
						await invalidateAll();
					}
					if (result.type === 'failure') {
						toast.error(result.data?.error || 'Failed to save grade');
					}
					await update();
				};
			}} class="space-y-4">
				<input type="hidden" name="answerId" value={answer.id} />

				<div class="grid gap-4 sm:grid-cols-3">
					<div class="space-y-2">
						<Label for="marks">Marks Awarded</Label>
						<Input
							id="marks"
							name="marks"
							type="number"
							step="0.5"
							min="0"
							max={question.marks}
							bind:value={marksInput}
							placeholder={`0 - ${question.marks}`}
							disabled={answer.isManualGraded && answer.gradedAt}
						/>
						<p class="text-xs text-muted-foreground">
							Max: {question.marks} marks
						</p>
					</div>

					<div class="space-y-2">
						<Label for="isCorrect">Correct</Label>
						<select
							id="isCorrect"
							name="isCorrect"
							bind:value={isCorrect}
							class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							disabled={answer.isManualGraded && answer.gradedAt}
						>
							<option value="true">✅ Correct</option>
							<option value="false">❌ Incorrect</option>
						</select>
					</div>

					<div class="space-y-2">
						<Label for="isManualGraded">Status</Label>
						<input
							type="hidden"
							name="isManualGraded"
							value="true"
						/>
						<div class="flex h-10 items-center px-3 text-sm text-muted-foreground">
							{answer.isManualGraded && answer.gradedAt ? 'Already Graded' : 'Manual Grading'}
						</div>
					</div>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button 
						type="submit" 
						disabled={isSubmitting || (answer.isManualGraded && answer.gradedAt)}
						class="gap-2"
					>
						{#if isSubmitting}
							<LoaderCircle class="size-4 animate-spin" />
							Saving...
						{:else}
							<Save class="size-4" />
							Save Grade
						{/if}
					</Button>

					{#if isAutoGradable && !(answer.isManualGraded && answer.gradedAt)}
						<Button 
							type="button" 
							variant="outline" 
							onclick={handleAutoGrade}
							disabled={isAutoGrading}
							class="gap-2"
						>
							{#if isAutoGrading}
								<LoaderCircle class="size-4 animate-spin" />
								Auto-grading...
							{:else}
								<Zap class="size-4" />
								Auto-Grade
							{/if}
						</Button>
					{/if}
				</div>
			</form>

			{#if answer.isManualGraded && answer.gradedAt}
				<div class="mt-4 rounded-lg bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/30 p-3">
					<div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
						<CheckCircle class="size-4" />
						<span>Already graded on {formatDate(answer.gradedAt)}</span>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Summary -->
	<Card class="bg-muted/30 border-border">
		<CardContent class="py-4">
			<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
				<span class="text-muted-foreground">
					Question {assessment.totalQuestions ? '1 of ' + assessment.totalQuestions : ''}
				</span>
				<div class="flex flex-wrap items-center gap-4">
					<span class="flex items-center gap-1.5">
						<FileText class="size-3.5 text-muted-foreground" />
						{assessment.type}
					</span>
					<span class="flex items-center gap-1.5">
						<BookOpen class="size-3.5 text-muted-foreground" />
						{assessment.courseCode}
					</span>
					<span class="flex items-center gap-1.5">
						<GraduationCap class="size-3.5 text-muted-foreground" />
						{student.name}
					</span>
				</div>
			</div>
		</CardContent>
	</Card>
</main>