<!-- src/routes/(lecturer)/lecturer/report/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		FileBarChart,
		Users,
		ClipboardCheck,
		TrendingUp,
		Calendar,
		Download,
		Eye,
		Clock,
		CheckCircle2,
		XCircle,
		AlertCircle,
		ChevronRight,
	} from '@lucide/svelte/icons';

	let { data } = $props();

	// Stats data
	const stats = [
		{
			title: 'Total Assessments',
			value: data?.totalAssessments ?? 0,
			change: '+12%',
			icon: FileBarChart,
			color: 'text-blue-500',
			bg: 'bg-blue-50 dark:bg-blue-950/30',
		},
		{
			title: 'Total Students',
			value: data?.totalStudents ?? 0,
			change: '+8%',
			icon: Users,
			color: 'text-green-500',
			bg: 'bg-green-50 dark:bg-green-950/30',
		},
		{
			title: 'Completion Rate',
			value: `${data?.completionRate ?? 0}%`,
			change: '+5%',
			icon: ClipboardCheck,
			color: 'text-purple-500',
			bg: 'bg-purple-50 dark:bg-purple-950/30',
		},
		{
			title: 'Average Score',
			value: `${data?.averageScore ?? 0}%`,
			change: '+3%',
			icon: TrendingUp,
			color: 'text-amber-500',
			bg: 'bg-amber-50 dark:bg-amber-950/30',
		},
	];

	// Recent assessments
	const recentAssessments = data?.recentAssessments ?? [];

	// Performance by course
	const coursePerformance = data?.coursePerformance ?? [];

	// Activity timeline
	const activities = data?.activities ?? [];

	function getStatusBadge(status: string) {
		const variants: Record<string, string> = {
			COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
			IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
			PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		};
		return variants[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
	}
</script>

<svelte:head>
	<title>Reports — EAPS</title>
</svelte:head>

<Topbar title="Reports" description="Overview of assessment performance and analytics">
	{#snippet actions()}
		<Button variant="outline" size="sm">
			<Calendar class="mr-2 size-4" />
			Filter by Date
		</Button>
		<Button size="sm">
			<Download class="mr-2 size-4" />
			Export Report
		</Button>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 space-y-4 sm:space-y-6">
	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat (stat.title)}
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">{stat.title}</CardTitle>
					<div class={`rounded-lg p-2 ${stat.bg}`}>
						<svelte:component this={stat.icon} class={`size-4 ${stat.color}`} />
					</div>
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stat.value}</div>
					<p class="text-xs text-muted-foreground">
						<span class="text-green-500">{stat.change}</span> from last month
					</p>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Charts Row -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- Assessment Status Distribution -->
		<Card class="lg:col-span-1">
			<CardHeader>
				<CardTitle>Assessment Status</CardTitle>
				<CardDescription>Distribution of all assessments</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					<div>
						<div class="flex items-center justify-between text-sm">
							<span>Published</span>
							<span class="font-medium">{data?.statusDistribution?.published ?? 0}</span>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								class="h-2 rounded-full bg-green-500 transition-all"
								style="width: {data?.statusDistribution?.publishedPercent ?? 0}%"
							/>
						</div>
					</div>
					<div>
						<div class="flex items-center justify-between text-sm">
							<span>In Progress</span>
							<span class="font-medium">{data?.statusDistribution?.inProgress ?? 0}</span>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								class="h-2 rounded-full bg-blue-500 transition-all"
								style="width: {data?.statusDistribution?.inProgressPercent ?? 0}%"
							/>
						</div>
					</div>
					<div>
						<div class="flex items-center justify-between text-sm">
							<span>Completed</span>
							<span class="font-medium">{data?.statusDistribution?.completed ?? 0}</span>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								class="h-2 rounded-full bg-purple-500 transition-all"
								style="width: {data?.statusDistribution?.completedPercent ?? 0}%"
							/>
						</div>
					</div>
					<div>
						<div class="flex items-center justify-between text-sm">
							<span>Draft</span>
							<span class="font-medium">{data?.statusDistribution?.draft ?? 0}</span>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								class="h-2 rounded-full bg-gray-400 transition-all"
								style="width: {data?.statusDistribution?.draftPercent ?? 0}%"
							/>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Course Performance -->
		<Card class="lg:col-span-2">
			<CardHeader>
				<CardTitle>Performance by Course</CardTitle>
				<CardDescription>Average scores across your courses</CardDescription>
			</CardHeader>
			<CardContent>
				{#if coursePerformance.length > 0}
					<div class="max-h-[200px] overflow-y-auto space-y-4 pr-2">
						{#each coursePerformance as course (course.code)}
							<div>
								<div class="flex items-center justify-between text-sm">
									<div>
										<span class="font-medium">{course.code}</span>
										<span class="ml-2 text-muted-foreground">{course.title}</span>
									</div>
									<span class="font-medium">{course.score}%</span>
								</div>
								<div class="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
									<div
										class="h-2 rounded-full transition-all"
										class:bg-green-500={course.score >= 70}
										class:bg-blue-500={course.score >= 50 && course.score < 70}
										class:bg-yellow-500={course.score >= 40 && course.score < 50}
										class:bg-red-500={course.score < 40}
										style="width: {course.score}%"
									/>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-8 text-center text-muted-foreground">
						<FileBarChart class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p class="text-sm">No course performance data available</p>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Recent Assessments & Activity -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- Recent Assessments -->
		<Card class="lg:col-span-2">
			<CardHeader>
				<CardTitle>Recent Assessments</CardTitle>
				<CardDescription>Latest assessments and their status</CardDescription>
			</CardHeader>
			<CardContent>
				{#if recentAssessments.length > 0}
					<div class="max-h-[320px] overflow-y-auto space-y-3 pr-2">
						{#each recentAssessments as assessment (assessment.id)}
							<a
								href={`/lecturer/assessments/${assessment.id}`}
								class="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
							>
								<div class="flex min-w-0 items-center gap-3">
									<div class="min-w-0">
										<p class="truncate font-medium">{assessment.title}</p>
										<p class="text-xs text-muted-foreground">
											{assessment.courseCode} · {assessment.students} students
										</p>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<Badge class={getStatusBadge(assessment.status)}>{assessment.status}</Badge>
									<span class="text-sm font-medium">{assessment.score}%</span>
									<ChevronRight class="size-4 text-muted-foreground" />
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<div class="py-8 text-center text-muted-foreground">
						<ClipboardCheck class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p class="text-sm">No recent assessments</p>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Activity Timeline -->
		<Card>
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
				<CardDescription>Latest actions and events</CardDescription>
			</CardHeader>
			<CardContent>
				{#if activities.length > 0}
					<div class="max-h-[320px] overflow-y-auto space-y-4 pr-2">
						{#each activities as activity, index (activity.id)}
							<div class="flex gap-3">
								<div class="flex flex-col items-center">
									<div class="rounded-full p-1.5" class:bg-blue-50={activity.type === 'assessment'} class:bg-green-50={activity.type === 'student'} class:bg-yellow-50={activity.type === 'grade'}>
										{#if activity.type === 'assessment'}
											<FileBarChart class="size-3 text-blue-500" />
										{:else if activity.type === 'student'}
											<Users class="size-3 text-green-500" />
										{:else if activity.type === 'grade'}
											<TrendingUp class="size-3 text-yellow-500" />
										{/if}
									</div>
									{#if index < activities.length - 1}
										<div class="h-full w-px bg-border" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm">{activity.message}</p>
									<p class="text-xs text-muted-foreground">{activity.time}</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-8 text-center text-muted-foreground">
						<Clock class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p class="text-sm">No recent activity</p>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>