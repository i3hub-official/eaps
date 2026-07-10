<!-- src/routes/(lecturer)/lecturer/question-bank/create/single-choice/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard'
	import { Button } from '$lib/components/ui/button/index.js'
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group/index.js'
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js'
	import * as Command from '$lib/components/ui/command/index.js'
	import * as Popover from '$lib/components/ui/popover/index.js'
	import CheckIcon from '@lucide/svelte/icons/check'
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
	import {
		ArrowLeft,
		AlertCircle,
		HelpCircle,
		Upload,
		FileJson,
		FileText,
	} from '@lucide/svelte/icons'
	import { cn } from '$lib/utils.js'
	import { tick } from 'svelte'
	import { enhance } from '$app/forms'
	import { goto, invalidateAll } from '$app/navigation'
	import { toast } from 'svelte-sonner'

	let { data, form } = $props()

	// ─── State ────────────────────────────────────────────────────────────────
	let isSubmitting = $state(false)
	let isImporting = $state(false)
	let errors = $state<Record<string, string>>({})
	let options = $state<string[]>(['', '', '', '']) // A, B, C, D
	let correctOption = $state<string>('0')

	// ─── Dropdown States ──────────────────────────────────────────────────────
	let courseOpen = $state(false)
	let courseTriggerRef = $state<HTMLButtonElement>(null!)
	let difficultyOpen = $state(false)
	let difficultyTriggerRef = $state<HTMLButtonElement>(null!)
	let importCourseOpen = $state(false)
	let importCourseTriggerRef = $state<HTMLButtonElement>(null!)

	let formData = $state({
		courseId: '',
		body: '',
		explanation: '',
		difficulty: 'MEDIUM',
		marks: 1,
	})

	const difficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT']

	// ─── Computed ────────────────────────────────────────────────────────────
	const selectedCourse = $derived(
		data?.courses?.find((c: any) => c.id === formData.courseId)
	)
	const selectedCourseLabel = $derived(
		selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : 'Select a course'
	)

	const selectedDifficulty = $derived(
		difficulties.find((d) => d === formData.difficulty) || 'MEDIUM'
	)

	// ─── Handlers ────────────────────────────────────────────────────────────
	function closeAndFocusCourse() {
		courseOpen = false
		tick().then(() => courseTriggerRef?.focus())
	}

	function closeAndFocusDifficulty() {
		difficultyOpen = false
		tick().then(() => difficultyTriggerRef?.focus())
	}

	function closeAndFocusImportCourse() {
		importCourseOpen = false
		tick().then(() => importCourseTriggerRef?.focus())
	}

	function updateOption(index: number, value: string) {
		const newOptions = [...options]
		newOptions[index] = value
		options = newOptions
	}

	const OPTION_LETTERS = ['A', 'B', 'C', 'D']

	function validateForm() {
		errors = {}
		if (!formData.courseId) errors.courseId = 'Course is required'
		if (!formData.body.trim()) errors.body = 'Question text is required'
		if (formData.marks <= 0) errors.marks = 'Marks must be greater than 0'

		const filledOptions = options.filter((o) => o.trim().length > 0)
		if (filledOptions.length < 2) errors.options = 'At least 2 options are required'

		return Object.keys(errors).length === 0
	}

	// ─── Create: use SvelteKit's enhance() so the action envelope is
	// deserialized correctly instead of hand-rolling fetch + .json() ───────────
	function handleCreateSubmit() {
		if (!validateForm()) {
			toast.error('Please fix the errors before submitting')
			return { cancel: true }
		}

		isSubmitting = true
		const toastId = toast.loading('Creating question…')

		return async ({ result }: { result: any }) => {
			isSubmitting = false

			if (result.type === 'success') {
				toast.success('Question created', { id: toastId })
				await goto('/lecturer/question-bank')
			} else if (result.type === 'failure') {
				const msg = result.data?.error ?? 'Failed to create question'
				errors = { error: msg }
				toast.error(msg, { id: toastId })
			} else if (result.type === 'error') {
				const msg = result.error?.message ?? 'Failed to create question'
				errors = { error: msg }
				toast.error(msg, { id: toastId })
			}
		}
	}

	// ─── Import: direct fetch to the +server.ts endpoint, wrapped in
	// toast.promise so the user sees pending/success/error states live ─────────
	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement
		const file = target.files?.[0]

		if (!file) return

		if (!formData.courseId) {
			toast.error('Select a course first')
			target.value = ''
			return
		}

		const validTypes = ['.json', '.txt']
		const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
		if (!validTypes.includes(fileExt)) {
			toast.error('Only .json and .txt files are supported')
			target.value = ''
			return
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error('File size must be less than 5MB')
			target.value = ''
			return
		}

		errors = {}
		isImporting = true

		const importPromise = (async () => {
			const formDataObj = new FormData()
			formDataObj.append('courseId', formData.courseId)
			formDataObj.append('file', file)

			const response = await fetch('/lecturer/question-bank/import', {
				method: 'POST',
				body: formDataObj,
			})

			const result = await response.json()

			// The endpoint returns 200 for "at least 1 imported" (even with partial
			// errors) and 400/403/500 for hard failures — this is what response.ok
			// reflects, so it lines up with success/error toast branching below.
			if (!response.ok || !result.success) {
				throw new Error(result.error ?? 'Import failed')
			}

			return result as { imported: number; total: number; errors?: string[] }
		})()

		toast.promise(importPromise, {
			loading: 'Importing questions…',
			success: (result) => {
				const base = `Imported ${result.imported} of ${result.total} question(s)`
				return result.errors?.length
					? `${base} — ${result.errors.length} row(s) had errors`
					: base
			},
			error: (err) => (err instanceof Error ? err.message : 'Import failed'),
		})

		try {
			const result = await importPromise
			if (result.errors?.length) {
				// Surface per-row errors in the UI in addition to the toast summary,
				// since toast text alone can't show a full list comfortably.
				errors = { file: `${result.errors.length} row(s) skipped: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '…' : ''}` }
			}
			target.value = ''
			await invalidateAll()
		} catch {
			// toast.promise already surfaced the error; nothing else to do here.
		} finally {
			isImporting = false
		}
	}

	function downloadTemplate() {
		const template = `Question text here
A) Option A
B) Option B
C) Option C
D) Option D
Correct: A
Difficulty: MEDIUM
Marks: 1`

		const element = document.createElement('a')
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(template))
		element.setAttribute('download', 'question-template.txt')
		element.style.display = 'none'
		document.body.appendChild(element)
		element.click()
		document.body.removeChild(element)
	}
