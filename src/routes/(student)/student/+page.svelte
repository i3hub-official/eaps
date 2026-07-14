<!-- src/routes/student/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import FaceEnrollPrompt from '$lib/components/dashboard/face-enroll-prompt.svelte';
	import FaceVerifyPrompt from '$lib/components/dashboard/face-verify-prompt.svelte';
	import {
		BookOpen,
		Clock,
		FileCheck,
		GraduationCap,
		CalendarDays,
		AlertCircle,
		ChevronRight,
		CheckCircle,
		XCircle,
		LoaderCircle,
		BarChart3,
		ClipboardList,
		ArrowRight,
		RefreshCw,
		User,
		Building2,
		Mail,
		Phone,
		MapPin,
		ScanFace,
		FileText,
		Check,
		X,
		History,
	} from '@lucide/svelte';
	import { format } from '$lib/utils/date';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let activeTab = $state('overview');

	// ─── Student Data ────────────────────────────────────────────────────────
	let student = $derived(data?.student);
	let dashboard = $derived(data?.dashboard);
	let recentAssessments = $derived(data?.recentAssessments || []);
	let upcomingAssessments = $derived(data?.upcomingAssessments || []);
	let courseRegistrations = $derived(data?.courseRegistrations || []);
	let notifications = $derived(data?.notifications || []);

	// Gate: a student with no enrolled face descriptor can't start any
	// assessment, regardless of type. Checked once here and reused by every
	// "Start"/"Continue" button on this page instead of repeating the
	// `!student?.faceEnrolled` check at each call site.
	let faceEnrolled = $derived(student?.faceEnrolled ?? false);

	// ─── Computed ────────────────────────────────────────────────────────────
	let fullName = $derived(
		student ? `${student.lastName} ${student.firstName} ${student.otherNames}` : ''
	);

	let completedCount = $derived(
		recentAssessments.filter((a: any) => a.status === 'SUBMITTED').length
	);

	let pendingCount = $derived(
		recentAssessments.filter((a: any) => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length
	);

	// Enroll banner shows while there's no face data at all. Verify banner
	// only makes sense once enrolled AND something upcoming actually
	// requires it — the two are mutually exclusive by construction.
	let nextVerifiableAssessment = $derived(
		student?.faceEnrolledAt
			? (upcomingAssessments.find((a: any) => a.requireFaceVerify) ?? null)
			: null
	);

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { variant: string; label: string }> = {
			PENDING: { variant: 'warning', label: 'Pending' },
			IN_PROGRESS: { variant: 'info', label: 'In Progress' },
			SUBMITTED: { variant: 'success', label: 'Submitted' },
			TIMED_OUT: { variant: 'destructive', label: 'Timed Out' },
			DISQUALIFIED: { variant: 'destructive', label: 'Disqualified' },
		};
		return variants[status] || { variant: 'secondary', label: status };
	}

	function getAssessmentTypeBadge(type: string) {
		const variants: Record<string, { variant: string; label: string }> = {
			PRACTICE: { variant: 'secondary', label: 'Practice' },
			ASSIGNMENT: { variant: 'info', label: 'Assignment' },
			TEST: { variant: 'warning', label: 'Test' },
			EXAMINATION: { variant: 'destructive', label: 'Exam' },
		};
		return variants[type] || { variant: 'secondary', label: type };
	}

	function getGradeColor(grade: string) {
		const colors: Record<string, string> = {
			A: 'text-green-600 dark:text-green-400',
			B: 'text-blue-600 dark:text-blue-400',
			C: 'text-yellow-600 dark:text-yellow-400',
			D: 'text-orange-600 dark:text-orange-400',
			E: 'text-red-600 dark:text-red-400',
			F: 'text-red-700 dark:text-red-500',
		};
		return colors[grade] || 'text-muted-foreground';
	}

	// ─── Action Handlers ────────────────────────────────────────────────────
	async function markNotificationRead(notificationId: string) {
		const notification = notifications.find((n: any) => n.id === notificationId);
		if (notification) {
			notification.isRead = true;
		}

		const formData = new FormData();
		formData.append('notificationId', notificationId);
		await fetch('?/markNotificationRead', {
			method: 'POST',
			body: formData,
		});
	}
</script>

