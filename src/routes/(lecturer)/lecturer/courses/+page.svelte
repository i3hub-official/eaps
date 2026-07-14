<!-- src/routes/(lecturer)/lecturer/courses/+page.svelte -->
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
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		BookOpen,
		Search,
		Plus,
		Users,
		FileText,
		Calendar,
		ChevronRight,
		Eye,
		Edit,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		GraduationCap,
		Building2,
		TrendingUp,
		Clock,
		CheckCircle,
		XCircle,
		Filter,
		BarChart3,
		ClipboardList,
		Brain,
		ChevronDown,
		ChevronUp,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';
	import { cn } from '$lib/utils.js';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterLevel = $state('all');
	let filterType = $state('all');
	let sortColumn = $state('code');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let expandedCourse = $state<string | number | null>(null);

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let courses = $derived(data?.courses || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let levels = $derived([...new Set(courses.map(c => c.level))].sort((a, b) => a - b));
	let types = $derived([...new Set(courses.map(c => c.type))]);

	// ─── Sorting ─────────────────────────────────────────────────────────────
	function handleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	let filteredCourses = $derived(
		courses
			.filter(course => {
				const matchesSearch = searchQuery === '' ||
					course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					course.code.toLowerCase().includes(searchQuery.toLowerCase());
				const matchesLevel = filterLevel === 'all' || course.level === parseInt(filterLevel);
				const matchesType = filterType === 'all' || course.type === filterType;
				return matchesSearch && matchesLevel && matchesType;
			})
			.sort((a, b) => {
				let comparison = 0;
				switch (sortColumn) {
					case 'code':
						comparison = a.code.localeCompare(b.code);
						break;
					case 'title':
						comparison = a.title.localeCompare(b.title);
						break;
					case 'level':
						comparison = a.level - b.level;
						break;
					case 'type':
						comparison = a.type.localeCompare(b.type);
						break;
					case 'studentCount':
						comparison = a.studentCount - b.studentCount;
						break;
					case 'assessmentCount':
						comparison = a.assessmentCount - b.assessmentCount;
						break;
					case 'questionCount':
						comparison = a.questionCount - b.questionCount;
						break;
					default:
						comparison = a.code.localeCompare(b.code);
				}
				return sortDirection === 'asc' ? comparison : -comparison;
			})
	);

	function toggleExpand(courseId: string) {
		expandedCourse = expandedCourse === courseId ? null : courseId;
	}

	function getSortIcon(column: string) {
		if (sortColumn !== column) return null;
		return sortDirection === 'asc' ? '↑' : '↓';
	}

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function getTypeBadge(type: string) {
		const variants: Record<string, { variant: string; label: string; color: string }> = {
			COMPULSORY: { variant: 'default', label: 'Compulsory', color: 'bg-blue-500' },
			ELECTIVE: { variant: 'secondary', label: 'Elective', color: 'bg-gray-500' },
			GENERAL_STUDIES: { variant: 'info', label: 'General Studies', color: 'bg-purple-500' },
			CARRYOVER_ELIGIBLE: { variant: 'warning', label: 'Carryover Eligible', color: 'bg-yellow-500' },
		};
		return variants[type] || { variant: 'secondary', label: type, color: 'bg-gray-500' };
	}

	function getTypeColor(type: string) {
		const colors: Record<string, string> = {
			COMPULSORY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			ELECTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
			GENERAL_STUDIES: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
			CARRYOVER_ELIGIBLE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
		};
		return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400';
	}

	function getStatusBadge(count: number, type: 'assessments' | 'questions' | 'students') {
		if (type === 'assessments') {
			if (count === 0) return { label: 'No Assessments', variant: 'secondary', icon: XCircle };
			if (count < 3) return { label: `${count} Assessments`, variant: 'warning', icon: Clock };
			return { label: `${count} Assessments`, variant: 'success', icon: CheckCircle };
		}
		if (type === 'questions') {
			if (count === 0) return { label: 'No Questions', variant: 'secondary', icon: XCircle };
			if (count < 10) return { label: `${count} Questions`, variant: 'warning', icon: Clock };
			return { label: `${count} Questions`, variant: 'success', icon: CheckCircle };
		}
		if (type === 'students') {
			if (count === 0) return { label: 'No Students', variant: 'secondary', icon: XCircle };
			if (count < 10) return { label: `${count} Students`, variant: 'warning', icon: Users };
			return { label: `${count} Students`, variant: 'success', icon: Users };
		}
		return { label: String(count), variant: 'secondary', icon: CheckCircle };
	}

	function clearFilters() {
		searchQuery = '';
		filterLevel = 'all';
		filterType = 'all';
	}
</script>

<svelte:head>
	<title>My Courses — MOUAU e-Test</title>
</svelte:head>

<Topbar title="My Courses" description="Manage all courses you're teaching">
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
		<Button href="/lecturer/courses/create" size="sm">
			<Plus class="mr-2 size-4" />
			New Course
		</Button>
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
				<h3 class="text-lg font-semibold">Cannot load courses</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading your courses.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else if courses.length === 0}
		<!-- ─── Empty State ────────────────────────────────────────────────── -->
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<BookOpen class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">No courses assigned</h3>
				<p class="text-sm text-muted-foreground mt-1">
					You haven't been assigned any courses yet.
				</p>
				<p class="text-sm text-muted-foreground">
					Contact your HOD to get course assignments.
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Refresh
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Statistics Cards ──────────────────────────────────────────── -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card class="transition-all hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Courses</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.totalCourses || courses.length}</div>
					<p class="text-xs text-muted-foreground">active this semester</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Students</CardTitle>
					<Users class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{stats?.totalStudents || courses.reduce((sum, c) => sum + c.studentCount, 0)}
					</div>
					<p class="text-xs text-muted-foreground">across all courses</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Questions</CardTitle>
					<Brain class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">
						{stats?.totalQuestions || courses.reduce((sum, c) => sum + c.questionCount, 0)}
					</div>
					<p class="text-xs text-muted-foreground">in your question bank</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-purple-200 dark:border-purple-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Assessments</CardTitle>
					<ClipboardList class="size-4 text-purple-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
						{stats?.totalAssessments || courses.reduce((sum, c) => sum + c.assessmentCount, 0)}
					</div>
					<p class="text-xs text-muted-foreground">created this semester</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters ────────────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchQuery}
								placeholder="Search courses by code or title..."
								class="pl-9"
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterLevel}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterLevel === 'all' ? 'All Levels' : `${filterLevel} Level`}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Levels</SelectItem>
									{#each levels as level}
										<SelectItem value={level}>{level} Level</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterType}>
								<SelectTrigger class="w-[150px]">
									<span class="truncate">
										{filterType === 'all' ? 'All Types' : getTypeBadge(filterType).label}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									{#each types as type}
										<SelectItem value={type}>
											<span class="flex items-center gap-2">
												<span class={cn("size-2 rounded-full", getTypeBadge(type).color)} />
												{getTypeBadge(type).label}
											</span>
										</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							{#if searchQuery || filterLevel !== 'all' || filterType !== 'all'}
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
							Showing <strong class="text-foreground">{filteredCourses.length}</strong> of <strong class="text-foreground">{courses.length}</strong> courses
						</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Courses Table ──────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('code')}
									>
										<div class="flex items-center gap-1">
											Course Code
											{#if getSortIcon('code')}
												<span class="text-xs">{getSortIcon('code')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('title')}
									>
										<div class="flex items-center gap-1">
											Title
											{#if getSortIcon('title')}
												<span class="text-xs">{getSortIcon('title')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('level')}
									>
										<div class="flex items-center gap-1">
											Level
											{#if getSortIcon('level')}
												<span class="text-xs">{getSortIcon('level')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('type')}
									>
										<div class="flex items-center gap-1">
											Type
											{#if getSortIcon('type')}
												<span class="text-xs">{getSortIcon('type')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="text-center cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('studentCount')}
									>
										<div class="flex items-center justify-center gap-1">
											Students
											{#if getSortIcon('studentCount')}
												<span class="text-xs">{getSortIcon('studentCount')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="text-center cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('assessmentCount')}
									>
										<div class="flex items-center justify-center gap-1">
											Assessments
											{#if getSortIcon('assessmentCount')}
												<span class="text-xs">{getSortIcon('assessmentCount')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead 
										class="text-center cursor-pointer hover:bg-muted/50"
										onclick={() => handleSort('questionCount')}
									>
										<div class="flex items-center justify-center gap-1">
											Questions
											{#if getSortIcon('questionCount')}
												<span class="text-xs">{getSortIcon('questionCount')}</span>
											{/if}
										</div>
									</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if filteredCourses.length === 0}
									<TableRow>
										<TableCell colspan="8" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterLevel !== 'all' || filterType !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No courses match your filters</p>
												<Button variant="outline" size="sm" class="mt-2" onclick={clearFilters}>
													Clear Filters
												</Button>
											{:else}
												<BookOpen class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No courses available</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each filteredCourses as course}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="font-medium">{course.code}</TableCell>
											<TableCell>{course.title}</TableCell>
											<TableCell>
												<Badge variant="outline">{course.level}</Badge>
											</TableCell>
											<TableCell>
												<Badge class={getTypeColor(course.type)}>
													{getTypeBadge(course.type).label}
												</Badge>
											</TableCell>
											<TableCell class="text-center">
												<Badge variant={course.studentCount > 0 ? 'default' : 'secondary'}>
													{course.studentCount}
												</Badge>
											</TableCell>
											<TableCell class="text-center">
												<Badge variant={course.assessmentCount > 0 ? 'default' : 'secondary'}>
													{course.assessmentCount}
												</Badge>
											</TableCell>
											<TableCell class="text-center">
												<Badge variant={course.questionCount > 0 ? 'default' : 'secondary'}>
													{course.questionCount}
												</Badge>
											</TableCell>
											<TableCell class="text-right">
												<div class="flex justify-end gap-1">
													<Button 
														variant="ghost" 
														size="sm" 
														href={`/lecturer/courses/${course.id}`} 
														class="h-8 w-8 p-0"
													>
														<Eye class="size-4" />
														<span class="sr-only">View</span>
													</Button>
													<Button 
														variant="ghost" 
														size="sm" 
														href={`/lecturer/courses/${course.id}/edit`} 
														class="h-8 w-8 p-0"
													>
														<Edit class="size-4" />
														<span class="sr-only">Edit</span>
													</Button>
													<Button 
														variant="ghost" 
														size="sm" 
														class="h-8 w-8 p-0"
														onclick={() => toggleExpand(course.id)}
													>
														{#if expandedCourse === course.id}
															<ChevronUp class="size-4" />
														{:else}
															<ChevronDown class="size-4" />
														{/if}
														<span class="sr-only">Toggle Details</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
										
										<!-- ─── Expanded Row ────────────────────────────────────────────── -->
										{#if expandedCourse === course.id}
											<TableRow class="bg-muted/20">
												<TableCell colspan="8" class="px-4 py-3">
													<div class="grid gap-4 md:grid-cols-3">
														<div>
															<h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Course Details</h4>
															<div class="mt-2 space-y-1 text-sm">
																<p><span class="text-muted-foreground">Code:</span> {course.code}</p>
																<p><span class="text-muted-foreground">Title:</span> {course.title}</p>
																<p><span class="text-muted-foreground">Level:</span> {course.level}</p>
																<p><span class="text-muted-foreground">Type:</span> {getTypeBadge(course.type).label}</p>
																<p><span class="text-muted-foreground">Credit Units:</span> {course.creditUnits}</p>
															</div>
														</div>
														<div>
															<h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Statistics</h4>
															<div class="mt-2 space-y-2">
																<div>
																	<div class="flex items-center justify-between text-sm">
																		<span class="text-muted-foreground">Students</span>
																		<span class="font-medium">{course.studentCount}</span>
																	</div>
																	<Progress value={Math.min((course.studentCount / 50) * 100, 100)} class="h-1.5 mt-1" />
																</div>
																<div>
																	<div class="flex items-center justify-between text-sm">
																		<span class="text-muted-foreground">Assessments</span>
																		<span class="font-medium">{course.assessmentCount}</span>
																	</div>
																	<Progress value={Math.min((course.assessmentCount / 10) * 100, 100)} class="h-1.5 mt-1" />
																</div>
																<div>
																	<div class="flex items-center justify-between text-sm">
																		<span class="text-muted-foreground">Questions</span>
																		<span class="font-medium">{course.questionCount}</span>
																	</div>
																	<Progress value={Math.min((course.questionCount / 50) * 100, 100)} class="h-1.5 mt-1" />
																</div>
															</div>
														</div>
														<div>
															<h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
															<div class="mt-2 flex flex-col gap-2">
																<Button size="sm" variant="outline" href={`/lecturer/assessments/create?course=${course.id}`} class="justify-start">
																	<Plus class="mr-2 size-3.5" />
																	Create Assessment
																</Button>
																<Button size="sm" variant="outline" href={`/lecturer/question-bank?course=${course.id}`} class="justify-start">
																	<Brain class="mr-2 size-3.5" />
																	View Questions
																</Button>
																<Button size="sm" variant="outline" href={`/lecturer/attendance?course=${course.id}`} class="justify-start">
																	<Users class="mr-2 size-3.5" />
																	View Attendance
																</Button>
															</div>
														</div>
													</div>
												</TableCell>
											</TableRow>
										{/if}
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Quick Stats ────────────────────────────────────────────────── -->
		{#if filteredCourses.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredCourses.length}</strong> of <strong class="text-foreground">{courses.length}</strong> courses
						</span>
						<div class="flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1.5">
								<Users class="size-4 text-blue-500" />
								{filteredCourses.reduce((sum, c) => sum + c.studentCount, 0)} students
							</span>
							<span class="flex items-center gap-1.5">
								<ClipboardList class="size-4 text-purple-500" />
								{filteredCourses.reduce((sum, c) => sum + c.assessmentCount, 0)} assessments
							</span>
							<span class="flex items-center gap-1.5">
								<Brain class="size-4 text-green-500" />
								{filteredCourses.reduce((sum, c) => sum + c.questionCount, 0)} questions
							</span>
							{#if searchQuery || filterLevel !== 'all' || filterType !== 'all'}
								<span class="flex items-center gap-1.5 text-muted-foreground">
									<Filter class="size-4" />
									{courses.length - filteredCourses.length} Hidden
								</span>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>