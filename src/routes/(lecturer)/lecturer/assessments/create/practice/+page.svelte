<!-- src/routes/(lecturer)/lecturer/assessments/create/practice/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { ArrowLeft, AlertCircle, HelpCircle, Users, Building2, GraduationCap } from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';

	let { data, form } = $props();

	let formData = $state({
		courseId: '',
		title: '',
		instructions: '',
		totalMarks: 100,
		passMark: 50,
		durationMinutes: 30,
		questionCount: 10,
		shuffleQuestions: true,
		shuffleOptions: true,
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	const error = data?.error;

	// ─── Dropdown States ──────────────────────────────────────────────────────
	let courseOpen = $state(false);
	let courseTriggerRef = $state<HTMLButtonElement>(null!);

	// ─── Computed ────────────────────────────────────────────────────────────
	const selectedCourse = $derived(
		data?.courses?.find((c: any) => c.id === formData.courseId)
	);
	const selectedCourseLabel = $derived(
		selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : 'Select a course'
	);

	// ─── Handlers ────────────────────────────────────────────────────────────
	function closeAndFocusCourse() {
		courseOpen = false;
		tick().then(() => {
			courseTriggerRef?.focus();
		});
	}

	function validateForm() {
		errors = {};
		if (!formData.courseId) errors.courseId = 'Course is required';
		if (!formData.title.trim()) errors.title = 'Title is required';
		if (formData.totalMarks <= 0) errors.totalMarks = 'Total marks must be greater than 0';
		if (formData.passMark < 0 || formData.passMark > formData.totalMarks) {
			errors.passMark = `Pass mark must be between 0 and ${formData.totalMarks}`;
		}
		if (formData.durationMinutes <= 0) errors.durationMinutes = 'Duration must be greater than 0';
		if (formData.questionCount <= 0) errors.questionCount = 'Question count must be greater than 0';
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!validateForm()) return;
		isSubmitting = true;
		
		const formElement = event.target as HTMLFormElement;
		const formDataObj = new FormData(formElement);
		
		try {
			const response = await fetch('/lecturer/assessments/create/practice', {
				method: 'POST',
				body: formDataObj,
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				window.location.href = `/lecturer/assessments/edit/${result.id}`;
			} else if (response.status === 400 || response.status === 403) {
				errors = result.errors || { error: result.error || 'Validation failed' };
			} else {
				errors = { error: result.error || 'Failed to create practice set' };
			}
		} catch (err) {
			errors = { error: err instanceof Error ? err.message : 'Failed to create practice set' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Practice Set — EAPS</title>
</svelte:head>

<Topbar title="Create Practice Set" description="Create a practice set for students to study">
	{#snippet actions()}
		<Button href="/lecturer/assessments" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back to Assessments
		</Button>
	{/snippet}
</Topbar>

<div class="p-6">
	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>

		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Building2 class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot create practice set</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'You have no assigned courses this semester. Contact your HOD.' 
						? 'Please contact your HOD to assign courses before creating practice sets.' 
						: 'There was an error loading the practice set creation form.'}
				</p>
				<Button variant="outline" class="mt-4" href="/lecturer/assessments">
					<ArrowLeft class="mr-2 size-4" />
					Back to Assessments
				</Button>
			</CardContent>
		</Card>
	{:else}
		<form method="POST" onsubmit={handleSubmit} class="space-y-6">
			{#if errors.error}
				<Alert variant="destructive">
					<AlertCircle class="size-4" />
					<AlertDescription>{errors.error}</AlertDescription>
				</Alert>
			{/if}

			<div class="grid gap-6 md:grid-cols-2">
				<!-- Basic Information -->
				<Card class="md:col-span-1">
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>General details about the practice set</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="courseId">Course *</Label>
							<Popover.Root bind:open={courseOpen}>
								<Popover.Trigger bind:ref={courseTriggerRef}>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="outline"
											class={cn(
												"w-full justify-between h-12 text-base font-normal",
												errors.courseId && "border-destructive"
											)}
											role="combobox"
											aria-expanded={courseOpen}
										>
											<span class="truncate">{selectedCourseLabel}</span>
											<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-[--radix-popover-trigger-width] p-0">
									<Command.Root>
										<Command.Input placeholder="Search courses..." />
										<Command.List>
											<Command.Empty>No course found.</Command.Empty>
											<Command.Group>
												{#each data?.courses || [] as course}
													<Command.Item
														value={course.code}
														onSelect={() => {
															formData.courseId = course.id;
															closeAndFocusCourse();
														}}
													>
														<CheckIcon
															class={cn(
																"mr-2 size-4",
																formData.courseId === course.id ? "opacity-100" : "opacity-0"
															)}
														/>
														{course.code} — {course.title}
														<Badge variant="outline" class="ml-2 text-xs">
															{course.level} • {course.questionCount} questions
														</Badge>
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
							{#if errors.courseId}
								<p class="text-sm text-destructive">{errors.courseId}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="title">Practice Title *</Label>
							<Input
								id="title"
								name="title"
								bind:value={formData.title}
								placeholder="e.g., CSC301 Practice Questions"
								class={errors.title ? 'border-destructive' : ''}
								required
							/>
							{#if errors.title}
								<p class="text-sm text-destructive">{errors.title}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="instructions">Instructions</Label>
							<Textarea
								id="instructions"
								name="instructions"
								bind:value={formData.instructions}
								placeholder="Provide instructions for students..."
								rows={3}
							/>
							<p class="text-xs text-muted-foreground">
								<HelpCircle class="inline size-3 mr-1" />
								Instructions will be shown to students before they start
							</p>
						</div>
					</CardContent>
				</Card>

				<!-- Scoring, Timing & Settings (Merged) -->
				<Card>
					<CardHeader>
						<CardTitle>Scoring, Timing & Settings</CardTitle>
						<CardDescription>Configure marks, time limits, and practice behavior</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="totalMarks">Total Marks</Label>
							<Input
								id="totalMarks"
								name="totalMarks"
								type="number"
								bind:value={formData.totalMarks}
								min="1"
								max="100"
								class={errors.totalMarks ? 'border-destructive' : ''}
								required
							/>
							{#if errors.totalMarks}
								<p class="text-sm text-destructive">{errors.totalMarks}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="passMark">Pass Mark (out of total)</Label>
							<Input
								id="passMark"
								name="passMark"
								type="number"
								bind:value={formData.passMark}
								min="0"
								max={formData.totalMarks}
								class={errors.passMark ? 'border-destructive' : ''}
								required
							/>
							<p class="text-xs text-muted-foreground">
								Recommended: 50% of total marks
							</p>
							{#if errors.passMark}
								<p class="text-sm text-destructive">{errors.passMark}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="durationMinutes">Duration (minutes)</Label>
							<Input
								id="durationMinutes"
								name="durationMinutes"
								type="number"
								bind:value={formData.durationMinutes}
								min="1"
								class={errors.durationMinutes ? 'border-destructive' : ''}
								required
							/>
							<p class="text-xs text-muted-foreground">
								Recommended: 30 minutes for practice
							</p>
							{#if errors.durationMinutes}
								<p class="text-sm text-destructive">{errors.durationMinutes}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="questionCount">Number of Questions</Label>
							<Input
								id="questionCount"
								name="questionCount"
								type="number"
								bind:value={formData.questionCount}
								min="1"
								class={errors.questionCount ? 'border-destructive' : ''}
								required
							/>
							{#if errors.questionCount}
								<p class="text-sm text-destructive">{errors.questionCount}</p>
							{/if}
						</div>

						<div class="pt-4 border-t space-y-3">
							<div class="flex items-center justify-between space-x-2">
								<div>
									<Label for="shuffleQuestions" class="font-medium">Shuffle Questions</Label>
									<p class="text-xs text-muted-foreground">Randomize question order</p>
								</div>
								<Switch
									id="shuffleQuestions"
									name="shuffleQuestions"
									checked={formData.shuffleQuestions}
									onchange={(e) => formData.shuffleQuestions = e.currentTarget.checked}
								/>
							</div>

							<div class="flex items-center justify-between space-x-2">
								<div>
									<Label for="shuffleOptions" class="font-medium">Shuffle Options</Label>
									<p class="text-xs text-muted-foreground">Randomize option order</p>
								</div>
								<Switch
									id="shuffleOptions"
									name="shuffleOptions"
									checked={formData.shuffleOptions}
									onchange={(e) => formData.shuffleOptions = e.currentTarget.checked}
								/>
							</div>
						</div>

						<div class="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 mt-4">
							<div class="flex items-start gap-2">
								<GraduationCap class="size-4 text-blue-600 dark:text-blue-400 mt-0.5" />
								<div>
									<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Practice Features</p>
									<ul class="text-xs text-blue-600 dark:text-blue-300 mt-1 space-y-1 list-disc list-inside">
										<li>Unlimited attempts for students</li>
										<li>Instant feedback and results</li>
										<li>No face verification required</li>
										<li>No time restrictions</li>
										<li>Shuffle questions and options</li>
									</ul>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Submit -->
				<div class="md:col-span-2 flex items-center justify-end gap-4">
					<Button variant="outline" href="/lecturer/assessments">Cancel</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="animate-spin mr-2">⏳</span>
						{/if}
						Create Practice Set
					</Button>
				</div>
			</div>
		</form>
	{/if}
</div>