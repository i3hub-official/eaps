<!-- src/routes/(lecturer)/lecturer/assessments/edit/[id]/+page.svelte -->
<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation'
	import { deserialize } from '$app/forms'
	import { toast } from 'svelte-sonner'
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
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js'
	import {
		AlertCircle,
		ArrowLeft,
		FileText,
		Trash2,
		CheckCircle,
		Clock,
		BookOpen,
		Sparkles,
		Shield,
		HelpCircle,
	} from '@lucide/svelte/icons'

	let { data } = $props()

	let formData = $state({
		title: data.assessment.title,
		instructions: data.assessment.instructions || '',
		totalMarks: data.assessment.totalMarks,
		passMark: data.assessment.passMark,
		durationMinutes: data.assessment.durationMinutes,
	})

	let errors = $state<Record<string, string>>({})
	let isSubmitting = $state(false)
	let isDeleting = $state(false)

	const isPublished = data.assessment.status === 'PUBLISHED'
	const isDraft = data.assessment.status === 'DRAFT'
	const canEdit = isDraft
	const questionsReady = data.assessment.questions.length >= data.assessment.questionCount
	const questionProgress = `${data.assessment.questions.length}/${data.assessment.questionCount}`

	// Reads a SvelteKit action's devalue-encoded response body correctly
	// (response.json() would silently return undefined for result.data,
	// since actions don't return plain JSON).
	async function callAction(action: string, fd?: FormData) {
		const response = await fetch(action, { method: 'POST', body: fd })
		const result = deserialize(await response.text())

		if (result.type === 'success') {
			return (result.data as any) ?? {}
		}
		if (result.type === 'failure') {
			const data = result.data as any
			if (data?.errors) errors = data.errors
			throw new Error(data?.error ?? 'Request failed')
		}
		if (result.type === 'error') {
			throw new Error(result.error?.message ?? 'Server error')
		}
		// 'redirect' — not expected from these actions, but don't silently swallow it
		throw new Error('Unexpected response')
	}

	async function handleUpdate(e: Event) {
		e.preventDefault()
		errors = {}
		if (!formData.title.trim()) {
			errors.title = 'Title is required'
			toast.error('Title is required')
			return
		}

		isSubmitting = true
		const formElement = e.target as HTMLFormElement
		const fd = new FormData(formElement)

		try {
			await toast.promise(callAction('?/update', fd), {
				loading: 'Saving changes…',
				success: 'Assessment updated',
				error: (err) => (err instanceof Error ? err.message : 'Failed to update'),
			}).unwrap()
			await invalidateAll()
		} catch {
			// error already surfaced via toast.promise above
		} finally {
			isSubmitting = false
		}
	}

	async function handlePublish() {
		if (data.assessment.questions.length < data.assessment.questionCount) {
			toast.error(
				`You have ${data.assessment.questions.length} questions but need ${data.assessment.questionCount}`
			)
			return
		}

		isSubmitting = true

		try {
			await toast.promise(callAction('?/publish'), {
				loading: 'Publishing assessment…',
				success: 'Assessment published',
				error: (err) => (err instanceof Error ? err.message : 'Failed to publish'),
			}).unwrap()
			await invalidateAll()
		} catch {
			// error already surfaced via toast.promise above
		} finally {
			isSubmitting = false
		}
	}

	async function handleDelete() {
		if (!confirm('Delete this assessment? This cannot be undone.')) return

		isDeleting = true

		try {
			await toast.promise(callAction('?/delete'), {
				loading: 'Deleting assessment…',
				success: 'Assessment deleted',
				error: (err) => (err instanceof Error ? err.message : 'Failed to delete'),
			}).unwrap()
			await goto('/lecturer/assessments')
		} catch {
			// error already surfaced via toast.promise above
		} finally {
			isDeleting = false
		}
	}
</script>

<svelte:head>
	<title>Edit Assessment — MOUAU e-Test</title>
</svelte:head>

<Topbar
	title="Edit Assessment"
	description={`${data.assessment.type} — ${data.assessment.course.code}`}