</script>

<svelte:head>
	<title>Create Single Choice Question — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Create Single Choice Question" description="Create a question with one correct answer">
	{#snippet actions()}
		<Button href="/lecturer/question-bank" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back to Question Bank
		</Button>
	{/snippet}
</Topbar>

<div class="p-6">
	<Tabs defaultValue="manual" class="space-y-4">
		<TabsList class="grid w-full grid-cols-2 max-w-xs">
			<TabsTrigger value="manual">Create Manually</TabsTrigger>
			<TabsTrigger value="import">Import Questions</TabsTrigger>
		</TabsList>

		<!-- ─────── MANUAL TAB ─────── -->
		<TabsContent value="manual">
			<form method="POST" action="?/create" use:enhance={handleCreateSubmit} class="space-y-6">
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
							<CardDescription>General details about the question</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="space-y-2">
								<Label for="courseId">Course *</Label>
								<input type="hidden" name="courseId" value={formData.courseId} />
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
																formData.courseId = course.id
																closeAndFocusCourse()
															}}
														>
															<CheckIcon
																class={cn(
																	'mr-2 size-4',
																	formData.courseId === course.id ? 'opacity-100' : 'opacity-0'
																)}
															/>
															{course.code} — {course.title}
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
								<Label for="body">Question Text *</Label>
								<Textarea
									id="body"
									name="body"
									bind:value={formData.body}
									placeholder="Enter your question here..."
									rows={3}
									class={errors.body ? 'border-destructive' : ''}
									required
								/>
								{#if errors.body}
									<p class="text-sm text-destructive">{errors.body}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="explanation">Explanation (Optional)</Label>
								<Textarea
									id="explanation"
									name="explanation"
									bind:value={formData.explanation}
									placeholder="Provide an explanation for the correct answer..."
									rows={2}
								/>
								<p class="text-xs text-muted-foreground">
									<HelpCircle class="inline size-3 mr-1" />
									This will be shown to students after they answer
								</p>
							</div>
						</CardContent>
					</Card>

					<!-- Difficulty & Marks -->
					<Card>
						<CardHeader>
							<CardTitle>Difficulty & Marks</CardTitle>
							<CardDescription>Set the difficulty level and marks</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="space-y-2">
								<Label for="difficulty">Difficulty Level</Label>
								<input type="hidden" name="difficulty" value={formData.difficulty} />
								<Popover.Root bind:open={difficultyOpen}>
									<Popover.Trigger bind:ref={difficultyTriggerRef}>
										{#snippet child({ props })}
											<Button
												{...props}
												variant="outline"
												class="w-full justify-between h-12 text-base font-normal"
												role="combobox"
												aria-expanded={difficultyOpen}
											>
												<span>{selectedDifficulty}</span>
												<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										{/snippet}
									</Popover.Trigger>
									<Popover.Content class="w-[--radix-popover-trigger-width] p-0">
										<Command.Root>
											<Command.Input placeholder="Search difficulty..." />
											<Command.List>
												<Command.Empty>No difficulty found.</Command.Empty>
												<Command.Group>
													{#each difficulties as difficulty}
														<Command.Item
															value={difficulty}
															onSelect={() => {
																formData.difficulty = difficulty
																closeAndFocusDifficulty()
															}}
														>
															<CheckIcon
																class={cn(
																	'mr-2 size-4',
																	formData.difficulty === difficulty ? 'opacity-100' : 'opacity-0'
																)}
															/>
															{difficulty}
														</Command.Item>
													{/each}
												</Command.Group>
											</Command.List>
										</Command.Root>
									</Popover.Content>
								</Popover.Root>
							</div>

							<div class="space-y-2">
								<Label for="marks">Marks *</Label>
								<Input
									id="marks"
									name="marks"
									type="number"
									bind:value={formData.marks}
									min="0.5"
									step="0.5"
									class={errors.marks ? 'border-destructive' : ''}
									required
								/>
								{#if errors.marks}
									<p class="text-sm text-destructive">{errors.marks}</p>
								{/if}
							</div>
						</CardContent>
					</Card>

					<!-- Options -->
					<Card>
						<CardHeader>
							<CardTitle>Answer Options (A-D)</CardTitle>
							<CardDescription>Add up to 4 answer options</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							{#if errors.options}
								<Alert variant="destructive">
									<AlertCircle class="size-4" />
									<AlertDescription>{errors.options}</AlertDescription>
								</Alert>
							{/if}

							<input type="hidden" name="correctOption" value={correctOption} />
							<RadioGroup bind:value={correctOption} class="space-y-3">
								{#each options as option, index}
									<div class="flex items-center gap-3">
										<RadioGroupItem
											value={String(index)}
											id={`option-${index}`}
											disabled={!option.trim()}
										/>
										<div class="flex-1">
											<Input
												name={`option${index}`}
												value={option}
												placeholder={`Option ${OPTION_LETTERS[index]}`}
												oninput={(e: Event) =>
													updateOption(index, (e.currentTarget as HTMLInputElement).value)}
											/>
										</div>
										<Badge variant="outline">{OPTION_LETTERS[index]}</Badge>
									</div>
								{/each}
							</RadioGroup>

							<div class="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 mt-4">
								<p class="text-xs text-blue-700 dark:text-blue-400">
									<HelpCircle class="inline size-3 mr-1" />
									Maximum 4 options allowed (A, B, C, D). Select the radio button next to the correct answer.
								</p>
							</div>
						</CardContent>
					</Card>

					<!-- Submit -->
					<div class="md:col-span-2 flex items-center justify-end gap-4">
						<Button variant="outline" href="/lecturer/question-bank">Cancel</Button>
						<Button type="submit" disabled={isSubmitting}>
							{#if isSubmitting}
								<span class="animate-spin mr-2">⏳</span>
							{/if}
							Create Question
						</Button>
					</div>
				</div>
			</form>
		</TabsContent>

		<!-- ─────── IMPORT TAB ─────── -->
		<TabsContent value="import">
			<div class="space-y-6">
				{#if errors.file}
					<Alert variant="destructive">
						<AlertCircle class="size-4" />
						<AlertDescription>{errors.file}</AlertDescription>
					</Alert>
				{/if}

				<div class="grid gap-6 md:grid-cols-2">
					<Card class="md:col-span-2">
						<CardHeader>
							<CardTitle class="flex items-center gap-2">
								<Upload class="size-5" />
								Import Questions from File
							</CardTitle>
							<CardDescription>Bulk import questions from JSON or TXT format</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="space-y-4">
								<div class="space-y-2">
									<h4 class="font-medium text-sm flex items-center gap-2">
										<FileText class="size-4" />
										TXT Format
									</h4>
									<pre class="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{`Question text here
A) Option A
B) Option B
C) Option C
D) Option D
Correct: A
Difficulty: MEDIUM
Marks: 1`}</code></pre>
									<Button type="button" variant="outline" size="sm" onclick={downloadTemplate} class="w-full">
										Download TXT Template
									</Button>
								</div>

								<div class="space-y-2">
									<h4 class="font-medium text-sm flex items-center gap-2">
										<FileJson class="size-4" />
										JSON Format
									</h4>
									<pre class="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{`[
  {
    "body": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "A",
    "difficulty": "MEDIUM",
    "marks": 1,
    "explanation": "Optional explanation"
  }
]`}</code></pre>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Select File to Import</CardTitle>
							<CardDescription>Choose your course first, then upload</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="space-y-2">
								<Label for="courseId-import">Course *</Label>
								<Popover.Root bind:open={importCourseOpen}>
									<Popover.Trigger bind:ref={importCourseTriggerRef}>
										{#snippet child({ props })}
											<Button
												{...props}
												variant="outline"
												class="w-full justify-between h-12 text-base font-normal"
												role="combobox"
												aria-expanded={importCourseOpen}
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
																formData.courseId = course.id
																closeAndFocusImportCourse()
															}}
														>
															<CheckIcon
																class={cn(
																	'mr-2 size-4',
																	formData.courseId === course.id ? 'opacity-100' : 'opacity-0'
																)}
															/>
															{course.code} — {course.title}
														</Command.Item>
													{/each}
												</Command.Group>
											</Command.List>
										</Command.Root>
									</Popover.Content>
								</Popover.Root>
							</div>

							<div class="space-y-2">
								<Label for="file-upload">Upload File</Label>
								<Input
									id="file-upload"
									type="file"
									accept=".json,.txt"
									onchange={handleFileUpload}
									disabled={!formData.courseId || isImporting}
								/>
								<p class="text-xs text-muted-foreground">
									Max file size: 5MB. Supported: .json, .txt
								</p>
							</div>

							{#if isImporting}
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<span class="animate-spin">⏳</span>
									Importing questions...
								</div>
							{/if}
						</CardContent>
					</Card>
				</div>

				<div class="flex items-center justify-end gap-4">
					<Button variant="outline" href="/lecturer/question-bank">Back to Question Bank</Button>
				</div>
			</div>
		</TabsContent>
	</Tabs>
</div>