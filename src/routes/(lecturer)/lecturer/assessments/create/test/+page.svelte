<!-- src/routes/(lecturer)/lecturer/assessments/create/test/+page.svelte -->
<script lang="ts">
import { invalidateAll, goto } from '$app/navigation';
import { deserialize } from '$app/forms'; 
import { toast } from 'svelte-sonner';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import { ArrowLeft, AlertCircle, HelpCircle, Calendar, Shield, Building2, Search, X, Upload, FileText, Database, Sparkles } from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';

	let { data, form } = $props();

	// ─── Presets ────────────────────────────────────────────────────────────
	type Preset = {
		id: string;
		label: string;
		description: string;
		totalMarks: number;
		passMark: number;
		durationMinutes: number;
		questionCount: number;
		shuffleQuestions: boolean;
		shuffleOptions: boolean;
		requireFaceVerify: boolean;
		fullscreenRequired: boolean;
		scheduleOffsetDays: number;
		scheduleWindowDays: number;
	};

	const presets: Preset[] = [
		{
			id: 'quick-quiz',
			label: 'Quick Quiz',
			description: 'Short, low-stakes check — 10 questions, 15 mins',
			totalMarks: 10,
			passMark: 5,
			durationMinutes: 15,
			questionCount: 10,
			shuffleQuestions: true,
			shuffleOptions: true,
			requireFaceVerify: false,
			fullscreenRequired: false,
			scheduleOffsetDays: 0,
			scheduleWindowDays: 1,
		},
		{
			id: 'standard-test',
			label: 'Standard Test',
			description: 'Typical in-course test — 15 questions, 30 mins',
			totalMarks: 30,
			passMark: 18,
			durationMinutes: 30,
			questionCount: 15,
			shuffleQuestions: true,
			shuffleOptions: true,
			requireFaceVerify: true,
			fullscreenRequired: true,
			scheduleOffsetDays: 2,
			scheduleWindowDays: 3,
		},
		{
			id: 'extended-test',
			label: 'Extended Test',
			description: 'Longer coverage — 25 questions, 60 mins',
			totalMarks: 50,
			passMark: 30,
			durationMinutes: 60,
			questionCount: 25,
			shuffleQuestions: true,
			shuffleOptions: true,
			requireFaceVerify: true,
			fullscreenRequired: true,
			scheduleOffsetDays: 3,
			scheduleWindowDays: 5,
		},
		{
			id: 'high-security',
			label: 'High-Security Exam',
			description: 'Strict proctoring — face verify + fullscreen enforced',
			totalMarks: 50,
			passMark: 30,
			durationMinutes: 45,
			questionCount: 20,
			shuffleQuestions: true,
			shuffleOptions: true,
			requireFaceVerify: true,
			fullscreenRequired: true,
			scheduleOffsetDays: 5,
			scheduleWindowDays: 2,
		},
	];

	let selectedPresetId = $state<string | null>(null);

	function toLocalDatetimeInputValue(date: Date): string {
		const tzOffsetMs = date.getTimezoneOffset() * 60000;
		return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
	}

	function applyPreset(preset: Preset) {
		selectedPresetId = preset.id;
		formData.totalMarks = preset.totalMarks;
		formData.passMark = preset.passMark;
		formData.durationMinutes = preset.durationMinutes;
		formData.questionCount = preset.questionCount;
		formData.shuffleQuestions = preset.shuffleQuestions;
		formData.shuffleOptions = preset.shuffleOptions;
		formData.requireFaceVerify = preset.requireFaceVerify;
		formData.fullscreenRequired = preset.fullscreenRequired;

		const now = new Date();
		const start = new Date(now.getTime() + preset.scheduleOffsetDays * 24 * 60 * 60 * 1000);
		const end = new Date(start.getTime() + preset.scheduleWindowDays * 24 * 60 * 60 * 1000);
		formData.startDate = toLocalDatetimeInputValue(start);
		formData.endDate = toLocalDatetimeInputValue(end);

		if (Object.keys(errors).length > 0) validateForm();
		toast.success(`Applied "${preset.label}" preset`);
	}
