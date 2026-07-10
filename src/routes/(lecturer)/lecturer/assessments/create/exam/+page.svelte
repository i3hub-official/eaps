<!-- src/routes/(lecturer)/lecturer/assessments/create/exam/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { ArrowLeft, AlertCircle, HelpCircle, Building2 } from '@lucide/svelte/icons';

	let { data, form } = $props();

	let formData = $state({
		courseId: '',
		title: '',
		instructions: '',
		totalMarks: 70,
		passMark: 40,
		durationMinutes: 120,
		questionCount: 10,
		shuffleQuestions: true,
		shuffleOptions: true,
		requireFaceVerify: true,
		requireLiveness: true,
		fullscreenRequired: true,
		offlineEnabled: false,
		startDate: '',
		endDate: '',
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	const error = data?.error;

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
			const response = await fetch('/lecturer/assessments/create/exam', {
				method: 'POST',
				body: formDataObj,
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				window.location.href = `/lecturer/assessments/edit/${result.id}`;
			} else if (response.status === 400 || response.status === 403) {
				errors = result.errors || { error: result.error || 'Validation failed' };
			} else {
				errors = { error: result.error || 'Failed to create exam' };
			}
		} catch (err) {
			errors = { error: err instanceof Error ? err.message : 'Failed to create exam' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Exam — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Create Exam" description="Set up a new examination">
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
				<h3 class="text-lg font-semibold">Cannot create exam</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department before creating exams.' 
						: 'There was an error loading the exam creation form.'}
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
				<Card class="md:col-span-2">
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>General details about the exam</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="courseId">Course *</Label>
							<Select name="courseId" required>
								<SelectTrigger id="courseId" class={errors.courseId ? 'border-destructive' : ''}>
									<span class="truncate">
										{formData.courseId 
											? data.courses.find(c => c.id === formData.courseId)?.code + ' — ' + data.courses.find(c => c.id === formData.courseId)?.title
											: 'Select a course'}
									</span>
								</SelectTrigger>
								<SelectContent>
									{#each data.courses as course}
										<SelectItem 
											value={course.id}
											selected={course.id === formData.courseId}
											onclick={() => formData.courseId = course.id}
										>
											{course.code} — {course.title}
											<Badge variant="outline" class="ml-2 text-xs">
												{course.level} • {course.questionCount} questions
											</Badge>
										</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							{#if errors.courseId}
								<p class="text-sm text-destructive">{errors.courseId}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="title">Exam Title *</Label>
							<Input
								id="title"
								name="title"
								bind:value={formData.title}
								placeholder="e.g., CSC301 Final Examination"
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
								placeholder="Provide detailed instructions for students..."
								rows={4}
							/>
							<p class="text-xs text-muted-foreground">
								<HelpCircle class="inline size-3 mr-1" />
								Instructions will be shown to students before they start the exam
							</p>
						</div>
					</CardContent>
				</Card>

				<!-- Scoring & Timing -->
				<Card>
					<CardHeader>
						<CardTitle>Scoring & Timing</CardTitle>
						<CardDescription>Configure marks and time limits</CardDescription>
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
							<p class="text-xs text-muted-foreground">
								Recommended: 70 marks for final exams
							</p>
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
								Recommended: 40% of total marks
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
								Recommended: 120 minutes (2 hours)
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
							<p class="text-xs text-muted-foreground">
								Recommended: 10-15 questions
							</p>
							{#if errors.questionCount}
								<p class="text-sm text-destructive">{errors.questionCount}</p>
							{/if}
						</div>
					</CardContent>
				</Card>

				<!-- Scheduling -->
				<Card>
					<CardHeader>
						<CardTitle>Schedule</CardTitle>
						<CardDescription>When should the exam be available?</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="startDate">Start Date & Time</Label>
							<Input
								id="startDate"
								name="startDate"
								type="datetime-local"
								bind:value={formData.startDate}
							/>
						</div>

						<div class="space-y-2">
							<Label for="endDate">End Date & Time</Label>
							<Input
								id="endDate"
								name="endDate"
								type="datetime-local"
								bind:value={formData.endDate}
							/>
						</div>

						<div class="rounded-lg bg-muted/30 p-3">
							<p class="text-xs text-muted-foreground">
								<HelpCircle class="inline size-3 mr-1" />
								If left empty, the exam will be available immediately and have no end date.
							</p>
						</div>

						<div class="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
							<p class="text-xs text-yellow-700 dark:text-yellow-400">
								<AlertCircle class="inline size-3 mr-1" />
								Current academic session: <strong>{data.currentSession}</strong>
							</p>
						</div>
					</CardContent>
				</Card>

				<!-- Settings -->
				<Card class="md:col-span-2">
					<CardHeader>
						<CardTitle>Exam Settings</CardTitle>
						<CardDescription>Configure security and behavior</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

							<div class="flex items-center justify-between space-x-2">
								<div>
									<Label for="requireFaceVerify" class="font-medium">Face Verification</Label>
									<p class="text-xs text-muted-foreground">Require face verification</p>
								</div>
								<Switch
									id="requireFaceVerify"
									name="requireFaceVerify"
									checked={formData.requireFaceVerify}
									onchange={(e) => formData.requireFaceVerify = e.currentTarget.checked}
								/>
							</div>

							<div class="flex items-center justify-between space-x-2">
								<div>
									<Label for="requireLiveness" class="font-medium">Liveness Check</Label>
									<p class="text-xs text-muted-foreground">Detect live presence</p>
								</div>
								<Switch
									id="requireLiveness"
									name="requireLiveness"
									checked={formData.requireLiveness}
									onchange={(e) => formData.requireLiveness = e.currentTarget.checked}
								/>
							</div>

							<div class="flex items-center justify-between space-x-2">
								<div>
									<Label for="fullscreenRequired" class="font-medium">Fullscreen Required</Label>
									<p class="text-xs text-muted-foreground">Must be in fullscreen mode</p>
								</div>
								<Switch
									id="fullscreenRequired"
									name="fullscreenRequired"
									checked={formData.fullscreenRequired}
									onchange={(e) => formData.fullscreenRequired = e.currentTarget.checked}
								/>
							</div>

							<div class="flex items-center justify-between space-x-2">
								<div>
									<Label for="offlineEnabled" class="font-medium">Offline Mode</Label>
									<p class="text-xs text-muted-foreground">Allow offline access</p>
								</div>
								<Switch
									id="offlineEnabled"
									name="offlineEnabled"
									checked={formData.offlineEnabled}
									onchange={(e) => formData.offlineEnabled = e.currentTarget.checked}
								/>
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
						Create Exam
					</Button>
				</div>
			</div>
		</form>
	{/if}
</div>