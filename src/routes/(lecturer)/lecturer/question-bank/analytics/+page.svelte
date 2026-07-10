<!-- src/routes/(lecturer)/lecturer/question-bank/analytics/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard'
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Progress } from '$lib/components/ui/progress/index.js'
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js'
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js'

	import BarChart3 from '@lucide/svelte/icons/bar-chart-3'
	import TrendingUp from '@lucide/svelte/icons/trending-up'
	import Tag from '@lucide/svelte/icons/tag'
	import Eye from '@lucide/svelte/icons/eye'
	import EyeOff from '@lucide/svelte/icons/eye-off'
	import BookOpen from '@lucide/svelte/icons/book-open'
	import ChevronRight from '@lucide/svelte/icons/chevron-right'

	let { data } = $props()

	const getDifficultyColor = (difficulty: string): string => {
		const colors: Record<string, string> = {
			EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
			MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
			HARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
			EXPERT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		}
		return colors[difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400'
	}
</script>

<svelte:head>
	<title>Question Analytics — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Question Analytics" description="Insights into your question bank and usage">
	{#snippet actions()}
		<Button href="/lecturer/question-bank" variant="outline" size="sm">
			Back to Question Bank
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<!-- Overview Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Questions</CardTitle>
				<BookOpen class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.totalQuestions || 0}</div>
				<p class="text-xs text-muted-foreground">
					{data?.stats?.questionsUsedInAssessments || 0} used in assessments
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Tags</CardTitle>
				<Tag class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.totalTags || 0}</div>
				<p class="text-xs text-muted-foreground">
					{data?.stats?.avgQuestionsPerTag || 0} avg per tag
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Assessment Uses</CardTitle>
				<TrendingUp class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.totalAssessmentUses || 0}</div>
				<p class="text-xs text-muted-foreground">times questions have been used</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Unused Questions</CardTitle>
				<EyeOff class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.unusedQuestionsCount || 0}</div>
				<p class="text-xs text-muted-foreground">never used in assessments</p>
			</CardContent>
		</Card>
	</div>

	<!-- Tabs -->
	<Tabs defaultValue="tags" class="space-y-4">
		<TabsList class="grid w-full grid-cols-4">
			<TabsTrigger value="tags">Tags</TabsTrigger>
			<TabsTrigger value="difficulty">Difficulty</TabsTrigger>
			<TabsTrigger value="usage">Usage</TabsTrigger>
			<TabsTrigger value="courses">Courses</TabsTrigger>
		</TabsList>

		<!-- ─────── TAGS TAB ─────── -->
		<TabsContent value="tags">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Tag class="size-5" />
						Tag Statistics
					</CardTitle>
					<CardDescription>Questions and usage by tag</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data?.tags && data.tags.length > 0}
						<div class="space-y-6">
							{#each data.tags as tag}
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<h4 class="font-medium capitalize">{tag.name}</h4>
										<div class="flex gap-2">
											<Badge variant="outline">{tag.count} questions</Badge>
											<Badge>{tag.usedInAssessments} uses</Badge>
										</div>
									</div>

									<div class="grid gap-4 sm:grid-cols-2">
										<div>
											<p class="text-xs text-muted-foreground mb-2">Average Marks</p>
											<p class="text-2xl font-bold">{tag.avgMarks}</p>
										</div>

										<div>
											<p class="text-xs text-muted-foreground mb-2">Difficulty Breakdown</p>
											<div class="space-y-1 text-xs">
												{#if tag.difficulty.EASY > 0}
													<div class="flex items-center gap-2">
														<span class="w-12">Easy</span>
														<Progress value={(tag.difficulty.EASY / tag.count) * 100} class="h-1" />
														<span class="w-8 text-right">{tag.difficulty.EASY}</span>
													</div>
												{/if}
												{#if tag.difficulty.MEDIUM > 0}
													<div class="flex items-center gap-2">
														<span class="w-12">Med</span>
														<Progress value={(tag.difficulty.MEDIUM / tag.count) * 100} class="h-1" />
														<span class="w-8 text-right">{tag.difficulty.MEDIUM}</span>
													</div>
												{/if}
												{#if tag.difficulty.HARD > 0}
													<div class="flex items-center gap-2">
														<span class="w-12">Hard</span>
														<Progress value={(tag.difficulty.HARD / tag.count) * 100} class="h-1" />
														<span class="w-8 text-right">{tag.difficulty.HARD}</span>
													</div>
												{/if}
												{#if tag.difficulty.EXPERT > 0}
													<div class="flex items-center gap-2">
														<span class="w-12">Expert</span>
														<Progress value={(tag.difficulty.EXPERT / tag.count) * 100} class="h-1" />
														<span class="w-8 text-right">{tag.difficulty.EXPERT}</span>
													</div>
												{/if}
											</div>
										</div>
									</div>

									<div class="border-t pt-2" />
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-center py-8">No tags yet. Add tags when creating questions.</p>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- ─────── DIFFICULTY TAB ─────── -->
		<TabsContent value="difficulty">
			<Card>
				<CardHeader>
					<CardTitle>Difficulty Breakdown</CardTitle>
					<CardDescription>Questions by difficulty level</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data?.difficulty}
						<div class="space-y-4">
							{#each Object.entries(data.difficulty) as [level, count]}
								<div>
									<div class="flex items-center justify-between mb-2">
										<div class="flex items-center gap-2">
											<Badge class={getDifficultyColor(level)}>{level}</Badge>
											<span class="text-sm text-muted-foreground">{count} questions</span>
										</div>
										<span class="text-sm font-medium">
											{data.stats.totalQuestions > 0
												? Math.round((count / data.stats.totalQuestions) * 100)
												: 0}%
										</span>
									</div>
									<Progress value={(count / data.stats.totalQuestions) * 100} class="h-2" />
								</div>
							{/each}

							<div class="border-t pt-4 mt-4">
								<p class="text-sm">
									<strong>Average marks per question:</strong>
									<span class="float-right">{data.stats.avgMarksPerQuestion}</span>
								</p>
							</div>
						</div>
					{:else}
						<p class="text-muted-foreground text-center py-8">No difficulty data available.</p>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- ─────── USAGE TAB ─────── -->
		<TabsContent value="usage" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<TrendingUp class="size-5" />
						Most Used Questions (Top 10)
					</CardTitle>
					<CardDescription>Questions used most frequently in assessments</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data?.mostUsedQuestions && data.mostUsedQuestions.length > 0}
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Question</TableHead>
									<TableHead>Difficulty</TableHead>
									<TableHead class="text-right">Marks</TableHead>
									<TableHead class="text-right">Uses</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each data.mostUsedQuestions as question}
									<TableRow>
										<TableCell class="max-w-xs">
											<div class="font-medium text-sm">{question.body}</div>
											<div class="flex gap-1 mt-1">
												{#each question.tags as tag}
													<Badge variant="secondary" class="text-xs">{tag}</Badge>
												{/each}
											</div>
										</TableCell>
										<TableCell>
											<Badge class={getDifficultyColor(question.difficulty)}>
												{question.difficulty}
											</Badge>
										</TableCell>
										<TableCell class="text-right">{question.marks}</TableCell>
										<TableCell class="text-right font-medium">{question.usedCount}</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					{:else}
						<p class="text-muted-foreground text-center py-8">No usage data yet.</p>
					{/if}
				</CardContent>
			</Card>

			{#if data?.unusedQuestions && data.unusedQuestions.length > 0}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<EyeOff class="size-5" />
							Unused Questions (First 10)
						</CardTitle>
						<CardDescription>Questions not yet used in any assessment</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Question</TableHead>
									<TableHead>Difficulty</TableHead>
									<TableHead class="text-right">Marks</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each data.unusedQuestions as question}
									<TableRow>
										<TableCell class="max-w-xs">
											<div class="font-medium text-sm">{question.body}</div>
											<div class="flex gap-1 mt-1">
												{#each question.tags as tag}
													<Badge variant="secondary" class="text-xs">{tag}</Badge>
												{/each}
											</div>
										</TableCell>
										<TableCell>
											<Badge class={getDifficultyColor(question.difficulty)}>
												{question.difficulty}
											</Badge>
										</TableCell>
										<TableCell class="text-right">{question.marks}</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			{/if}
		</TabsContent>

		<!-- ─────── COURSES TAB ─────── -->
		<TabsContent value="courses">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<BookOpen class="size-5" />
						Questions by Course
					</CardTitle>
					<CardDescription>How many questions you've created for each course</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data?.courses && data.courses.length > 0}
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Course</TableHead>
									<TableHead class="text-right">Questions</TableHead>
									<TableHead class="text-right">%</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each data.courses as course}
									<TableRow>
										<TableCell>
											<div class="font-medium">{course.code}</div>
											<div class="text-xs text-muted-foreground">{course.title}</div>
										</TableCell>
										<TableCell class="text-right">{course.questionCount}</TableCell>
										<TableCell>
											<div class="text-right">
												{data.stats.totalQuestions > 0
													? Math.round((course.questionCount / data.stats.totalQuestions) * 100)
													: 0}%
											</div>
											<Progress
												value={(course.questionCount / data.stats.totalQuestions) * 100}
												class="h-1 mt-1"
											/>
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					{:else}
						<p class="text-muted-foreground text-center py-8">No questions created yet.</p>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</main>