>
	{#snippet actions()}
		<Button href="/lecturer/assessments" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back to Assessments
		</Button>
	{/snippet}
</Topbar>

<div class="p-6 space-y-6">
	<!-- Status overview — same 4-up stat-card language as the create page's summary widgets -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardContent class="pt-6">
				<div class="text-sm text-muted-foreground">Status</div>
				<div class="flex items-center gap-2 mt-2">
					{#if isPublished}
						<CheckCircle class="size-5 text-green-600" />
						<span class="font-semibold">Published</span>
					{:else}
						<Clock class="size-5 text-amber-600" />
						<span class="font-semibold">Draft</span>
					{/if}
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent class="pt-6">
				<div class="text-sm text-muted-foreground">Questions</div>
				<div class="text-2xl font-bold mt-2">{questionProgress}</div>
				<p class="text-xs mt-1 {questionsReady ? 'text-green-600' : 'text-destructive'}">
					{questionsReady
						? 'Ready to publish'
						: `Need ${data.assessment.questionCount - data.assessment.questions.length} more`}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardContent class="pt-6">
				<div class="text-sm text-muted-foreground">Total Marks</div>
				<div class="text-2xl font-bold mt-2">{data.assessment.totalMarks}</div>
				<p class="text-xs text-muted-foreground mt-1">Pass: {data.assessment.passMark}</p>
			</CardContent>
		</Card>

		<Card>
			<CardContent class="pt-6">
				<div class="text-sm text-muted-foreground">Duration</div>
				<div class="text-2xl font-bold mt-2">{data.assessment.durationMinutes}m</div>
				<p class="text-xs text-muted-foreground mt-1">per attempt</p>
			</CardContent>
		</Card>
	</div>

	<Tabs defaultValue="details" class="space-y-4">
		<TabsList>
			<TabsTrigger value="details">Details</TabsTrigger>
			<TabsTrigger value="questions">Questions ({data.assessment.questions.length})</TabsTrigger>
			<TabsTrigger value="settings">Settings</TabsTrigger>
		</TabsList>

		<!-- Details Tab -->
		<TabsContent value="details">
			{#if !canEdit}
				<Alert>
					<AlertCircle class="size-4" />
					<AlertDescription>
						Published assessments cannot be edited. Create a new version if changes are needed.
					</AlertDescription>
				</Alert>

				<Card class="mt-4">
					<CardHeader>
						<CardTitle>Assessment Details</CardTitle>
						<CardDescription>View the published assessment</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div>
							<Label class="text-xs text-muted-foreground">Title</Label>
							<p class="font-medium">{data.assessment.title}</p>
						</div>
						<div>
							<Label class="text-xs text-muted-foreground">Instructions</Label>
							<p class="text-sm">{data.assessment.instructions || '(none)'}</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				<form onsubmit={handleUpdate} class="space-y-6">
					{#if errors.error}
						<Alert variant="destructive">
							<AlertCircle class="size-4" />
							<AlertDescription>{errors.error}</AlertDescription>
						</Alert>
					{/if}

					<div class="grid gap-6 md:grid-cols-2">
						<!-- Basic Information — matches create page's card -->
						<Card class="md:col-span-2">
							<CardHeader>
								<CardTitle>Basic Information</CardTitle>
								<CardDescription>General details about the assessment</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="space-y-2">
									<Label for="title">Title *</Label>
									<Input
										id="title"
										name="title"
										bind:value={formData.title}
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
										rows={3}
										placeholder="Provide instructions for students..."
									/>
									<p class="text-xs text-muted-foreground">
										<HelpCircle class="inline size-3 mr-1" />
										Instructions will be shown to students before they start
									</p>
								</div>
							</CardContent>
						</Card>

						<!-- Scoring & Timing — matches create page's card -->
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
										class={errors.totalMarks ? 'border-destructive' : ''}
										required
									/>
									{#if errors.totalMarks}
										<p class="text-sm text-destructive">{errors.totalMarks}</p>
									{/if}
								</div>

								<div class="space-y-2">
									<Label for="passMark">Pass Mark</Label>
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
									{#if errors.durationMinutes}
										<p class="text-sm text-destructive">{errors.durationMinutes}</p>
									{/if}
								</div>
							</CardContent>
						</Card>

						<!-- Publish readiness — mirrors the "Test Features" info card style from create page -->
						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<Sparkles class="size-4" />
									Publish Readiness
								</CardTitle>
								<CardDescription>What's needed before this can go live</CardDescription>
							</CardHeader>
							<CardContent class="space-y-3">
								<div class="rounded-lg {questionsReady ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} border p-3">
									<div class="flex items-start gap-2">
										<Shield class="size-4 mt-0.5 {questionsReady ? 'text-green-600' : 'text-yellow-600'}" />
										<div>
											<p class="text-sm font-medium {questionsReady ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}">
												{questionProgress} questions attached
											</p>
											<p class="text-xs mt-1 {questionsReady ? 'text-green-600 dark:text-green-300' : 'text-yellow-600 dark:text-yellow-300'}">
												{questionsReady
													? 'You have enough questions to publish.'
													: `Add ${data.assessment.questionCount - data.assessment.questions.length} more question(s) from the Questions tab.`}
											</p>
										</div>
									</div>
								</div>

								<div class="flex flex-wrap gap-1">
									<Badge variant="outline" class="text-xs">{data.assessment.type}</Badge>
									<Badge variant="outline" class="text-xs">{data.assessment.course.code}</Badge>
									<Badge variant={isPublished ? 'default' : 'secondary'} class="text-xs">
										{data.assessment.status}
									</Badge>
								</div>
							</CardContent>
						</Card>

						<!-- Submit -->
						<div class="md:col-span-2 flex items-center justify-end gap-4">
							<Button type="submit" disabled={isSubmitting}>
								{#if isSubmitting}
									<span class="animate-spin mr-2">⏳</span>
								{/if}
								Save Changes
							</Button>
							{#if isDraft}
								<Button
									type="button"
									onclick={handlePublish}
									disabled={isSubmitting || !questionsReady}
									variant="default"
								>
									Publish Assessment
								</Button>
							{/if}
						</div>
					</div>
				</form>
			{/if}
		</TabsContent>

		<!-- Questions Tab -->
		<TabsContent value="questions">
			<Card>
				<CardHeader>
					<CardTitle>Questions ({data.assessment.questions.length})</CardTitle>
					<CardDescription>
						{questionsReady
							? 'You have enough questions'
							: `Need ${data.assessment.questionCount - data.assessment.questions.length} more question(s)`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data.assessment.questions.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<FileText class="mx-auto size-8 mb-2 opacity-50" />
							<p class="font-medium">No questions added yet</p>
							<p class="text-sm">Go back to add questions from your question bank</p>
						</div>
					{:else}
						<!-- Capped scroll, matching the ~20-row cap used on the create page's bank dialog -->
						<div class="space-y-3 max-h-[520px] overflow-y-auto pr-1">
							{#each data.assessment.questions as aq}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between gap-4">
										<div class="flex-1">
											<p class="font-medium text-sm">{aq.question.body}</p>
											<div class="flex gap-1 mt-2">
												<Badge variant="outline" class="text-xs">{aq.question.type}</Badge>
												<Badge variant="outline" class="text-xs">{aq.question.difficulty}</Badge>
												<Badge variant="outline" class="text-xs">
													{aq.marksOverride ?? aq.question.marks} marks
												</Badge>
											</div>
										</div>
										<div class="text-right text-xs text-muted-foreground">
											Q{aq.order + 1}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Settings Tab -->
		<TabsContent value="settings">
			<Card>
				<CardHeader>
					<CardTitle>Settings & Metadata</CardTitle>
					<CardDescription>View assessment configuration</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<Label class="text-xs text-muted-foreground">Type</Label>
							<p class="font-medium">{data.assessment.type}</p>
						</div>
						<div>
							<Label class="text-xs text-muted-foreground">Course</Label>
							<p class="font-medium">{data.assessment.course.code}</p>
						</div>
						<div>
							<Label class="text-xs text-muted-foreground">Shuffle Questions</Label>
							<Badge variant={data.assessment.shuffleQuestions ? 'default' : 'secondary'} class="mt-1">
								{data.assessment.shuffleQuestions ? 'Enabled' : 'Disabled'}
							</Badge>
						</div>
						<div>
							<Label class="text-xs text-muted-foreground">Shuffle Options</Label>
							<Badge variant={data.assessment.shuffleOptions ? 'default' : 'secondary'} class="mt-1">
								{data.assessment.shuffleOptions ? 'Enabled' : 'Disabled'}
							</Badge>
						</div>
						<div>
							<Label class="text-xs text-muted-foreground">Face Verification</Label>
							<Badge variant={data.assessment.requireFaceVerify ? 'default' : 'secondary'} class="mt-1">
								{data.assessment.requireFaceVerify ? 'Required' : 'Not required'}
							</Badge>
						</div>
						<div>
							<Label class="text-xs text-muted-foreground">Fullscreen</Label>
							<Badge variant={data.assessment.fullscreenRequired ? 'default' : 'secondary'} class="mt-1">
								{data.assessment.fullscreenRequired ? 'Required' : 'Not required'}
							</Badge>
						</div>
					</div>

					{#if data.assessment.tags && data.assessment.tags.length > 0}
						<div class="pt-4 border-t">
							<Label class="text-xs text-muted-foreground">Tags</Label>
							<div class="flex flex-wrap gap-1 mt-2">
								{#each data.assessment.tags as tag}
									<Badge variant="secondary">{tag}</Badge>
								{/each}
							</div>
						</div>
					{/if}

					{#if isDraft}
						<div class="pt-4 border-t">
							<Button variant="destructive" size="sm" onclick={handleDelete} disabled={isDeleting}>
								<Trash2 class="mr-2 size-4" />
								{isDeleting ? 'Deleting…' : 'Delete Assessment'}
							</Button>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</div>