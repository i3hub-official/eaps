<!-- src/routes/(admin)/admin/analytics/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		BarChart3,
		Users,
		GraduationCap,
		BookOpen,
		FileText,
		TrendingUp,
		TrendingDown,
		Download,
		Calendar,
		UserCheck,
		UserX,
		CheckCircle,
		Clock,
	} from '@lucide/svelte/icons';

	let { data } = $props();

	const { stats, distribution, trends } = data

	function formatMonth(date: Date) {
		return new Date(date).toLocaleDateString('en-NG', { 
			month: 'short', 
			year: 'numeric' 
		})
	}
</script>

<svelte:head>
	<title>Analytics — EAPS</title>
</svelte:head>

<Topbar title="Analytics" description="Platform-wide analytics and insights">
	{#snippet actions()}
		<Button variant="outline" size="sm">
			<Download class="mr-2 size-4" />
			Export Report
		</Button>
		<Button variant="outline" size="sm">
			<Calendar class="mr-2 size-4" />
			Last 30 Days
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{:else}
		<!-- Overview Stats -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.students?.total || 0}</div>
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<UserCheck class="size-3 text-green-500" />
						<span>{stats?.students?.active || 0} active</span>
						<UserX class="size-3 text-red-500" />
						<span>{stats?.students?.inactive || 0} inactive</span>
					</div>
					<Progress value={(stats?.students?.active / stats?.students?.total) * 100} class="mt-2 h-1.5" />
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Staff</CardTitle>
					<GraduationCap class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.staff?.total || 0}</div>
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<UserCheck class="size-3 text-green-500" />
						<span>{stats?.staff?.active || 0} active</span>
						<UserX class="size-3 text-red-500" />
						<span>{stats?.staff?.inactive || 0} inactive</span>
					</div>
					<Progress value={(stats?.staff?.active / stats?.staff?.total) * 100} class="mt-2 h-1.5" />
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Courses</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.courses?.total || 0}</div>
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<CheckCircle class="size-3 text-green-500" />
						<span>{stats?.courses?.active || 0} active</span>
						<Clock class="size-3 text-yellow-500" />
						<span>{stats?.courses?.inactive || 0} inactive</span>
					</div>
					<Progress value={(stats?.courses?.active / stats?.courses?.total) * 100} class="mt-2 h-1.5" />
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Assessments</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.assessments?.total || 0}</div>
					<p class="text-xs text-muted-foreground">total assessments created</p>
				</CardContent>
			</Card>
		</div>

		<!-- Registration Stats -->
		<div class="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Course Registrations</CardTitle>
					<CardDescription>Current registration status</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="text-3xl font-bold">{stats?.registrations?.total || 0}</div>
					<div class="mt-4 space-y-2">
						<div>
							<div class="flex items-center justify-between text-sm">
								<span>Approved</span>
								<span>{stats?.registrations?.approved || 0}</span>
							</div>
							<Progress value={(stats?.registrations?.approved / stats?.registrations?.total) * 100} class="h-1.5" />
						</div>
						<div>
							<div class="flex items-center justify-between text-sm">
								<span>Pending</span>
								<span>{stats?.registrations?.pending || 0}</span>
							</div>
							<Progress value={(stats?.registrations?.pending / stats?.registrations?.total) * 100} class="h-1.5" />
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Assessment Distribution</CardTitle>
					<CardDescription>By type and status</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div>
							<h4 class="text-sm font-medium text-muted-foreground mb-2">By Type</h4>
							<div class="grid grid-cols-2 gap-2">
								{#each distribution?.assessmentByType || [] as item}
									<Badge variant="outline" class="justify-between">
										{item.type}
										<span class="ml-2 font-bold">{item._count.type}</span>
									</Badge>
								{/each}
							</div>
						</div>
						<div>
							<h4 class="text-sm font-medium text-muted-foreground mb-2">By Status</h4>
							<div class="flex flex-wrap gap-2">
								{#each distribution?.assessmentByStatus || [] as item}
									<Badge variant="outline" class="justify-between">
										{item.status}
										<span class="ml-2 font-bold">{item._count.status}</span>
									</Badge>
								{/each}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Monthly Trends -->
		<div class="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Monthly Student Growth</CardTitle>
					<CardDescription>New students per month</CardDescription>
				</CardHeader>
				<CardContent>
					{#if trends?.monthlyStudents?.length > 0}
						<div class="space-y-2 max-h-[200px] overflow-y-auto">
							{#each trends.monthlyStudents as item}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span>{formatMonth(item.month)}</span>
										<span className="font-medium">{item.count}</span>
									</div>
									<Progress value={(item.count / Math.max(...trends.monthlyStudents.map((m: any) => m.count))) * 100} class="h-1.5" />
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No data available</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Monthly Registrations</CardTitle>
					<CardDescription>Course registrations per month</CardDescription>
				</CardHeader>
				<CardContent>
					{#if trends?.monthlyRegistrations?.length > 0}
						<div class="space-y-2 max-h-[200px] overflow-y-auto">
							{#each trends.monthlyRegistrations as item}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span>{formatMonth(item.month)}</span>
										<span className="font-medium">{item.count}</span>
									</div>
									<Progress value={(item.count / Math.max(...trends.monthlyRegistrations.map((m: any) => m.count))) * 100} class="h-1.5" />
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No data available</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
</main>