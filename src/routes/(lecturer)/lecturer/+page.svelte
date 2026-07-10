<!-- src/routes/(lecturer)/lecturer/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
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
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js'
	import OnboardingPrompt from '$lib/components/dashboard/onboarding-prompt.svelte'

	import BookOpen from '@lucide/svelte/icons/book-open'
	import Users from '@lucide/svelte/icons/users'
	import FileText from '@lucide/svelte/icons/file-text'
	import Calendar from '@lucide/svelte/icons/calendar'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import CheckCircle from '@lucide/svelte/icons/check-circle'
	import Clock from '@lucide/svelte/icons/clock'
	import TrendingUp from '@lucide/svelte/icons/trending-up'
	import ChevronRight from '@lucide/svelte/icons/chevron-right'
	import Play from '@lucide/svelte/icons/play'
	import Rocket from '@lucide/svelte/icons/rocket'
	import XCircle from '@lucide/svelte/icons/x-circle'
	import Building2 from '@lucide/svelte/icons/building-2'

	let { data } = $props()

	// ─── Onboarding ──────────────────────────────────────────────────────────
	// If this lecturer is fully provisioned (isComplete), neither the modal
	// nor the setup notice render at all. If not provisioned, the notice
	// shows a manual "Set Up Now" button — no auto-open, the lecturer decides
	// when to deal with it. OnboardingPrompt itself just renders forms
	// against data.onboarding and submits them; it has no opinion on whether
	// it should be visible.
	const needsOnboarding = $derived(data?.onboarding && !data.onboarding.isComplete)

	let showOnboarding = $state(false)

	const formatDate = (date: Date | string) => {
		if (!date) return ''
		const d = new Date(date)
		const now = new Date()
		const diff = d.getTime() - now.getTime()
		const days = Math.floor(diff / (1000 * 60 * 60 * 24))
		const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)

		if (days === 0 && hours > 0) return `in ${hours}h`
		if (days === 0) return 'today'
		if (days === 1) return 'tomorrow'
		return `in ${days}d`
	}

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
			SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
			DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
			ENDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
			CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		}
		return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400'
	}

	const getTypeColor = (type: string) => {
		const colors: Record<string, string> = {
			EXAMINATION: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
			TEST: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
			ASSIGNMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
			PRACTICE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		}
		return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400'
	}

	const getOnboardingMessage = () => {
		if (!needsOnboarding) return null

		const missing = []
		if (!data.onboarding.hasCollege) missing.push('College')
		if (!data.onboarding.hasDepartment) missing.push('Department')
		if (!data.onboarding.hasCourse) missing.push('Courses')

		if (missing.length === 3) return 'You need to set up your College, Department, and Courses'
		if (missing.length === 2) return `You need to set up your ${missing.join(' and ')}`
		return `You need to set up your ${missing[0]}`
	}
</script>

<svelte:head>
	<title>Dashboard — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Dashboard" />

<!-- Onboarding Modal — dashboard owns open/close, component just does its job -->
<OnboardingPrompt
	data={data.onboarding}
	open={showOnboarding}
	onOpenChange={(open) => {
		showOnboarding = open
	}}
/>

