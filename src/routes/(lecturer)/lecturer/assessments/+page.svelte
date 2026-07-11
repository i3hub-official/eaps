<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		FileText,
		Search,
		Plus,
		Users,
		Calendar,
		Eye,
		Edit,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		TrendingUp,
		Clock,
		CheckCircle,
		XCircle,
		BarChart3,
		FileCheck,
		ClipboardList,
		GraduationCap,
		ChevronDown,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterType = $state('all');
	let filterStatus = $state('all');
	let activeTab = $state('overview');

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let assessments = $derived(data?.assessments || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredAssessments = $derived(
		assessments.filter(a => {
			const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesType = filterType === 'all' || a.type === filterType;
			const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
			return matchesSearch && matchesType && matchesStatus;
		})
	);

	let types = $derived([...new Set(assessments.map(a => a.type))]);
	let statuses = $derived([...new Set(assessments.map(a => a.status))]);

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function getTypeBadge(type: string) {
		const variants: Record<string, { variant: string; label: string }> = {
			EXAMINATION: { variant: 'destructive', label: 'Exam' },
			TEST: { variant: 'warning', label: 'Test' },
			ASSIGNMENT: { variant: 'info', label: 'Assignment' },
			PRACTICE: { variant: 'secondary', label: 'Practice' },
		};
		return variants[type] || { variant: 'secondary', label: type };
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { variant: string; label: string }> = {
			DRAFT: { variant: 'secondary', label: 'Draft' },
			PUBLISHED: { variant: 'info', label: 'Published' },
			SCHEDULED: { variant: 'warning', label: 'Scheduled' },
			ACTIVE: { variant: 'success', label: 'Active' },
			ENDED: { variant: 'default', label: 'Ended' },
			CANCELLED: { variant: 'destructive', label: 'Cancelled' },
		};
		return variants[status] || { variant: 'secondary', label: status };
	}

	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
			PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
			SCHEDULED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
			ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
			ENDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
			CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		};
		return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
	}

	// ─── Schedule display ─────────────────────────────────────────────────────
	function formatSchedule(date: Date | string | null | undefined) {
		if (!date) return null;
		return new Date(date).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	type ScheduleTone = 'default' | 'warning' | 'success' | 'muted';

	function getScheduleLabel(assessment: {
		status: string;
		type: string;
		startTime: any;
		endTime: any;
		dueDate: any;
	}): { label: string; tone: ScheduleTone } | null {
		const { status, type, startTime, endTime, dueDate } = assessment;

		if (type === 'ASSIGNMENT' && dueDate) {
			return { label: `Due ${formatSchedule(dueDate)}`, tone: 'default' };
		}

		switch (status) {
			case 'DRAFT':
				return startTime
					? { label: `Planned for ${formatSchedule(startTime)}`, tone: 'default' }
					: null;
			case 'SCHEDULED':
				return startTime
					? { label: `Opens ${formatSchedule(startTime)}`, tone: 'warning' }
					: { label: 'Awaiting start time', tone: 'warning' };
			case 'ACTIVE':
				return endTime
					? { label: `Closes ${formatSchedule(endTime)}`, tone: 'success' }
					: { label: 'Open now', tone: 'success' };
			case 'ENDED':
				return endTime
					? { label: `Ended ${formatSchedule(endTime)}`, tone: 'muted' }
					: { label: 'Ended', tone: 'muted' };
			case 'PUBLISHED':
				return startTime
					? { label: `Starts ${formatSchedule(startTime)}`, tone: 'default' }
					: { label: 'Published', tone: 'default' };
			default:
				return null; // CANCELLED — nothing to schedule
		}
	}

	function scheduleToneClass(tone: ScheduleTone) {
		const map: Record<ScheduleTone, string> = {
			default: 'text-muted-foreground',
			warning: 'text-yellow-600 dark:text-yellow-400',
			success: 'text-green-600 dark:text-green-400',
			muted: 'text-muted-foreground/70',
		};
		return map[tone];
	}

	// ─── Sorting: Active first, then Scheduled, then Draft, by nearest date ───
	function getUrgencyDate(assessment: {
		status: string;
		type: string;
		startTime: any;
		endTime: any;
		dueDate: any;
	}): Date | null {
		const { status, type, startTime, endTime, dueDate } = assessment;

		if (type === 'ASSIGNMENT' && dueDate && status !== 'ENDED' && status !== 'CANCELLED') {
			return new Date(dueDate);
		}

		switch (status) {
			case 'DRAFT':
				return startTime ? new Date(startTime) : null;
			case 'SCHEDULED':
				return startTime ? new Date(startTime) : null;
			case 'ACTIVE':
				return endTime ? new Date(endTime) : null;
			case 'PUBLISHED':
				return startTime ? new Date(startTime) : null;
			default:
				return null; // ENDED, CANCELLED
		}
	}

	const STATUS_PRIORITY: Record<string, number> = {
		ACTIVE: 0,
		SCHEDULED: 1,
		DRAFT: 2,
		PUBLISHED: 3,
		ENDED: 4,
		CANCELLED: 5,
	};

	function sortByUrgency<T extends { status: string; type: string; startTime: any; endTime: any; dueDate: any }>(
		list: T[]
	): T[] {
		return [...list].sort((a, b) => {
			const priorityA = STATUS_PRIORITY[a.status] ?? 99;
			const priorityB = STATUS_PRIORITY[b.status] ?? 99;

			if (priorityA !== priorityB) return priorityA - priorityB;

			// Same tier — sort by nearest relevant date, soonest first
			const dateA = getUrgencyDate(a);
			const dateB = getUrgencyDate(b);
			const timeA = dateA ? dateA.getTime() : Infinity;
			const timeB = dateB ? dateB.getTime() : Infinity;

			return timeA - timeB;
		});
	}

	let sortedAssessments = $derived(sortByUrgency(filteredAssessments));
</script>

<svelte:head>
	<title>Assessments — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Assessments" description="Manage and monitor all your assessments">
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
		
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm">
					<Plus class="mr-2 size-4" />
					New Assessment
					<ChevronDown class="ml-2 size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-56">
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/assessments/create/exam'}
					class="gap-3 cursor-pointer"
				>
					<FileCheck class="size-4 text-destructive" />
					<div class="flex-1">
						<p class="font-medium">Exam</p>
						<p class="text-xs text-muted-foreground">Full examination (70 marks)</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/assessments/create/test'}
					class="gap-3 cursor-pointer"
				>
					<ClipboardList class="size-4 text-yellow-600" />
					<div class="flex-1">
						<p class="font-medium">Test</p>
						<p class="text-xs text-muted-foreground">Short test (30 marks)</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/assessments/create/assignment'}
					class="gap-3 cursor-pointer"
				>
					<FileText class="size-4 text-blue-600" />
					<div class="flex-1">
						<p class="font-medium">Assignment</p>
						<p class="text-xs text-muted-foreground">Open-ended submission</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/assessments/create/practice'}
					class="gap-3 cursor-pointer"
				>
					<GraduationCap class="size-4 text-green-600" />
					<div class="flex-1">
						<p class="font-medium">Practice</p>
						<p class="text-xs text-muted-foreground">Unlimited practice questions</p>
					</div>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Topbar>

<!-- ─── Main Content ──────────────────────────────────────────────────────── -->
<div class="p-6">
	{#if !data}
		<!-- ─── Loading State ────────────────────────────────────────────── -->
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
		<Card class="mt-6">
			<CardContent class="p-6">
				<Skeleton class="h-12 w-full" />
				<div class="mt-4 space-y-3">
					{#each [1, 2, 3, 4, 5] as item (item)}
						<Skeleton class="h-16 w-full" />
					{/each}
				</div>
			</CardContent>
		</Card>
	{:else if error}
		<!-- ─── Error State ──────────────────────────────────────────────── -->
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>

		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<AlertCircle class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot load assessments</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading your assessments.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Statistics Cards ──────────────────────────────────────────── -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Assessments</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">
						{stats?.active || 0} active · {stats?.draft || 0} drafts
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.totalStudents || 0}</div>
					<p class="text-xs text-muted-foreground">across all assessments</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Completion Rate</CardTitle>
					<BarChart3 class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.completionRate || 0}%</div>
					<p class="text-xs text-muted-foreground">average completion</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Average Score</CardTitle>
					<TrendingUp class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.avgScore || 0}%</div>
					<p class="text-xs text-muted-foreground">across all assessments</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Tabs ──────────────────────────────────────────────────────────── -->
		<Tabs bind:value={activeTab} class="mt-8">
			<TabsList class="mb-6">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="examination">Exams</TabsTrigger>
				<TabsTrigger value="test">Tests</TabsTrigger>
				<TabsTrigger value="assignment">Assignments</TabsTrigger>
				<TabsTrigger value="practice">Practice</TabsTrigger>
			</TabsList>

			<TabsContent value="overview">
				<!-- ─── Filters ────────────────────────────────────────────────────── -->
				<Card class="mb-6">
					<CardContent class="pt-6">
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="relative flex-1">
								<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									bind:value={searchQuery}
									placeholder="Search assessments by title or course..."
									class="pl-9"
								/>
							</div>
							<div class="flex gap-2">
								<Select>
									<SelectTrigger class="w-[130px]" onchange={(e) => filterType = e.currentTarget.value}>
										<span class="truncate">
											{filterType === 'all' ? 'All Types' : getTypeBadge(filterType).label}
										</span>
									</SelectTrigger>
									<SelectContent>
										<SelectItem 
											value="all" 
											selected={filterType === 'all'}
											onclick={() => filterType = 'all'}
										>
											All Types
										</SelectItem>
										{#each types as type}
											<SelectItem 
												value={type}
												selected={filterType === type}
												onclick={() => filterType = type}
											>
												{getTypeBadge(type).label}
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>

								<Select>
									<SelectTrigger class="w-[130px]" onchange={(e) => filterStatus = e.currentTarget.value}>
										<span class="truncate">
											{filterStatus === 'all' ? 'All Status' : getStatusBadge(filterStatus).label}
										</span>
									</SelectTrigger>
									<SelectContent>
										<SelectItem 
											value="all" 
											selected={filterStatus === 'all'}
											onclick={() => filterStatus = 'all'}
										>
											All Status
										</SelectItem>
										{#each statuses as status}
											<SelectItem 
												value={status}
												selected={filterStatus === status}
												onclick={() => filterStatus = status}
											>
												{getStatusBadge(status).label}
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

<!-- ─── Assessments Table ────────────────────────────────────────── -->
<Card>
	<CardContent class="p-0">
		<div class="overflow-x-auto">
			<div class="max-h-[600px] overflow-y-auto">
				<Table>
					<TableHeader class="sticky top-0 z-10 bg-background">
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Course</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Schedule</TableHead>
							<TableHead class="text-center">Students</TableHead>
							<TableHead class="text-center">Completion</TableHead>
							<TableHead class="text-center">Avg Score</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if sortedAssessments.length === 0}
							<TableRow>
								<TableCell colspan="9" class="text-center text-muted-foreground py-8">
									{#if searchQuery || filterType !== 'all' || filterStatus !== 'all'}
										<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No assessments match your filters</p>
									{:else}
										<FileText class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No assessments created yet</p>
										<Button href="/lecturer/assessments/create/exam" size="sm" class="mt-2">
											<Plus class="mr-2 size-4" />
											Create First Assessment
										</Button>
									{/if}
								</TableCell>
							</TableRow>
						{:else}
							{#each sortedAssessments as assessment}
								<TableRow>
									<TableCell class="font-medium">{assessment.title}</TableCell>
									<TableCell>{assessment.courseCode}</TableCell>
									<TableCell>
										<Badge variant={getTypeBadge(assessment.type).variant}>
											{getTypeBadge(assessment.type).label}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge class={getStatusColor(assessment.status)}>
											{getStatusBadge(assessment.status).label}
										</Badge>
									</TableCell>
									<TableCell>
										{#if getScheduleLabel(assessment)}
											{@const schedule = getScheduleLabel(assessment)}
											<span class="flex items-center gap-1 text-xs whitespace-nowrap {scheduleToneClass(schedule.tone)}">
												<Calendar class="size-3 shrink-0" />
												{schedule.label}
											</span>
										{:else}
											<span class="text-xs text-muted-foreground/50">—</span>
										{/if}
									</TableCell>
									<TableCell class="text-center">{assessment.studentCount || 0}</TableCell>
									<TableCell class="text-center">
										<div class="flex flex-col items-center gap-1">
											<span class="text-sm">{assessment.completionRate || 0}%</span>
											<Progress value={assessment.completionRate || 0} class="h-1.5 w-12" />
										</div>
									</TableCell>
									<TableCell class="text-center font-medium">
										{assessment.avgScore || 0}%
									</TableCell>
									<TableCell class="text-right">
										<div class="flex justify-end gap-2">
											<Button variant="ghost" size="sm" href={`/lecturer/assessments/${assessment.id}`} class="h-8 w-8 p-0">
												<Eye class="size-4" />
												<span class="sr-only">View</span>
											</Button>
											<Button variant="ghost" size="sm" href={`/lecturer/assessments/edit/${assessment.id}`} class="h-8 w-8 p-0">
												<Edit class="size-4" />
												<span class="sr-only">Edit</span>
											</Button>
										</div>
									</TableCell>
								</TableRow>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</div>
		</div>
	</CardContent>
</Card>

				<!-- ─── Quick Stats ────────────────────────────────────────────────── -->
				{#if filteredAssessments.length > 0}
					<Card class="mt-6 bg-muted/30 border-border">
						<CardContent class="py-4">
							<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
								<span class="text-muted-foreground">
									Showing <strong class="text-foreground">{filteredAssessments.length}</strong> of <strong class="text-foreground">{assessments.length}</strong> assessments
								</span>
								<div class="flex items-center gap-4">
									<span class="flex items-center gap-1">
										<FileCheck class="size-4 text-green-500" />
										{filteredAssessments.filter(a => a.status === 'ACTIVE' || a.status === 'SCHEDULED').length} Active
									</span>
									<span class="flex items-center gap-1">
										<Clock class="size-4 text-yellow-500" />
										{filteredAssessments.filter(a => a.status === 'PUBLISHED').length} Published
									</span>
									<span class="flex items-center gap-1">
										<FileText class="size-4 text-gray-500" />
										{filteredAssessments.filter(a => a.status === 'DRAFT').length} Drafts
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				{/if}
			</TabsContent>

			<!-- ─── Type-specific Tabs ─────────────────────────────────────────── -->
			{#each ['EXAMINATION', 'TEST', 'ASSIGNMENT', 'PRACTICE'] as type}
	<TabsContent value={type.toLowerCase()}>
		<Card>
			<CardHeader>
				<CardTitle>{getTypeBadge(type).label}s</CardTitle>
				<CardDescription>All {getTypeBadge(type).label.toLowerCase()} assessments</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				{#if assessments.filter(a => a.type === type).length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<FileText class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p>No {getTypeBadge(type).label.toLowerCase()} assessments created yet</p>
						<Button href={`/lecturer/assessments/create/${type.toLowerCase()}`} size="sm" class="mt-2">
							<Plus class="mr-2 size-4" />
							Create {getTypeBadge(type).label}
						</Button>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<div class="max-h-[600px] overflow-y-auto">
							<Table>
								<TableHeader class="sticky top-0 z-10 bg-background">
									<TableRow>
										<TableHead>Title</TableHead>
										<TableHead>Course</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Schedule</TableHead>
										<TableHead class="text-center">Students</TableHead>
										<TableHead class="text-center">Completion</TableHead>
										<TableHead class="text-center">Avg Score</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each sortByUrgency(assessments.filter(a => a.type === type)) as assessment}
										<TableRow>
											<TableCell class="font-medium">{assessment.title}</TableCell>
											<TableCell>{assessment.courseCode}</TableCell>
											<TableCell>
												<Badge class={getStatusColor(assessment.status)}>
													{getStatusBadge(assessment.status).label}
												</Badge>
											</TableCell>
											<TableCell>
												{#if getScheduleLabel(assessment)}
													{@const schedule = getScheduleLabel(assessment)}
													<span class="flex items-center gap-1 text-xs whitespace-nowrap {scheduleToneClass(schedule.tone)}">
														<Calendar class="size-3 shrink-0" />
														{schedule.label}
													</span>
												{:else}
													<span class="text-xs text-muted-foreground/50">—</span>
												{/if}
											</TableCell>
											<TableCell class="text-center">{assessment.studentCount || 0}</TableCell>
											<TableCell class="text-center">
												<div class="flex flex-col items-center gap-1">
													<span class="text-sm">{assessment.completionRate || 0}%</span>
													<Progress value={assessment.completionRate || 0} class="h-1.5 w-12" />
												</div>
											</TableCell>
											<TableCell class="text-center font-medium">
												{assessment.avgScore || 0}%
											</TableCell>
											<TableCell class="text-right">
												<div class="flex justify-end gap-2">
													<Button variant="ghost" size="sm" href={`/lecturer/assessments/${assessment.id}`} class="h-8 w-8 p-0">
														<Eye class="size-4" />
														<span class="sr-only">View</span>
													</Button>
													<Button variant="ghost" size="sm" href={`/lecturer/assessments/edit/${assessment.id}`} class="h-8 w-8 p-0">
														<Edit class="size-4" />
														<span class="sr-only">Edit</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	</TabsContent>
{/each}
		</Tabs>
	{/if}
</div>