let formData = $state({
		courseId: '',
		title: '',
		instructions: '',
		totalMarks: 30,
		passMark: 18,
		durationMinutes: 30,
		questionCount: 15,
		shuffleQuestions: true,
		shuffleOptions: true,
		requireFaceVerify: true,
		fullscreenRequired: true,
		startDate: '',
		endDate: '',
		selectedQuestions: [] as string[],

		// ─── Attempts & Retakes ─────────────────────────────────────────
		maxAttempts: 1,
		paperVariants: 1,
		allowRetakes: false,
		retakeDelayMinutes: 0,
		showPreviousAttempts: false,
		bestScoreOnly: true,
		reviewPreviousAttempts: false,
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let isUploading = $state(false);
	let uploadSuccess = $state<{ imported: number; errors?: string[] } | null>(null);
	let uploadDialogOpen = $state(false);

	// ─── Question Bank Dialog ──────────────────────────────────────────────
	let questionBankOpen = $state(false);
	let bankSearchQuery = $state('');
	let bankFilterType = $state('all');
	let bankFilterDifficulty = $state('all');

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

	const bankFilteredQuestions = $derived(
		(data?.bankQuestions || []).filter((q: any) => {
			const matchesCourse = !formData.courseId || q.courseId === formData.courseId;
			const matchesSearch = q.body.toLowerCase().includes(bankSearchQuery.toLowerCase());
			const matchesType = bankFilterType === 'all' || q.type === bankFilterType;
			const matchesDifficulty = bankFilterDifficulty === 'all' || q.difficulty === bankFilterDifficulty;
			return matchesCourse && matchesSearch && matchesType && matchesDifficulty;
		})
	);

	let previousCourseId = formData.courseId;
	$effect(() => {
		if (formData.courseId !== previousCourseId) {
			if (previousCourseId !== '' && formData.selectedQuestions.length > 0) {
				formData.selectedQuestions = [];
				toast.info('Selected questions cleared — course changed');
			}
			previousCourseId = formData.courseId;
		}
	});

	// ─── Handlers ────────────────────────────────────────────────────────────
	function closeAndFocusCourse() {
		courseOpen = false;
		tick().then(() => courseTriggerRef?.focus());
	}

	function toggleQuestionSelection(questionId: string) {
		const index = formData.selectedQuestions.indexOf(questionId);
		if (index === -1) {
			formData.selectedQuestions = [...formData.selectedQuestions, questionId];
		} else {
			formData.selectedQuestions = formData.selectedQuestions.filter((id) => id !== questionId);
		}
	}

	function selectAllBankQuestions() {
		formData.selectedQuestions = bankFilteredQuestions.map((q: any) => q.id);
	}

	function clearAllBankQuestions() {
		formData.selectedQuestions = [];
	}

	function openBankDialog() {
		if (!formData.courseId) {
			errors = { ...errors, courseId: 'Select a course before choosing questions from the bank' };
			toast.error('Select a course before choosing questions from the bank');
			return;
		}
		questionBankOpen = true;
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !formData.courseId) {
			const msg = formData.courseId ? 'Select a file' : 'Select a course first';
			errors = { file: msg };
			toast.error(msg);
			return;
		}

		const validTypes = ['.json', '.txt'];
		const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
		if (!validTypes.includes(fileExt)) {
			errors = { file: 'Only .json and .txt files are supported' };
			toast.error('Only .json and .txt files are supported');
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			errors = { file: 'File size must be less than 5MB' };
			toast.error('File size must be less than 5MB');
			return;
		}

		isUploading = true;
		uploadSuccess = null;
		errors = {};

		const doUpload = async () => {
			const formDataObj = new FormData();
			formDataObj.append('courseId', formData.courseId);
			formDataObj.append('file', file);

			const response = await fetch('/lecturer/question-bank/import', {
				method: 'POST',
				body: formDataObj,
			});

			const result = await response.json();

			if ((response.ok || result.success) && result.imported > 0) {
				uploadSuccess = { imported: result.imported || 0, errors: result.errors };
				target.value = '';
				await invalidateAll();
				uploadDialogOpen = false;
				return result;
			}

			throw new Error(result.error || 'Import failed. Please check your file format.');
		};

		toast.promise(doUpload(), {
			loading: 'Importing questions…',
			success: (result: any) =>
				`Imported ${result.imported} question(s)${result.errors?.length ? ` — ${result.errors.length} row(s) had errors` : ''}`,
			error: (err) => {
				errors = { file: err instanceof Error ? err.message : 'Import failed' };
				return err instanceof Error ? err.message : 'Import failed';
			},
		});

		try {
			await doUpload();
		} catch {
			// surfaced via toast.promise
		} finally {
			isUploading = false;
		}
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
		if (formData.selectedQuestions.length === 0) {
			errors.questions = 'At least one question must be selected';
		} else if (formData.selectedQuestions.length < formData.questionCount) {
			errors.questions = `You selected ${formData.selectedQuestions.length} question(s) but Question Count is ${formData.questionCount}. Select at least ${formData.questionCount}, or lower Question Count.`;
		}

		// ─── Attempts & Retakes ─────────────────────────────────────────
		if (formData.maxAttempts <= 0) errors.maxAttempts = 'Max attempts must be greater than 0';
		if (formData.paperVariants <= 0) errors.paperVariants = 'Paper variants must be greater than 0';
		if (formData.allowRetakes && formData.maxAttempts <= 1) {
			errors.maxAttempts = 'Set Max Attempts above 1 to allow retakes';
		}
		if (formData.retakeDelayMinutes < 0) {
			errors.retakeDelayMinutes = 'Retake delay cannot be negative';
		}
		if (formData.paperVariants > 1 && formData.maxAttempts <= 1) {
			errors.paperVariants = 'Paper variants only apply when Max Attempts is greater than 1';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!validateForm()) {
			toast.error('Please fix the highlighted fields');
			return;
		}
		isSubmitting = true;
		errors = {};

		const formElement = event.target as HTMLFormElement;
		const formDataObj = new FormData(formElement);

		// Boolean toggles — always sourced from reactive state
		formDataObj.set('shuffleQuestions', formData.shuffleQuestions ? 'on' : 'off');
		formDataObj.set('shuffleOptions', formData.shuffleOptions ? 'on' : 'off');
		formDataObj.set('requireFaceVerify', formData.requireFaceVerify ? 'on' : 'off');
		formDataObj.set('fullscreenRequired', formData.fullscreenRequired ? 'on' : 'off');
		formDataObj.set('questionIds', JSON.stringify(formData.selectedQuestions));

		// ─── Attempts & Retakes ─────────────────────────────────────────
		formDataObj.set('maxAttempts', String(formData.maxAttempts));
		formDataObj.set('paperVariants', String(formData.paperVariants));
		formDataObj.set('allowRetakes', formData.allowRetakes ? 'on' : 'off');
		formDataObj.set('retakeDelayMinutes', String(formData.retakeDelayMinutes));
		formDataObj.set('showPreviousAttempts', formData.showPreviousAttempts ? 'on' : 'off');
		formDataObj.set('bestScoreOnly', formData.bestScoreOnly ? 'on' : 'off');
		formDataObj.set('reviewPreviousAttempts', formData.reviewPreviousAttempts ? 'on' : 'off');

		try {
			const response = await fetch('/lecturer/assessments/create/test', {
				method: 'POST',
				body: formDataObj,
			});

			const result = deserialize(await response.text());

			if (result.type === 'success' && (result.data as any)?.success) {
				toast.success('Test created successfully');
				await goto('/lecturer/assessments');
				return;
			}

			if (result.type === 'failure') {
				const d = result.data as any;
				if (d?.errors) {
					errors = d.errors;
					toast.error('Please fix the highlighted fields');
				} else {
					errors = { error: d?.error ?? 'Failed to create test' };
					toast.error(d?.error ?? 'Failed to create test');
				}
				return;
			}

			if (result.type === 'error') {
				const msg = result.error?.message ?? 'Server error';
				errors = { error: msg };
				toast.error(msg);
				return;
			}

			await invalidateAll();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Network error';
			errors = { error: msg };
			toast.error(msg);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<style>
	/* Track — rendered as a <button type="button"> */
	.toggle-track {
		display: inline-flex;
		align-items: center;
		width: 2.75rem;   /* 44px */
		height: 1.5rem;   /* 24px */
		border-radius: 9999px;
		border: none;
		padding: 2px;
		cursor: pointer;
		transition: background-color 200ms ease;
		flex-shrink: 0;
		outline-offset: 2px;
	}
	.toggle-track:focus-visible {
		outline: 2px solid currentColor;
	}

	/* Thumb */
	.toggle-track::after {
		content: '';
		display: block;
		width: 1.25rem;   /* 20px */
		height: 1.25rem;
		border-radius: 9999px;
		background: white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.3);
		transition: transform 200ms ease;
	}

	/* OFF state — red track, thumb on the left */
	.toggle-track.is-off {
		background-color: #ef4444; /* red-500 */
	}
	.toggle-track.is-off::after {
		transform: translateX(0);
	}

	/* ON state — green track, thumb on the right */
	.toggle-track.is-on {
		background-color: #22c55e; /* green-500 */
	}
	.toggle-track.is-on::after {
		transform: translateX(1.25rem); /* 20px */
	}
</style>

<svelte:head>
	<title>Create Test — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Create Test" description="Create a new test for your students">
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
				<h3 class="text-lg font-semibold">Cannot create test</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'You have no assigned courses this semester. Contact your HOD.'
						? 'Please contact your HOD to assign courses before creating tests.'
						: 'There was an error loading the test creation form.'}
				</p>
				<Button variant="outline" class="mt-4" href="/lecturer/assessments">
					<ArrowLeft class="mr-2 size-4" />
					Back to Assessments
				</Button>
			</CardContent>
		</Card>
	{:else}
		<form method="POST" onsubmit={handleSubmit} class="space-y-6">
			<input type="hidden" name="courseId" value={formData.courseId} />

			{#if errors.error}
				<Alert variant="destructive">
					<AlertCircle class="size-4" />
					<AlertDescription>{errors.error}</AlertDescription>
				</Alert>
			{/if}

			<!-- Presets -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Sparkles class="size-4" />
						Presets
					</CardTitle>
					<CardDescription>
						Start from a preset to prefill marks, duration, question count, security, and schedule — you can still edit anything below afterward.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{#each presets as preset}
							<button
								type="button"
								onclick={() => applyPreset(preset)}
								class={cn(
									'text-left rounded-lg border p-3 transition-colors hover:border-primary/60 hover:bg-muted/40',
									selectedPresetId === preset.id
										? 'border-primary bg-primary/5 ring-1 ring-primary'
										: 'border-border'
								)}
							>
								<div class="flex items-center justify-between">
									<span class="text-sm font-semibold">{preset.label}</span>
									{#if selectedPresetId === preset.id}
										<CheckIcon class="size-4 text-primary" />
									{/if}
								</div>
								<p class="text-xs text-muted-foreground mt-1">{preset.description}</p>
								<div class="flex flex-wrap gap-1 mt-2">
									<Badge variant="secondary" class="text-[10px]">{preset.totalMarks} marks</Badge>
									<Badge variant="secondary" class="text-[10px]">{preset.durationMinutes}m</Badge>
									<Badge variant="secondary" class="text-[10px]">{preset.questionCount}q</Badge>
									{#if preset.requireFaceVerify}
										<Badge variant="outline" class="text-[10px]">Face verify</Badge>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</CardContent>
			</Card>

			<div class="grid gap-6 md:grid-cols-2">
				<!-- Basic Information -->
				<Card class="md:col-span-1">
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>General details about the test</CardDescription>
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
												'w-full justify-between h-12 text-base font-normal',
												errors.courseId && 'border-destructive'
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
																'mr-2 size-4',
																formData.courseId === course.id ? 'opacity-100' : 'opacity-0'
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
							<Label for="title">Test Title *</Label>
							<Input
								id="title"
								name="title"
								bind:value={formData.title}
								placeholder="e.g., CSC301 Mid-Semester Test"
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
							<p class="text-xs text-muted-foreground">Recommended: 30 marks for tests</p>
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
							<p class="text-xs text-muted-foreground">Recommended: 60% of total marks (18/30)</p>
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
							<p class="text-xs text-muted-foreground">Recommended: 30 minutes for tests</p>
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
								min="10"
								max="30"
								class={errors.questionCount ? 'border-destructive' : ''}
								required
							/>
							<p class="text-xs text-muted-foreground">Recommended: 10-15 questions</p>
							{#if errors.questionCount}
								<p class="text-sm text-destructive">{errors.questionCount}</p>
							{/if}
						</div>
					</CardContent>
				</Card>

				<!-- Questions Selection -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center justify-between">
							<span>Questions</span>
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={openBankDialog}
									disabled={!formData.courseId}
									title={!formData.courseId ? 'Select a course first' : ''}
								>
									<Database class="mr-2 size-4" />
									Bank
								</Button>

								<Dialog bind:open={uploadDialogOpen}>
									<DialogTrigger>
										{#snippet child({ props })}
											<Button {...props} variant="outline" size="sm">
												<Upload class="mr-2 size-4" />
												Upload
											</Button>
										{/snippet}
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Upload Questions</DialogTitle>
											<DialogDescription>
												Upload questions from a JSON or TXT file into your question bank
											</DialogDescription>
										</DialogHeader>
										<div class="space-y-4 py-4">
											<div class="space-y-2">
												<Label for="upload-file">Select File</Label>
												<Input
													id="upload-file"
													type="file"
													accept=".json,.txt"
													onchange={handleFileUpload}
													disabled={isUploading || !formData.courseId}
												/>
												{#if !formData.courseId}
													<p class="text-xs text-destructive">Select a course first</p>
												{:else}
													<p class="text-xs text-muted-foreground">Max 5 MB · .json and .txt supported</p>
												{/if}
											</div>
											{#if errors.file}
												<Alert variant="destructive">
													<AlertCircle class="size-4" />
													<AlertDescription>{errors.file}</AlertDescription>
												</Alert>
											{/if}
											{#if uploadSuccess}
												<Alert class="bg-green-50 border-green-200">
													<CheckIcon class="size-4 text-green-600" />
													<AlertDescription class="text-green-800">
														{uploadSuccess.imported} question(s) imported successfully.
														{#if uploadSuccess.errors && uploadSuccess.errors.length > 0}
															<span class="block text-destructive mt-1">
																{uploadSuccess.errors.length} row(s) had errors.
															</span>
														{/if}
													</AlertDescription>
												</Alert>
											{/if}
											{#if isUploading}
												<div class="flex items-center gap-2 text-sm text-muted-foreground">
													<span class="animate-spin inline-block size-4 border-2 border-current border-t-transparent rounded-full"></span>
													Uploading…
												</div>
											{/if}
										</div>
									</DialogContent>
								</Dialog>

								<Dialog bind:open={questionBankOpen}>
									<DialogContent class="max-w-2xl max-h-[85vh] flex flex-col">
										<DialogHeader>
											<DialogTitle>Question Bank</DialogTitle>
											<DialogDescription>
												Select questions for {selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : 'this course'}
											</DialogDescription>
										</DialogHeader>

										<div class="flex flex-col gap-3 py-2">
											<div class="relative">
												<Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
												<Input
													placeholder="Search questions..."
													bind:value={bankSearchQuery}
													class="pl-8"
												/>
											</div>

											<div class="flex flex-wrap gap-2">
												<select
													bind:value={bankFilterType}
													class="h-9 rounded-md border border-input bg-background px-2 text-sm"
												>
													<option value="all">All types</option>
													<option value="SINGLE_CHOICE">Single choice</option>
													<option value="MULTIPLE_CHOICE">Multiple choice</option>
													<option value="TRUE_FALSE">True / False</option>
													<option value="SHORT_ANSWER">Short answer</option>
												</select>

												<select
													bind:value={bankFilterDifficulty}
													class="h-9 rounded-md border border-input bg-background px-2 text-sm"
												>
													<option value="all">All difficulties</option>
													<option value="EASY">Easy</option>
													<option value="MEDIUM">Medium</option>
													<option value="HARD">Hard</option>
													<option value="EXPERT">Expert</option>
												</select>

												<div class="ml-auto flex gap-2">
													<Button type="button" variant="outline" size="sm" onclick={selectAllBankQuestions}>
														Select all ({bankFilteredQuestions.length})
													</Button>
													<Button type="button" variant="outline" size="sm" onclick={clearAllBankQuestions}>
														Clear
													</Button>
												</div>
											</div>

											<p class="text-xs text-muted-foreground">
												{formData.selectedQuestions.length} selected · {bankFilteredQuestions.length} shown
											</p>
										</div>

										<div class="max-h-[520px] overflow-y-auto border rounded-lg divide-y">
											{#if bankFilteredQuestions.length === 0}
												<div class="text-center text-muted-foreground py-8">
													<FileText class="mx-auto size-8 text-muted-foreground/50 mb-2" />
													<p class="text-sm font-medium">No questions found</p>
													<p class="text-xs mt-1">
														{(data?.bankQuestions || []).length === 0
															? 'Your question bank is empty. Upload some questions first.'
															: 'Try adjusting your search or filters.'}
													</p>
												</div>
											{:else}
												{#each bankFilteredQuestions as q (q.id)}
													<label class="flex items-start gap-3 p-3 hover:bg-muted/40 cursor-pointer">
														<Checkbox
															checked={formData.selectedQuestions.includes(q.id)}
															onCheckedChange={() => toggleQuestionSelection(q.id)}
															class="mt-0.5"
														/>
														<div class="min-w-0 flex-1">
															<p class="text-sm">{q.body}</p>
															<div class="flex flex-wrap gap-1 mt-1.5">
																<Badge variant="outline" class="text-[10px]">{q.type}</Badge>
																<Badge variant="outline" class="text-[10px]">{q.difficulty}</Badge>
																<Badge variant="outline" class="text-[10px]">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
															</div>
														</div>
													</label>
												{/each}
											{/if}
										</div>

										<DialogFooter>
											<Button type="button" variant="outline" onclick={() => (questionBankOpen = false)}>
												Cancel
											</Button>
											<Button type="button" onclick={() => (questionBankOpen = false)}>
												Done ({formData.selectedQuestions.length} selected)
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</div>
						</CardTitle>
						<CardDescription>Select questions from your bank or upload new ones</CardDescription>
					</CardHeader>
					<CardContent>
						{#if errors.questions}
							<Alert variant="destructive" class="mb-4">
								<AlertCircle class="size-4" />
								<AlertDescription>{errors.questions}</AlertDescription>
							</Alert>
						{/if}
						<div class="rounded-lg border p-4 min-h-[100px] max-h-[520px] overflow-y-auto">
							{#if formData.selectedQuestions.length === 0}
								<div class="text-center text-muted-foreground py-4">
									<FileText class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p class="text-sm font-medium">No questions selected</p>
									<p class="text-xs mt-1">Click "Bank" to select from your question bank</p>
								</div>
							{:else}
								<div class="space-y-2">
									{#each formData.selectedQuestions
										.map((qId) => ({ qId, question: (data?.bankQuestions || []).find((q: any) => q.id === qId) }))
										.filter(({ question }) => !!question) as { qId, question }}
										<div class="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50">
											<span class="text-sm truncate flex-1 mr-2">{question.body}</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												class="h-6 w-6 p-0 shrink-0"
												onclick={() => toggleQuestionSelection(qId)}
											>
												<X class="size-3" />
											</Button>
										</div>
									{/each}
									<p class="text-xs text-muted-foreground pt-1">
										{formData.selectedQuestions.length} question(s) selected
									</p>
								</div>
							{/if}
						</div>
					</CardContent>
				</Card>

				<!-- Scheduling, Attempts & Retakes & Security -->
				<Card>
					<CardHeader>
						<CardTitle>Scheduling & Security</CardTitle>
						<CardDescription>Configure availability and security settings</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="startDate">Start Date & Time</Label>
							<Input id="startDate" name="startDate" type="datetime-local" bind:value={formData.startDate} />
						</div>

						<div class="space-y-2">
							<Label for="endDate">End Date & Time</Label>
							<Input id="endDate" name="endDate" type="datetime-local" bind:value={formData.endDate} />
						</div>

						<div class="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
							<p class="text-xs text-yellow-700 dark:text-yellow-400">
								<Calendar class="inline size-3 mr-1" />
								Current academic session: <strong>{data.currentSession}</strong>
							</p>
						</div>

						<div class="pt-4 border-t space-y-4">
							<!--
								Custom toggle pill — a plain <button type="button"> flips the
								boolean in formData directly. No <label>/<input> wrapper needed,
								so there is zero risk of click events bubbling into the form or
								triggering sonner toasts via reactive side-effects.
							-->
					<CardHeader>Configure whether students can retake this test and how attempts are scored</CardHeader>
<div class="pt-2 border-t space-y-4">
						<div class="space-y-2">
							<Label for="maxAttempts">Max Attempts</Label>
							<Input
								id="maxAttempts"
								name="maxAttempts"
								type="number"
								bind:value={formData.maxAttempts}
								min="1"
								class={errors.maxAttempts ? 'border-destructive' : ''}
								required
							/>
							<p class="text-xs text-muted-foreground">1 = no retakes. Set above 1 and enable "Allow Retakes" below to let students try again.</p>
							{#if errors.maxAttempts}
								<p class="text-sm text-destructive">{errors.maxAttempts}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="paperVariants">Paper Variants</Label>
							<Input
								id="paperVariants"
								name="paperVariants"
								type="number"
								bind:value={formData.paperVariants}
								min="1"
								class={errors.paperVariants ? 'border-destructive' : ''}
							/>
							<p class="text-xs text-muted-foreground">Number of distinct question sets to rotate across attempts (requires Max Attempts &gt; 1).</p>
							{#if errors.paperVariants}
								<p class="text-sm text-destructive">{errors.paperVariants}</p>
							{/if}
						</div>

						
						<div class="pt-2 border-t space-y-4">
						<CardHeader>Configure security settings for this test</CardHeader>
<div class="pt-2 border-t space-y-4">

							<!-- Allow Retakes -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium leading-none">Allow Retakes</p>
									<p class="text-xs text-muted-foreground mt-1">Let students attempt this test more than once</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={formData.allowRetakes}
									onclick={() => {
										formData.allowRetakes = !formData.allowRetakes;
										if (formData.allowRetakes) toast.success('Retakes enabled');
										else toast.error('Retakes disabled');
									}}
									class="toggle-track {formData.allowRetakes ? 'is-on' : 'is-off'}"
								></button>
							</div>

							{#if formData.allowRetakes}
								<div class="space-y-2 pl-1">
									<Label for="retakeDelayMinutes">Retake Delay (minutes)</Label>
									<Input
										id="retakeDelayMinutes"
										name="retakeDelayMinutes"
										type="number"
										bind:value={formData.retakeDelayMinutes}
										min="0"
										class={errors.retakeDelayMinutes ? 'border-destructive' : ''}
									/>
									<p class="text-xs text-muted-foreground">0 = student can retake immediately after submitting.</p>
									{#if errors.retakeDelayMinutes}
										<p class="text-sm text-destructive">{errors.retakeDelayMinutes}</p>
									{/if}
								</div>

								<!-- Show Previous Attempts -->
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium leading-none">Show Previous Attempts</p>
										<p class="text-xs text-muted-foreground mt-1">Students can see scores from earlier attempts</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={formData.showPreviousAttempts}
										onclick={() => (formData.showPreviousAttempts = !formData.showPreviousAttempts)}
										class="toggle-track {formData.showPreviousAttempts ? 'is-on' : 'is-off'}"
									></button>
								</div>

								<!-- Review Previous Attempts -->
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium leading-none">Review Previous Attempts</p>
										<p class="text-xs text-muted-foreground mt-1">Students can see their answers from earlier attempts</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={formData.reviewPreviousAttempts}
										onclick={() => (formData.reviewPreviousAttempts = !formData.reviewPreviousAttempts)}
										class="toggle-track {formData.reviewPreviousAttempts ? 'is-on' : 'is-off'}"
									></button>
								</div>

								<!-- Best Score Only -->
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium leading-none">Best Score Only</p>
										<p class="text-xs text-muted-foreground mt-1">Report the highest score across attempts (off = most recent attempt)</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={formData.bestScoreOnly}
										onclick={() => (formData.bestScoreOnly = !formData.bestScoreOnly)}
										class="toggle-track {formData.bestScoreOnly ? 'is-on' : 'is-off'}"
									></button>
								</div>
							{/if}
						</div>
					

							<!-- Shuffle Questions -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium leading-none">Shuffle Questions</p>
									<p class="text-xs text-muted-foreground mt-1">Randomize question order</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={formData.shuffleQuestions}
									onclick={() => {
										formData.shuffleQuestions = !formData.shuffleQuestions;
										if (formData.shuffleQuestions) toast.success('Shuffle questions enabled');
										else toast.error('Shuffle questions disabled');
									}}
									class="toggle-track {formData.shuffleQuestions ? 'is-on' : 'is-off'}"
								></button>
							</div>

							<!-- Shuffle Options -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium leading-none">Shuffle Options</p>
									<p class="text-xs text-muted-foreground mt-1">Randomize option order</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={formData.shuffleOptions}
									onclick={() => {
										formData.shuffleOptions = !formData.shuffleOptions;
										if (formData.shuffleOptions) toast.success('Shuffle options enabled');
										else toast.error('Shuffle options disabled');
									}}
									class="toggle-track {formData.shuffleOptions ? 'is-on' : 'is-off'}"
								></button>
							</div>

							<!-- Face Verification -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium leading-none">Face Verification</p>
									<p class="text-xs text-muted-foreground mt-1">Require face verification</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={formData.requireFaceVerify}
									onclick={() => {
										formData.requireFaceVerify = !formData.requireFaceVerify;
										if (formData.requireFaceVerify) toast.success('Face verification enabled');
										else toast.error('Face verification disabled');
									}}
									class="toggle-track {formData.requireFaceVerify ? 'is-on' : 'is-off'}"
								></button>
							</div>

							<!-- Fullscreen Required -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium leading-none">Fullscreen Required</p>
									<p class="text-xs text-muted-foreground mt-1">Must be in fullscreen mode</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={formData.fullscreenRequired}
									onclick={() => {
										formData.fullscreenRequired = !formData.fullscreenRequired;
										if (formData.fullscreenRequired) toast.success('Fullscreen required enabled');
										else toast.error('Fullscreen required disabled');
									}}
									class="toggle-track {formData.fullscreenRequired ? 'is-on' : 'is-off'}"
								></button>
							</div>
						</div>

						<div class="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 mt-4">
							<div class="flex items-start gap-2">
								<Shield class="size-4 text-blue-600 dark:text-blue-400 mt-0.5" />
								<div>
									<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Test Features</p>
									<ul class="text-xs text-blue-600 dark:text-blue-300 mt-1 space-y-1 list-disc list-inside">
										<li>30 marks standard test format</li>
										<li>Face verification available</li>
										<li>Fullscreen mode required</li>
										<li>Results shown immediately</li>
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
							<LoaderIcon class="mr-2 size-4 animate-spin" />
						{/if}
						Create Test
					</Button>
				</div>
			</div>
		</form>
	{/if}
</div>