<div class="flex flex-1 flex-col gap-8 p-8">
	<!-- Welcome Banner -->
	<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Welcome back, {data?.user?.firstName || 'Lecturer'}</h1>
			<p class="text-muted-foreground mt-1">
				{data?.stats?.activeSessions > 0
					? `${data.stats.activeSessions} exam(s) in progress`
					: 'No active exams right now'}
			</p>
		</div>
		<div class="flex gap-3">
			<Button href="/lecturer/grade" variant={data?.stats?.pendingGrades > 0 ? 'default' : 'outline'} size="default">
				{#if data?.stats?.pendingGrades > 0}
					<AlertCircle class="mr-2 size-4" />
					Grade ({data.stats.pendingGrades})
				{:else}
					All graded
				{/if}
			</Button>
			<Button href="/lecturer/courses" variant="outline" size="default">
				All Courses
				<ChevronRight class="ml-2 size-4" />
			</Button>
		</div>
	</div>

	<!-- Onboarding Alert - Conditional -->
	{#if needsOnboarding}
		<Alert class="border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400">
			<Rocket class="size-5" />
			<AlertTitle class="font-semibold">Complete Your Onboarding</AlertTitle>
			<AlertDescription class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<span>{getOnboardingMessage()}</span>
				<Button 
					variant="default" 
					size="sm" 
					onclick={() => showOnboarding = true}
					class="shrink-0"
				>
					<Rocket class="mr-2 size-4" />
					Set Up Now
				</Button>
			</AlertDescription>
		</Alert>
	{/if}

	<!-- Stats Grid with Descriptions -->
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">My Courses</CardTitle>
				<BookOpen class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.courses || 0}</div>
				<p class="text-xs text-muted-foreground">
					{data?.stats?.students || 0} total students
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Questions</CardTitle>
				<FileText class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.questions || 0}</div>
				<p class="text-xs text-muted-foreground">in question bank</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Assessments</CardTitle>
				<Calendar class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.published || 0}</div>
				<p class="text-xs text-muted-foreground">
					published / {data?.stats?.assessments || 0} total
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Pending Grades</CardTitle>
				<AlertCircle class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data?.stats?.pendingGrades || 0}</div>
				<p class="text-xs text-muted-foreground">
					{data?.stats?.pendingGrades > 0 ? 'waiting to be graded' : 'all graded'}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Tabs -->
	<Tabs defaultValue="urgent" class="space-y-6">
		<TabsList class="grid w-full max-w-md grid-cols-4">
			<TabsTrigger value="urgent">Urgent</TabsTrigger>
			<TabsTrigger value="upcoming">Upcoming</TabsTrigger>
			<TabsTrigger value="performance">Performance</TabsTrigger>
			<TabsTrigger value="activity">Activity</TabsTrigger>
		</TabsList>

		<!-- Urgent Tab -->
		<TabsContent value="urgent" class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Active Sessions -->
				{#if data?.stats?.activeSessions > 0}
					<Card class="border-orange-200/50 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/20">
						<CardHeader class="pb-3">
							<CardTitle class="flex items-center gap-2 text-orange-900 dark:text-orange-400">
								<Play class="size-5" />
								Active Exams Right Now
							</CardTitle>
							<CardDescription class="text-orange-800 dark:text-orange-300">
								{data.stats.activeSessions} student(s) in progress
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button href="/invigilator" size="sm" variant="outline">
								Monitor Now
								<ChevronRight class="ml-2 size-4" />
							</Button>
						</CardContent>
					</Card>
				{/if}

				<!-- Pending Grades Alert -->
				{#if data?.stats?.pendingGrades > 0}
					<Card class="border-red-200/50 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/20">
						<CardHeader class="pb-3">
							<CardTitle class="flex items-center gap-2 text-red-900 dark:text-red-400">
								<AlertCircle class="size-5" />
								Answers Awaiting Grade
							</CardTitle>
							<CardDescription class="text-red-800 dark:text-red-300">
								{data.stats.pendingGrades} submission(s) need grading
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button href="/lecturer/grade" variant="default" size="sm">
								Grade Now
								<ChevronRight class="ml-2 size-4" />
							</Button>
						</CardContent>
					</Card>
				{/if}

				<!-- Upcoming Due Dates -->
				{#if data?.pendingSubmissions && data.pendingSubmissions.length > 0}
					<Card class="border-yellow-200/50 bg-yellow-50/50 dark:border-yellow-800/30 dark:bg-yellow-950/20 md:col-span-2">
						<CardHeader class="pb-3">
							<CardTitle class="flex items-center gap-2 text-yellow-900 dark:text-yellow-400">
								<Clock class="size-5" />
								Upcoming Assignment Due Dates
							</CardTitle>
							<CardDescription>Assignments that need your attention</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-3">
								{#each data.pendingSubmissions.slice(0, 3) as assignment}
									<div class="flex items-center justify-between rounded-lg border border-yellow-200 bg-white p-4 dark:border-yellow-800/30 dark:bg-yellow-950/10">
										<div>
											<p class="font-medium">{assignment.title}</p>
											<p class="text-sm text-muted-foreground">{assignment.courseCode}</p>
										</div>
										<Badge class={formatDate(assignment.dueDate) === 'today' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'}>
											{formatDate(assignment.dueDate)}
										</Badge>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}

				<!-- Recent Submissions to Grade -->
				{#if data?.pendingGrades && data.pendingGrades.length > 0}
					<Card class="md:col-span-2">
						<CardHeader class="pb-3">
							<CardTitle class="flex items-center gap-2">
								<FileText class="size-5" />
								Recent Submissions to Grade
							</CardTitle>
							<CardDescription>Latest answers awaiting your feedback</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-4">
								{#each data.pendingGrades.slice(0, 5) as submission}
									<div class="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
										<div class="flex-1">
											<a href={`/lecturer/grade?submission=${submission.id}`} class="font-medium hover:underline">
												{submission.studentName}
											</a>
											<p class="text-sm text-muted-foreground">{submission.studentMatric}</p>
											<p class="text-sm mt-1">{submission.assessment}</p>
											<p class="text-sm text-muted-foreground italic">{submission.questionPreview}</p>
										</div>
										<span class="text-sm text-muted-foreground whitespace-nowrap ml-4">
											{new Date(submission.answeredAt).toLocaleDateString()}
										</span>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
		</TabsContent>

		<!-- Upcoming Tab -->
		<TabsContent value="upcoming" class="space-y-6">
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="flex items-center gap-2">
						<Calendar class="size-5" />
						Upcoming Assessments
					</CardTitle>
					<CardDescription>Scheduled exams, tests, and assignments</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data?.upcomingAssessments && data.upcomingAssessments.length > 0}
						<div class="space-y-4">
							{#each data.upcomingAssessments as assessment}
								<div class="flex items-start justify-between rounded-lg border p-5 hover:bg-muted/50 transition-colors">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<Badge class={getTypeColor(assessment.type)} variant="outline">
												{assessment.type}
											</Badge>
											<Badge class={getStatusColor(assessment.status)}>
												{assessment.status}
											</Badge>
										</div>
										<h4 class="font-medium mt-2 text-lg">{assessment.title}</h4>
										<p class="text-sm text-muted-foreground">
											{assessment.courseCode} — {assessment.courseName}
										</p>
										<p class="text-sm text-muted-foreground mt-1">
											Duration: {assessment.duration} minutes
										</p>
									</div>
									<div class="text-right whitespace-nowrap ml-4">
										<p class="font-medium">
											{formatDate(assessment.startTime)}
										</p>
										<p class="text-sm text-muted-foreground">
											{new Date(assessment.startTime).toLocaleTimeString('en-US', {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</p>
										<Button href={`/lecturer/assessments/${assessment.id}`} size="sm" variant="ghost" class="mt-3">
											View Details
											<ChevronRight class="ml-2 size-4" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="rounded-lg border border-dashed p-12 text-center">
							<CheckCircle class="mx-auto size-10 text-muted-foreground mb-3" />
							<p class="text-muted-foreground">No assessments scheduled</p>
							<Button href="/lecturer/assessments/create/exam" size="sm" variant="outline" class="mt-4">
								Create Assessment
							</Button>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Performance Tab -->
		<TabsContent value="performance" class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<Card class="md:col-span-2">
					<CardHeader class="pb-3">
						<CardTitle class="flex items-center gap-2">
							<TrendingUp class="size-5" />
							Course Performance Overview
						</CardTitle>
						<CardDescription>Student performance across your courses</CardDescription>
					</CardHeader>
					<CardContent>
						{#if data?.coursePerformance && data.coursePerformance.length > 0}
							<div class="space-y-6">
								{#each data.coursePerformance as course}
									<div class="space-y-2">
										<div class="flex items-center justify-between">
											<div>
												<h4 class="font-medium">{course.code} — {course.name}</h4>
												<p class="text-sm text-muted-foreground">
													{course.students} students • {course.assessments} assessments
												</p>
											</div>
											<div class="text-right">
												<p class="font-bold text-lg">{course.avgScore}%</p>
												<p class="text-sm text-muted-foreground">Pass rate: {course.passRate}%</p>
											</div>
										</div>
										<Progress value={course.avgScore} class="h-2" />
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-muted-foreground py-4">No course performance data yet</p>
						{/if}
					</CardContent>
				</Card>

				<Card class="md:col-span-2">
					<CardHeader class="pb-3">
						<CardTitle class="flex items-center gap-2">
							<FileText class="size-5" />
							Recent Assessment Statistics
						</CardTitle>
						<CardDescription>Performance metrics from your recent assessments</CardDescription>
					</CardHeader>
					<CardContent>
						{#if data?.assessmentStats && data.assessmentStats.length > 0}
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Assessment</TableHead>
										<TableHead>Type</TableHead>
										<TableHead class="text-right">Completed</TableHead>
										<TableHead class="text-right">Avg Score</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each data.assessmentStats as stat}
										<TableRow>
											<TableCell class="max-w-xs">
												<div class="font-medium">{stat.title}</div>
												<div class="text-sm text-muted-foreground">{stat.courseCode}</div>
											</TableCell>
											<TableCell>
												<Badge class={getTypeColor(stat.type)} variant="outline">
													{stat.type}
												</Badge>
											</TableCell>
											<TableCell class="text-right">{stat.completions}</TableCell>
											<TableCell class="text-right font-medium">{stat.avgScore}%</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						{:else}
							<p class="text-muted-foreground py-4">No assessment data yet</p>
						{/if}
					</CardContent>
				</Card>
			</div>
		</TabsContent>

		<!-- Activity Tab -->
		<TabsContent value="activity" class="space-y-6">
			<Card>
				<CardHeader class="pb-3">
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>Your recent actions in the system</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data?.recentActivity && data.recentActivity.length > 0}
						<div class="space-y-4">
							{#each data.recentActivity as activity}
								<div class="flex items-center justify-between border-b pb-4 last:border-0">
									<div>
										<p class="font-medium">{activity.action}</p>
										<p class="text-sm text-muted-foreground">{activity.entity}</p>
									</div>
									<span class="text-sm text-muted-foreground">
										{new Date(activity.createdAt).toLocaleDateString()} {new Date(
											activity.createdAt
										).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground py-4">No recent activity</p>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>

	<!-- Quick Actions -->
	<Card class="bg-muted/30 border-border">
		<CardHeader class="pb-3">
			<CardTitle class="flex items-center gap-2">
				<Play class="size-5" />
				Quick Actions
			</CardTitle>
			<CardDescription>Common tasks to manage your courses</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-3 sm:grid-cols-4">
				<Button href="/lecturer/assessments/create/exam" variant="outline" size="default" class="justify-center">
					Create Exam
				</Button>
				<Button href="/lecturer/assessments/create/test" variant="outline" size="default" class="justify-center">
					Create Test
				</Button>
				<Button href="/lecturer/question-bank" variant="outline" size="default" class="justify-center">
					Question Bank
				</Button>
				<Button href="/lecturer/grade" variant="outline" size="default" class="justify-center">
					Grade Submissions
				</Button>
			</div>
		</CardContent>
	</Card>
</div>