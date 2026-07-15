<!-- src/routes/(student)/student/tests/[sessionId]/review/+page.svelte - READ-ONLY REVIEW -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js'
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import ArrowRight from '@lucide/svelte/icons/arrow-right'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import XCircle from '@lucide/svelte/icons/x-circle'
	import HelpCircle from '@lucide/svelte/icons/help-circle'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let currentIndex = $state(0)

	const currentQuestion = $derived(data.questions[currentIndex])
	const NUMBER_SIZE_CLASS = 'size-12 text-base font-bold'

	function goTo(index: number) {
		if (index >= 0 && index < data.questions.length) currentIndex = index
	}

	function isAnswered(q: (typeof data.questions)[number]): boolean {
		if (q.type === 'ESSAY' || q.type === 'FILL_BLANK') return q.textAnswer.trim().length > 0
		if (q.type === 'MULTIPLE_CHOICE' || q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE')
			return q.selectedOptions.length > 0
		if (q.type === 'MATCHING') return Object.keys(q.matchAnswer).length > 0
		if (q.type === 'ORDERING') return q.orderAnswer.length > 0
		return false
	}

	function getStatusIcon(q: (typeof data.questions)[number]) {
		if (!isAnswered(q)) return 'unanswered'
		if (q.isCorrect === true) return 'correct'
		if (q.isCorrect === false) return 'incorrect'
		return 'pending'
	}

	function getOptionBody(optionId: string): string {
		return currentQuestion.options.find((o) => o.id === optionId)?.body ?? optionId
	}

	function formatDate(d: Date | null): string {
		if (!d) return 'Not submitted'
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
	}
</script>

<svelte:head>
	<title>Review: {data.assessment.title} — EAPS</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<!-- Header -->
	<div class="border-b bg-background/95 backdrop-blur">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
			<div>
				<h1 class="text-lg font-semibold">{data.assessment.title}</h1>
				<p class="text-sm text-muted-foreground">
					{data.assessment.course.code} — Reviewing your submission
				</p>
			</div>
			<Button href="/student/tests" variant="outline" size="sm">
				<ArrowLeft class="mr-2 size-4" />
				Back to Tests
			</Button>
		</div>
	</div>

	<div class="flex flex-1">
		<!-- Sidebar: Question palette + score -->
		<aside class="hidden w-64 shrink-0 border-r bg-muted/30 p-6 md:block">
			<!-- Score Summary -->
			{#if data.result}
				<Card class="mb-6">
					<CardContent class="pt-6 space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Score:</span>
							<span class="font-semibold">{data.result.marksObtained}/{data.result.totalMarks}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Percentage:</span>
							<span class="font-semibold">{data.result.percentage}%</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Grade:</span>
							<Badge variant={data.result.passed ? 'default' : 'destructive'}>
								{data.result.grade || 'N/A'}
							</Badge>
						</div>
						{#if data.submittedAt}
							<div class="pt-2 border-t text-xs">
								<p class="text-muted-foreground">Submitted:</p>
								<p class="font-mono">{formatDate(data.submittedAt)}</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}

			<!-- Question Palette -->
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Questions ({data.questions.length})
				</p>
				<div class="grid grid-cols-5 gap-2">
					{#each data.questions as q, i}
						{@const status = getStatusIcon(q)}
						<button
							type="button"
							onclick={() => goTo(i)}
							class="relative flex items-center justify-center rounded-md border font-semibold {NUMBER_SIZE_CLASS}
								{i === currentIndex ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}"
							title={status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : status === 'unanswered' ? 'Unanswered' : 'Grading pending'}
						>
							{i + 1}
							{#if status === 'correct'}
								<div class="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-green-500">
									<CheckCircle2 class="size-3 text-white" />
								</div>
							{:else if status === 'incorrect'}
								<div class="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-red-500">
									<XCircle class="size-3 text-white" />
								</div>
							{:else if status === 'unanswered'}
								<div class="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-gray-400">
									<span class="text-xs font-bold text-white">—</span>
								</div>
							{:else}
								<div class="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-blue-400">
									<HelpCircle class="size-2.5 text-white" />
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Legend -->
			<div class="mt-6 space-y-1.5 border-t pt-4 text-xs">
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-green-500"></div>
					<span>Correct</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-red-500"></div>
					<span>Incorrect</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-blue-400"></div>
					<span>Pending grading</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="size-3 rounded-full bg-gray-400"></div>
					<span>Unanswered</span>
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 overflow-y-auto">
			<div class="mx-auto max-w-4xl p-6">
				<!-- Question Header -->
				<div class="mb-6">
					<div class="flex items-start justify-between gap-4 mb-3">
						<div>
							<p class="text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Question {currentIndex + 1} of {data.questions.length} · {currentQuestion.marks} mark{currentQuestion.marks === 1 ? '' : 's'}
							</p>
							<p class="mt-3 text-2xl font-semibold leading-relaxed">{currentQuestion.body}</p>
						</div>

						<!-- Status Badge -->
						<div>
							{#if !isAnswered(currentQuestion)}
								<Badge variant="secondary" class="gap-1">
									<span class="text-gray-500">—</span>
									Unanswered
								</Badge>
							{:else if currentQuestion.isCorrect === true}
								<Badge variant="default" class="gap-1 bg-green-600 hover:bg-green-700">
									<CheckCircle2 class="size-3" />
									Correct
								</Badge>
							{:else if currentQuestion.isCorrect === false}
								<Badge variant="destructive" class="gap-1">
									<XCircle class="size-3" />
									Incorrect
								</Badge>
							{:else}
								<Badge variant="secondary" class="gap-1">
									<HelpCircle class="size-3" />
									Pending
								</Badge>
							{/if}
						</div>
					</div>

					<!-- Marks Awarded -->
					{#if currentQuestion.marksAwarded !== null}
						<div class="rounded-lg bg-muted/50 p-3 text-sm">
							<p class="text-muted-foreground">Marks awarded: <span class="font-semibold">{currentQuestion.marksAwarded}/{currentQuestion.marks}</span></p>
						</div>
					{/if}
				</div>

				<!-- Question Body -->
				<div class="mb-8 space-y-6">
					{#if currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE'}
						<div class="space-y-3">
							{#each currentQuestion.options as opt, i}
								{@const isSelected = currentQuestion.selectedOptions.includes(opt.id)}
								{@const isCorrectOption = currentQuestion.options[i] && currentQuestion.isCorrect === true && isSelected}
								<div
									class="flex items-center gap-3 rounded-lg border-2 p-4 {isSelected
										? 'border-primary bg-primary/10'
										: 'border-border'} {isCorrectOption ? 'ring-2 ring-green-500' : ''}"
								>
									<div class="flex size-6 shrink-0 items-center justify-center rounded border font-bold text-sm">
										{String.fromCharCode(65 + i)}
									</div>
									<span class="flex-1 text-base font-medium">{opt.body}</span>
									{#if isSelected}
										{#if currentQuestion.isCorrect === true}
											<CheckCircle2 class="size-5 text-green-600" />
										{:else if currentQuestion.isCorrect === false}
											<XCircle class="size-5 text-red-600" />
										{/if}
									{/if}
								</div>
							{/each}
						</div>

					{:else if currentQuestion.type === 'MULTIPLE_CHOICE'}
						<div class="space-y-3">
							{#each currentQuestion.options as opt, i}
								{@const isSelected = currentQuestion.selectedOptions.includes(opt.id)}
								<div
									class="flex items-center gap-3 rounded-lg border-2 p-4 {isSelected
										? 'border-primary bg-primary/10'
										: 'border-border'}"
								>
									<div class="flex size-6 shrink-0 items-center justify-center rounded border font-bold text-sm">
										{String.fromCharCode(65 + i)}
									</div>
									<span class="flex-1 text-base font-medium">{opt.body}</span>
									{#if isSelected}
										{#if currentQuestion.isCorrect === true}
											<CheckCircle2 class="size-5 text-green-600" />
										{:else if currentQuestion.isCorrect === false}
											<XCircle class="size-5 text-red-600" />
										{/if}
									{/if}
								</div>
							{/each}
						</div>

					{:else if currentQuestion.type === 'FILL_BLANK'}
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Your answer:</p>
							<div class="rounded-lg border-2 border-primary bg-primary/5 p-3">
								<p class="text-base font-medium">{currentQuestion.textAnswer || '(No answer provided)'}</p>
							</div>
						</div>

					{:else if currentQuestion.type === 'ESSAY'}
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Your answer:</p>
							<div class="rounded-lg border-2 border-primary bg-primary/5 p-4 max-h-96 overflow-y-auto">
								<p class="whitespace-pre-wrap text-base font-medium">{currentQuestion.textAnswer || '(No answer provided)'}</p>
							</div>
							{#if currentQuestion.isCorrect === null}
								<p class="text-xs text-amber-700 dark:text-amber-400">
									Essay answers are manually graded. Awaiting lecturer feedback.
								</p>
							{/if}
						</div>

					{:else if currentQuestion.type === 'ORDERING'}
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Your ordering:</p>
							<div class="space-y-2">
								{#each currentQuestion.orderAnswer as optId, i}
									<div class="flex items-center gap-3 rounded-lg border p-3">
										<span class="w-6 text-sm font-semibold text-muted-foreground">{i + 1}</span>
										<span class="flex-1 text-base font-medium">{getOptionBody(optId)}</span>
									</div>
								{/each}
							</div>
						</div>

					{:else if currentQuestion.type === 'MATCHING'}
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Your matches:</p>
							<div class="space-y-2">
								{#each currentQuestion.leftItems ?? [] as leftBody}
									{@const matchedOptionId = currentQuestion.matchAnswer[leftBody]}
									<div class="flex items-center gap-3 rounded-lg border p-3">
										<span class="flex-1 text-base font-medium">{leftBody}</span>
										<span class="text-sm text-muted-foreground">→</span>
										<span class="flex-1 text-sm font-medium">
											{matchedOptionId ? getOptionBody(matchedOptionId) : '(Not matched)'}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Navigation -->
				<div class="flex items-center justify-between gap-2 border-t pt-6">
					<Button variant="outline" onclick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} class="text-base">
						<ArrowLeft class="mr-2 size-4" /> Previous
					</Button>

					<div class="text-sm text-muted-foreground">
						{currentIndex + 1} / {data.questions.length}
					</div>

					<Button variant="outline" onclick={() => goTo(currentIndex + 1)} disabled={currentIndex === data.questions.length - 1} class="text-base">
						Next <ArrowRight class="ml-2 size-4" />
					</Button>
				</div>
			</div>
		</main>
	</div>
</div>