<svelte:head>
	<title>Dashboard — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Dashboard" description="Welcome back, {student?.firstName || 'Student'}">
	{#snippet actions()}
		<Button
			variant="outline"
			size="sm"
			onclick={handleRefresh}
			disabled={isRefreshing}
		>
			{#if isRefreshing}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<RefreshCw class="size-4" />
			{/if}
			Refresh
		</Button>
	{/snippet}
</Topbar>

<div class="p-6">
	<div class="mb-6 flex flex-col gap-4">
		<FaceEnrollPrompt enrolled={student?.faceEnrolled ?? false} />
		<FaceVerifyPrompt assessment={nextVerifiableAssessment} />
	</div>

	{#if data?.loading}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each [1, 2, 3, 4] as item (item)}
				<Card>
					<CardHeader>
						<Skeleton class="h-4 w-24" />
					</CardHeader>
					<CardContent>
						<Skeleton class="h-8 w-16" />
						<Skeleton class="mt-2 h-3 w-32" />
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if data?.error}
		<Card class="border-destructive/30 bg-destructive/10">
			<CardContent class="flex items-center gap-4 py-6">
				<AlertCircle class="size-8 text-destructive" />
				<div>
					<p class="font-semibold text-destructive">Failed to load dashboard</p>
					<p class="text-sm text-muted-foreground">{data.error}</p>
					<Button variant="outline" size="sm" class="mt-3" onclick={handleRefresh}>
						Try Again
					</Button>
				</div>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Current GPA</CardTitle>
					<GraduationCap class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{dashboard?.currentGPA?.toFixed(2) ?? '—'}
					</div>
					<p class="text-xs text-muted-foreground">
						{dashboard?.creditUnitsCompleted ?? 0} credits completed
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Assessments</CardTitle>
					<ClipboardList class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{dashboard?.totalAssessments ?? 0}</div>
					<p class="text-xs text-muted-foreground">
						{completedCount} completed · {pendingCount} pending
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Courses Registered</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{courseRegistrations?.length ?? 0}</div>
					<p class="text-xs text-muted-foreground">
						{dashboard?.totalCreditUnits ?? 0} total credit units
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Notifications</CardTitle>
					<AlertCircle class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{notifications?.filter((n: any) => !n.isRead).length ?? 0}
					</div>
					<p class="text-xs text-muted-foreground">
						{notifications?.length ?? 0} total notifications
					</p>
				</CardContent>
			</Card>
		</div>

		<Tabs bind:value={activeTab} class="mt-8">
			<TabsList class="mb-6">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="assessments">Assessments</TabsTrigger>
				<TabsTrigger value="courses">Courses</TabsTrigger>
				<TabsTrigger value="profile">Profile</TabsTrigger>
			</TabsList>

			<TabsContent value="overview">
				<div class="grid gap-6 md:grid-cols-3">
					<Card class="md:col-span-2">
						<CardHeader>
							<CardTitle class="text-base">Upcoming Assessments</CardTitle>
							<CardDescription>Your scheduled tests and examinations</CardDescription>
						</CardHeader>
						<CardContent>
							{#if upcomingAssessments?.length > 0}
								<div class="space-y-4">
									{#each upcomingAssessments.slice(0, 3) as assessment (assessment.id)}
										<div class="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
											<div class="flex flex-col gap-0.5">
												<span class="font-medium">{assessment.title}</span>
												<div class="flex items-center gap-2 text-sm text-muted-foreground">
													<Badge variant={getAssessmentTypeBadge(assessment.type).variant}>
														{getAssessmentTypeBadge(assessment.type).label}
													</Badge>
													<span class="text-muted-foreground">•</span>
													<Clock class="size-3 text-muted-foreground" />
													<span>{format(new Date(assessment.startTime), 'PPp')}</span>
												</div>
											</div>
											{#if !faceEnrolled}
												<Button
													variant="outline"
													size="sm"
													disabled
													title="Enroll your face to start assessments"
												>
													<ScanFace class="mr-1 size-3" /> Enroll required
												</Button>
											{:else}
												<Button variant="outline" size="sm" href={`/student/assessment/${assessment.id}`}>
													Start <ArrowRight class="ml-1 size-3" />
												</Button>
											{/if}
										</div>
									{/each}
									{#if upcomingAssessments.length > 3}
										<Button variant="ghost" size="sm" class="w-full text-muted-foreground">
											View all {upcomingAssessments.length} upcoming
										</Button>
									{/if}
								</div>
							{:else}
								<p class="py-6 text-center text-sm text-muted-foreground">
									No upcoming assessments. Check back later.
								</p>
							{/if}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle class="text-base">Recent Activity</CardTitle>
							<CardDescription>Your latest interactions</CardDescription>
						</CardHeader>
						<CardContent>
							{#if recentAssessments?.length > 0}
								<div class="space-y-4">
									{#each recentAssessments.slice(0, 4) as assessment (assessment.id)}
										<div class="flex items-start gap-3">
											{#if assessment.status === 'SUBMITTED'}
												<CheckCircle class="mt-0.5 size-4 text-green-500" />
											{:else if assessment.status === 'DISQUALIFIED'}
												<XCircle class="mt-0.5 size-4 text-red-500" />
											{:else}
												<Clock class="mt-0.5 size-4 text-yellow-500" />
											{/if}
											<div class="flex-1">
												<p class="text-sm font-medium">{assessment.title}</p>
												<p class="text-xs text-muted-foreground">
													{getStatusBadge(assessment.status).label} · {format(new Date(assessment.createdAt), 'PP')}
												</p>
												{#if assessment.result?.grade}
													<Badge variant="outline" class={getGradeColor(assessment.result.grade)}>
														{assessment.result.grade} ({assessment.result.percentage?.toFixed(1)}%)
													</Badge>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="py-6 text-center text-sm text-muted-foreground">
									No recent activity yet.
								</p>
							{/if}
						</CardContent>
					</Card>

					<Card class="md:col-span-3">
						<CardHeader>
							<CardTitle class="text-base">Notifications</CardTitle>
							<CardDescription>Important updates and reminders</CardDescription>
						</CardHeader>
						<CardContent>
							{#if notifications?.length > 0}
								<div class="space-y-3">
									{#each notifications.slice(0, 5) as notification (notification.id)}
										<div class="flex items-start gap-3 rounded-lg border border-border/50 p-3 {!notification.isRead ? 'bg-muted/40' : ''}">
											<div class="mt-0.5 size-2 rounded-full {notification.isRead ? 'bg-muted' : 'bg-primary'}" />
											<div class="flex-1">
												<p class="text-sm font-medium">{notification.title}</p>
												<p class="text-sm text-muted-foreground">{notification.body}</p>
												<p class="text-xs text-muted-foreground/70">
													{format(new Date(notification.createdAt), 'PPp')}
												</p>
											</div>
											{#if !notification.isRead}
												<Button 
													variant="ghost" 
													size="sm" 
													class="h-8 text-xs"
													onclick={() => markNotificationRead(notification.id)}
												>
													Mark read
												</Button>
											{/if}
										</div>
									{/each}
								</div>
							{:else}
								<p class="py-6 text-center text-sm text-muted-foreground">
									No notifications
								</p>
							{/if}
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			<TabsContent value="assessments">
				<Card>
					<CardHeader>
						<CardTitle class="text-base">All Assessments</CardTitle>
						<CardDescription>Complete history of your assessments</CardDescription>
					</CardHeader>
					<CardContent>
						{#if !faceEnrolled}
							<div class="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
								<ScanFace class="size-4 shrink-0" />
								<span>Enroll your face to start or continue any assessment.</span>
							</div>
						{/if}
						{#if recentAssessments?.length > 0}
							<div class="space-y-3">
								{#each recentAssessments as assessment (assessment.id)}
									<div class="flex items-center justify-between rounded-lg border border-border p-3">
										<div class="flex flex-col gap-0.5">
											<span class="font-medium">{assessment.title}</span>
											<div class="flex items-center gap-3 text-sm text-muted-foreground">
												<Badge variant={getAssessmentTypeBadge(assessment.type).variant}>
													{getAssessmentTypeBadge(assessment.type).label}
												</Badge>
												<Badge variant={getStatusBadge(assessment.status).variant}>
													{getStatusBadge(assessment.status).label}
												</Badge>
												<span>{format(new Date(assessment.createdAt), 'PP')}</span>
											</div>
										</div>
										{#if assessment.result}
											<div class="text-right">
												<span class="text-lg font-bold {getGradeColor(assessment.result.grade)}">
													{assessment.result.grade}
												</span>
												<p class="text-xs text-muted-foreground">
													{assessment.result.percentage?.toFixed(1)}% ({assessment.result.marksObtained}/{assessment.result.totalMarks})
												</p>
											</div>
										{:else if !faceEnrolled}
											<Button variant="outline" size="sm" disabled title="Enroll your face to continue">
												<ScanFace class="mr-1 size-3" /> Enroll required
											</Button>
										{:else}
											<Button variant="outline" size="sm" href={`/student/assessment/${assessment.id}`}>
												Continue
											</Button>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No assessments found</p>
						{/if}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="courses">
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Registered Courses</CardTitle>
						<CardDescription>Current semester course registration</CardDescription>
					</CardHeader>
					<CardContent>
						{#if courseRegistrations?.length > 0}
							<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{#each courseRegistrations as reg (reg.id)}
									<div class="rounded-lg border border-border p-4">
										<h4 class="font-semibold">{reg.course.code}</h4>
										<p class="text-sm text-muted-foreground">{reg.course.title}</p>
										<div class="mt-2 flex items-center justify-between text-sm">
											<span class="text-muted-foreground">Status: 
												<Badge variant={reg.status === 'APPROVED' ? 'success' : reg.status === 'PENDING' ? 'warning' : 'destructive'}>
													{reg.status}
												</Badge>
											</span>
											<span class="text-muted-foreground">{reg.course.creditUnits} units</span>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-muted-foreground">No courses registered</p>
						{/if}
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Profile Tab - Updated with icons -->
<TabsContent value="profile">
	<Card>
		<CardHeader>
			<CardTitle class="text-base">Student Profile</CardTitle>
			<CardDescription>Your personal and academic information</CardDescription>
		</CardHeader>
		<CardContent class="grid gap-6 md:grid-cols-2">
			{#if student}
				<div class="space-y-4">
					<div>
						<label class="text-sm font-medium text-muted-foreground">Full Name</label>
						<p class="flex items-center gap-2 text-lg font-semibold">
							<User class="size-4 text-muted-foreground" />
							{fullName}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Matric Number</label>
						<p class="flex items-center gap-2 font-mono">
							<FileText class="size-4 text-muted-foreground" />
							{student.matricNumber}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Email</label>
						<p class="flex items-center gap-2">
							<Mail class="size-4 text-muted-foreground" />
							{student.email}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Phone</label>
						<p class="flex items-center gap-2">
							<Phone class="size-4 text-muted-foreground" />
							{student.phone || 'Not provided'}
						</p>
					</div>
				</div>
				<div class="space-y-4">
					<div>
						<label class="text-sm font-medium text-muted-foreground">Department</label>
						<p class="flex items-center gap-2">
							<Building2 class="size-4 text-muted-foreground" />
							{student.department?.name || '—'}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Programme</label>
						<p class="flex items-center gap-2">
							<GraduationCap class="size-4 text-muted-foreground" />
							{student.programme?.name || '—'}
							{#if student.programme?.shortName}
								<span class="text-sm text-muted-foreground">({student.programme.shortName})</span>
							{/if}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Current Level</label>
						<p class="flex items-center gap-2">
							<BookOpen class="size-4 text-muted-foreground" />
							{student.currentLevel?.label || '—'}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Entry Year</label>
						<p class="flex items-center gap-2">
							<CalendarDays class="size-4 text-muted-foreground" />
							{student.entryYear || '—'}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-muted-foreground">Status</label>
						<p class="flex items-center gap-2">
							{#if student.status === 'ACTIVE'}
								<CheckCircle class="size-4 text-green-500" />
							{:else}
								<XCircle class="size-4 text-red-500" />
							{/if}
							<Badge variant={student.status === 'ACTIVE' ? 'success' : 'destructive'}>
								{student.status}
							</Badge>
						</p>
					</div>
				</div>
			{:else}
				<p class="col-span-2 text-center text-muted-foreground">Profile data not available</p>
			{/if}
		</CardContent>
	</Card>
</TabsContent>
		</Tabs>
	{/if}
</div>