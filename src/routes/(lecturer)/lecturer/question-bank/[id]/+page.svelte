<!-- src/routes/(lecturer)/lecturer/question-bank/[id]/+page.svelte -->
<!-- Only the Student Answers tab section is shown here, but the full page is included -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { cn } from '$lib/utils.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import {
		ChevronLeft,
		Pencil,
		Eye,
		Trash2,
		FileQuestion,
		BookOpen,
		User,
		Tag,
		BarChart3,
		Check,
		X,
		Clock,
		Calendar,
		Copy,
		History,
		Users,
		TrendingUp,
		TrendingDown,
		AlertCircle,
		CheckCircle,
		XCircle,
	} from '@lucide/svelte/icons';

	let { data } = $props();

	const { question, course, creator, options, tags, assessments, answers, answerCount, versions, stats } = data;

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

	function getDifficultyColor(difficulty: string) {
		const colors: Record<string, string> = {
			EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
			MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
			HARD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			EXPERT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		};
		return colors[difficulty] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
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

	function getAssessmentStatusBadge(status: string) {
		const variants: Record<string, { label: string; variant: string; color: string }> = {
			DRAFT: { label: 'Draft', variant: 'secondary', color: 'text-gray-500' },
			PUBLISHED: { label: 'Published', variant: 'default', color: 'text-blue-500' },
			SCHEDULED: { label: 'Scheduled', variant: 'secondary', color: 'text-yellow-500' },
			ACTIVE: { label: 'Active', variant: 'default', color: 'text-green-500' },
			ENDED: { label: 'Ended', variant: 'secondary', color: 'text-purple-500' },
			CANCELLED: { label: 'Cancelled', variant: 'destructive', color: 'text-red-500' },
		};
		return variants[status] || { label: status, variant: 'secondary', color: 'text-gray-500' };
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function formatDateShort(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	function getCorrectOptionCount() {
		return options.filter(o => o.isCorrect).length;
	}

	function getOptionLetter(index: number) {
		return String.fromCharCode(65 + index);
	}
</script>

<svelte:head>
	<title>Question Details — MOUAU e-Test</title>
</svelte:head>

<Topbar 
	title="Question Details" 
	description={question.body.length > 60 ? question.body.substring(0, 60) + '…' : question.body}
>
	{#snippet actions()}
		<Button href="/lecturer/question-bank" variant="outline" size="sm">
			<ChevronLeft class="mr-2 size-4" />
			Back
		</Button>
		<Button href={`/lecturer/question-bank/${question.id}/edit`} size="sm">
			<Pencil class="mr-2 size-4" />
			Edit
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<!-- Question Header -->
	<Card>
		<CardContent class="pt-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-2 mb-2">
						<Badge class={getTypeColor(question.type)}>
							{getTypeLabel(question.type)}
						</Badge>
						<Badge class={getDifficultyColor(question.difficulty)}>
							{getDifficultyLabel(question.difficulty)}
						</Badge>
						<Badge variant={question.isActive ? 'default' : 'secondary'}>
							{question.isActive ? 'Active' : 'Inactive'}
						</Badge>
						<Badge variant="outline" class="text-xs">
							v{question.version}
						</Badge>
						<span class="text-sm text-muted-foreground">
							• {question.marks} mark{question.marks !== 1 ? 's' : ''}
						</span>
					</div>
					<h2 class="text-xl font-semibold break-words">{question.body}</h2>
					{#if question.explanation}
						<div class="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
							<p class="text-xs text-muted-foreground font-medium mb-1">Explanation:</p>
							<p class="break-words">{question.explanation}</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Meta Info -->
			<div class="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
				<span class="flex items-center gap-1">
					<BookOpen class="size-3.5" />
					{course ? `${course.code} — ${course.title}` : 'No course assigned'}
				</span>
				<span class="flex items-center gap-1">
					<User class="size-3.5" />
					{creator.name}
				</span>
				<span class="flex items-center gap-1">
					<Calendar class="size-3.5" />
					Created {formatDate(question.createdAt)}
				</span>
				{#if tags.length > 0}
					<span class="flex items-center gap-1">
						<Tag class="size-3.5" />
						{tags.join(', ')}
					</span>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Used In</CardTitle>
				<FileQuestion class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.totalUses}</div>
				<p class="text-xs text-muted-foreground">assessments</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Student Attempts</CardTitle>
				<Users class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.totalAttempts}</div>
				<p class="text-xs text-muted-foreground">total answers</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Success Rate</CardTitle>
				<TrendingUp class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.successRate}%</div>
				<p class="text-xs text-muted-foreground">
					{stats.correctAnswers} correct / {stats.totalAttempts} attempts
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Average Score</CardTitle>
				<BarChart3 class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.avgScore}</div>
				<p class="text-xs text-muted-foreground">marks per attempt</p>
			</CardContent>
		</Card>
	</div>

	<!-- Tabs -->
	<Tabs defaultValue="options" class="space-y-4">
		<TabsList>
			<TabsTrigger value="options">Options</TabsTrigger>
			<TabsTrigger value="assessments">Assessments</TabsTrigger>
			<TabsTrigger value="answers">Student Answers</TabsTrigger>
			<TabsTrigger value="history">History</TabsTrigger>
		</TabsList>

		<!-- Options Tab -->
		<TabsContent value="options">
			<Card>
				<CardHeader>
					<CardTitle>Answer Options</CardTitle>
					<CardDescription>
						{getCorrectOptionCount()} of {options.length} options are correct
					</CardDescription>
				</CardHeader>
				<CardContent>
					{#if options.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<FileQuestion class="mx-auto size-8 text-muted-foreground/50 mb-2" />
							<p>No options defined for this question</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each options as option, index}
								<div class={cn(
									"flex items-start gap-4 rounded-lg border p-4 transition-colors",
									option.isCorrect ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10" : "hover:bg-muted/30"
								)}>
									<div class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
										{getOptionLetter(index)}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm break-words">{option.body}</p>
										{#if option.imageUrl}
											<img src={option.imageUrl} alt="" class="mt-2 max-h-32 rounded border" />
										{/if}
									</div>
									<div class="shrink-0">
										{#if option.isCorrect}
											<Badge variant="default" class="gap-1">
												<Check class="size-3" />
												Correct
											</Badge>
										{:else}
											<Badge variant="outline" class="gap-1 text-muted-foreground">
												<X class="size-3" />
												Incorrect
											</Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Assessments Tab -->
		<TabsContent value="assessments">
			<Card>
				<CardHeader>
					<CardTitle>Used In Assessments</CardTitle>
					<CardDescription>All assessments that include this question</CardDescription>
				</CardHeader>
				<CardContent>
					{#if assessments.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<FileQuestion class="mx-auto size-8 text-muted-foreground/50 mb-2" />
							<p>This question is not used in any assessment</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Assessment</TableHead>
										<TableHead>Course</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead class="text-center">Order</TableHead>
										<TableHead class="text-center">Marks</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each assessments as a}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell>
												<a href={`/lecturer/assessments/${a.id}`} class="font-medium hover:underline">
													{a.title}
												</a>
											</TableCell>
											<TableCell>{a.courseCode}</TableCell>
											<TableCell>
												<Badge variant="outline">{a.type}</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={getAssessmentStatusBadge(a.status).variant}>
													{getAssessmentStatusBadge(a.status).label}
												</Badge>
											</TableCell>
											<TableCell class="text-center">{a.order + 1}</TableCell>
											<TableCell class="text-center">
												{a.marksOverride || question.marks}
											</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Student Answers Tab - Updated to show decrypted data -->
<TabsContent value="answers">
	<Card>
		<CardHeader>
			<CardTitle>Student Answers</CardTitle>
			<CardDescription>
				Showing {answers.length} of {answerCount} attempts
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if answers.length === 0}
				<div class="text-center py-8 text-muted-foreground">
					<Users class="mx-auto size-8 text-muted-foreground/50 mb-2" />
					<p>No student answers recorded yet</p>
				</div>
			{:else}
				<div class="overflow-x-auto max-h-[500px] overflow-y-auto">
					<Table>
						<TableHeader class="sticky top-0 z-10 bg-background">
							<TableRow>
								<TableHead>Student</TableHead>
								<TableHead>Matric</TableHead>
								<TableHead>Answer</TableHead>
								<TableHead class="text-center">Marks</TableHead>
								<TableHead class="text-center">Correct</TableHead>
								<TableHead class="text-center">Graded</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each answers as answer}
								<TableRow class="transition-colors hover:bg-muted/30">
									<TableCell>
										<div class="flex items-center gap-2">
											<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
												{answer.studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
											</div>
											<span>{answer.studentName}</span>
										</div>
									</TableCell>
									<TableCell class="font-mono text-sm">{answer.matricNumber}</TableCell>
									<TableCell>
										{#if answer.selectedOptions && answer.selectedOptions.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each answer.selectedOptions as opt}
													<Badge variant="outline" class="text-[10px]">{opt}</Badge>
												{/each}
											</div>
										{:else if answer.textAnswer}
											<span class="text-sm italic break-words">{answer.textAnswer}</span>
										{:else if answer.orderAnswer}
											<span class="text-sm">Order: {JSON.stringify(answer.orderAnswer)}</span>
										{:else if answer.matchAnswer}
											<span class="text-sm">Match: {JSON.stringify(answer.matchAnswer)}</span>
										{:else}
											<span class="text-xs text-muted-foreground/50">No answer</span>
										{/if}
									</TableCell>
									<TableCell class="text-center font-medium">
										{answer.marksAwarded !== null ? answer.marksAwarded : '—'}
									</TableCell>
									<TableCell class="text-center">
										{#if answer.isCorrect === true}
											<CheckCircle class="size-4 text-green-500 inline" />
										{:else if answer.isCorrect === false}
											<XCircle class="size-4 text-red-500 inline" />
										{:else}
											<span class="text-xs text-muted-foreground/50">—</span>
										{/if}
									</TableCell>
									<TableCell class="text-center">
										<Badge variant={answer.isManualGraded ? 'default' : 'secondary'} class="text-[10px]">
											{answer.isManualGraded ? 'Manual' : 'Auto'}
										</Badge>
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>
			{/if}
		</CardContent>
	</Card>
</TabsContent>

		<!-- History Tab -->
		<TabsContent value="history">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<History class="size-4" />
						Version History
					</CardTitle>
					<CardDescription>Previous versions of this question</CardDescription>
				</CardHeader>
				<CardContent>
					{#if versions.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<History class="mx-auto size-8 text-muted-foreground/50 mb-2" />
							<p>No version history available</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each versions as version, index}
								<div class="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
										{versions.length - index}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium break-words">{version.body}</p>
										<div class="flex flex-wrap gap-2 mt-2">
											<Badge class={getTypeColor(version.type)}>
												{getTypeLabel(version.type)}
											</Badge>
											<Badge class={getDifficultyColor(version.difficulty)}>
												{getDifficultyLabel(version.difficulty)}
											</Badge>
											<span class="text-xs text-muted-foreground">
												{formatDateShort(version.createdAt)}
											</span>
										</div>
									</div>
									<Button variant="ghost" size="sm" class="shrink-0" href={`/lecturer/question-bank/${version.id}`}>
										<Eye class="size-3.5" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</main>