<!-- src/routes/(lecturer)/lecturer/grade/+page.svelte -->
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
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		FileCheck,
		Search,
		Users,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		CheckCircle,
		Clock,
		XCircle,
		Building2,
		FileText,
		ChevronsUpDown,
		Zap,
		BarChart3,
		TrendingUp,
		TrendingDown,
		Filter,
		ChevronRight,
		Eye,
		PenSquare,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { format } from '$lib/utils/date';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';
	import { page } from '$app/state';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let isAutoGrading = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterCourse = $state(data?.filters?.course || 'all');
	let filterStatus = $state(data?.filters?.status || 'pending');
	let sortColumn = $state('studentName');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	// ─── Course Combobox State ──────────────────────────────────────────────
	let courseOpen = $state(false);
	let courseTriggerRef = $state<HTMLButtonElement>(null!);

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let submissions = $derived(data?.submissions || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	const selectedCourseLabel = $derived(
		filterCourse === 'all' 
			? 'All Courses' 
			: data?.courses?.find((c) => c.id === filterCourse)?.label || 'All Courses'
	);

	// ─── Sorting ─────────────────────────────────────────────────────────────
	function handleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	let filteredSubmissions = $derived(
		submissions
			.filter(s => {
				const matchesSearch = searchQuery === '' ||
					s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
					s.studentMatric.toLowerCase().includes(searchQuery.toLowerCase()) ||
					s.questionBody.toLowerCase().includes(searchQuery.toLowerCase());
				const matchesCourse = filterCourse === 'all' || s.courseId === filterCourse;
				const matchesStatus = filterStatus === 'all' || 
					(filterStatus === 'pending' && !s.isGraded) ||
					(filterStatus === 'graded' && s.isGraded);
				return matchesSearch && matchesCourse && matchesStatus;
			})
			.sort((a, b) => {
				let comparison = 0;
				switch (sortColumn) {
					case 'studentName':
						comparison = a.studentName.localeCompare(b.studentName);
						break;
					case 'studentMatric':
						comparison = a.studentMatric.localeCompare(b.studentMatric);
						break;
					case 'course':
						comparison = a.course.localeCompare(b.course);
						break;
					case 'questionBody':
						comparison = a.questionBody.localeCompare(b.questionBody);
						break;
					case 'questionType':
						comparison = a.questionType.localeCompare(b.questionType);
						break;
					case 'status':
						comparison = (a.isGraded ? 1 : 0) - (b.isGraded ? 1 : 0);
						break;
					case 'marksAwarded':
						comparison = (a.marksAwarded || 0) - (b.marksAwarded || 0);
						break;
					default:
						comparison = a.studentName.localeCompare(b.studentName);
				}
				return sortDirection === 'asc' ? comparison : -comparison;
			})
	);

	// ─── Handlers ────────────────────────────────────────────────────────────
	function closeAndFocusCourse() {
		courseOpen = false;
		tick().then(() => {
			courseTriggerRef?.focus();
		});
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (filterCourse !== 'all') params.set('course', filterCourse);
		if (filterStatus !== 'all') params.set('status', filterStatus);
		window.location.href = `/lecturer/grade?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterCourse = 'all';
		filterStatus = 'pending';
		window.location.href = '/lecturer/grade';
	}

	function getStatusBadge(isGraded: boolean) {
		if (isGraded) {
			return { variant: 'success', label: 'Graded', icon: CheckCircle, color: 'text-green-500' };
		}
		return { variant: 'warning', label: 'Pending', icon: Clock, color: 'text-yellow-500' };
	}

	function getQuestionTypeLabel(type: string) {
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

	function getQuestionTypeColor(type: string) {
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

	function getSortIcon(column: string) {
		if (sortColumn !== column) return null;
		return sortDirection === 'asc' ? '↑' : '↓';
	}
</script>

<svelte:head>
	<title>Grade Submissions — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Grade Submissions" description="Review and grade student submissions">
	{#snippet actions()}
		<div class="flex items-center gap-2">
			<!-- Auto-grade: only shown when there are pending objective answers -->
			{#if (stats?.autoGradable ?? 0) > 0}
				<form
					method="POST"
					action="?/autoGrade"
					use:enhance={() => {
						isAutoGrading = true;
						return async ({ update }) => {
							await update();
							await invalidateAll();
							isAutoGrading = false;
						};
					}}
				>
					<Button type="submit" size="sm" disabled={isAutoGrading} class="gap-2">
						{#if isAutoGrading}
							<LoaderCircle class="size-4 animate-spin" />
							Grading...
						{:else}
							<Zap class="size-4" />
							Auto-Grade ({stats?.autoGradable})
						{/if}
					</Button>
				</form>
			{/if}

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
		</div>
	{/snippet}
</Topbar>

<!-- ─── Main Content ──────────────────────────────────────────────────────── -->
<div class="p-6">
	{#if !data}
		<!-- ─── Loading State ────────────────────────────────────────────── -->
		<div class="grid gap-6 md:grid-cols-4">
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
				<Building2 class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot load submissions</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading your submissions.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Statistics Cards ──────────────────────────────────────────── -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card class="transition-all hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Submissions</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">total answers</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-yellow-200 dark:border-yellow-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Pending</CardTitle>
					<Clock class="size-4 text-yellow-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.pending || 0}</div>
					<p class="text-xs text-muted-foreground">need grading</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Graded</CardTitle>
					<CheckCircle class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.graded || 0}</div>
					<p class="text-xs text-muted-foreground">completed</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Auto-Gradable</CardTitle>
					<Zap class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.autoGradable || 0}</div>
					<p class="text-xs text-muted-foreground">ready for auto-grade</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Progress Overview ──────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="py-4">
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Grading Progress</span>
						<span class="font-medium">
							{stats?.graded || 0} / {stats?.total || 0} graded
							({stats?.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0}%)
						</span>
					</div>
					<Progress 
						value={stats?.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0} 
						class="h-2" 
					/>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Filters ────────────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchQuery}
								placeholder="Search by student, matric or question..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<!-- Course Combobox -->
							<Popover.Root bind:open={courseOpen}>
								<Popover.Trigger bind:ref={courseTriggerRef}>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="outline"
											class="w-[180px] justify-between h-10"
											role="combobox"
											aria-expanded={courseOpen}
										>
											<span class="truncate">{selectedCourseLabel}</span>
											<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-[180px] p-0">
									<Command.Root>
										<Command.Input placeholder="Search courses..." />
										<Command.List>
											<Command.Empty>No course found.</Command.Empty>
											<Command.Group>
												<Command.Item
													value="all"
													onSelect={() => {
														filterCourse = 'all';
														closeAndFocusCourse();
													}}
												>
													<CheckCircle
														class={cn(
															"mr-2 size-4",
															filterCourse === 'all' ? "opacity-100" : "opacity-0"
														)}
													/>
													All Courses
												</Command.Item>
												{#each data?.courses || [] as course}
													<Command.Item
														value={course.id}
														onSelect={() => {
															filterCourse = course.id;
															closeAndFocusCourse();
														}}
													>
														<CheckCircle
															class={cn(
																"mr-2 size-4",
																filterCourse === course.id ? "opacity-100" : "opacity-0"
															)}
														/>
														{course.label}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>

							<Select type="single" bind:value={filterStatus}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterStatus === 'all' ? 'All Status' : 
										 filterStatus === 'pending' ? '⏳ Pending' : '✅ Graded'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="pending">
										<span class="flex items-center gap-2">
											<Clock class="size-3.5 text-yellow-500" />
											Pending
										</span>
									</SelectItem>
									<SelectItem value="graded">
										<span class="flex items-center gap-2">
											<CheckCircle class="size-3.5 text-green-500" />
											Graded
										</span>
									</SelectItem>
								</SelectContent>
							</Select>

							{#if searchQuery || filterCourse !== 'all' || filterStatus !== 'all'}
								<Button 
									variant="ghost" 
									size="sm" 
									onclick={clearFilters}
									class="text-muted-foreground"
								>
									<XCircle class="mr-2 size-4" />
									Clear
								</Button>
							{/if}
						</div>
					</div>
					
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing <strong class="text-foreground">{filteredSubmissions.length}</strong> of <strong class="text-foreground">{submissions.length}</strong> submissions
						</p>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" onclick={applyFilters}>
								Apply Filters
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Submissions Table ──────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('studentName')}
									>
										<div class="flex items-center gap-1">
											Student
											{#if getSortIcon('studentName')}
												<span class="text-xs">{getSortIcon('studentName')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('studentMatric')}
									>
										<div class="flex items-center gap-1">
											Matric No
											{#if getSortIcon('studentMatric')}
												<span class="text-xs">{getSortIcon('studentMatric')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('course')}
									>
										<div class="flex items-center gap-1">
											Course
											{#if getSortIcon('course')}
												<span class="text-xs">{getSortIcon('course')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('questionBody')}
									>
										<div class="flex items-center gap-1">
											Question
											{#if getSortIcon('questionBody')}
												<span class="text-xs">{getSortIcon('questionBody')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('questionType')}
									>
										<div class="flex items-center gap-1">
											Type
											{#if getSortIcon('questionType')}
												<span class="text-xs">{getSortIcon('questionType')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="text-center cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('status')}
									>
										<div class="flex items-center justify-center gap-1">
											Status
											{#if getSortIcon('status')}
												<span class="text-xs">{getSortIcon('status')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="text-center cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('marksAwarded')}
									>
										<div class="flex items-center justify-center gap-1">
											Marks
											{#if getSortIcon('marksAwarded')}
												<span class="text-xs">{getSortIcon('marksAwarded')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if filteredSubmissions.length === 0}
									<TableRow>
										<TableCell colspan="8" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterCourse !== 'all' || filterStatus !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No submissions match your filters</p>
												<Button variant="outline" size="sm" class="mt-2" onclick={clearFilters}>
													Clear Filters
												</Button>
											{:else}
												<FileCheck class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No submissions to grade</p>
												<p class="text-sm mt-1">All submissions have been graded</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each filteredSubmissions as submission}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="font-medium">{submission.studentName}</TableCell>
											<TableCell class="font-mono text-sm">{submission.studentMatric}</TableCell>
											<TableCell>
												<span class="text-sm font-medium">{submission.course}</span>
											</TableCell>
											<TableCell class="max-w-xs">
												<div class="truncate text-sm" title={submission.questionBody}>
													{submission.questionBody}
												</div>
											</TableCell>
											<TableCell>
												<Badge class={getQuestionTypeColor(submission.questionType)}>
													{getQuestionTypeLabel(submission.questionType)}
												</Badge>
											</TableCell>
											<TableCell class="text-center">
												<Badge variant={getStatusBadge(submission.isGraded).variant} class="gap-1">
													<svelte:component 
														this={getStatusBadge(submission.isGraded).icon} 
														class={cn("size-3", getStatusBadge(submission.isGraded).color)}
													/>
													{getStatusBadge(submission.isGraded).label}
												</Badge>
											</TableCell>
											<TableCell class="text-center font-medium">
												{submission.isGraded ? submission.marksAwarded : '—'}
											</TableCell>
											<TableCell class="text-right">
												<div class="flex justify-end gap-2">
													<a
														href={`/lecturer/grade/${submission.id}`}
														class={cn(
															'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
															submission.isGraded
																? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
																: 'bg-primary text-primary-foreground hover:bg-primary/90'
														)}
													>
														{#if submission.isGraded}
															<Eye class="size-3.5" />
															Review
														{:else}
															<PenSquare class="size-3.5" />
															Grade
														{/if}
													</a>
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
		{#if filteredSubmissions.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredSubmissions.length}</strong> of <strong class="text-foreground">{submissions.length}</strong> submissions
						</span>
						<div class="flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-yellow-500" />
								{filteredSubmissions.filter(s => !s.isGraded).length} Pending
							</span>
							<span class="flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-green-500" />
								{filteredSubmissions.filter(s => s.isGraded).length} Graded
							</span>
							{#if filterStatus !== 'all' || filterCourse !== 'all' || searchQuery}
								<span class="flex items-center gap-1.5 text-muted-foreground">
									<Filter class="size-4" />
									{submissions.length - filteredSubmissions.length} Hidden
								</span>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>