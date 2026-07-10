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
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterLevel = $state('all');
	let filterType = $state('all');

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let courses = $derived(data?.courses || []);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredCourses = $derived(
		courses.filter(course => {
			const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				course.code.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesLevel = filterLevel === 'all' || course.level === parseInt(filterLevel);
			const matchesType = filterType === 'all' || course.type === filterType;
			return matchesSearch && matchesLevel && matchesType;
		})
	);

	let levels = $derived([...new Set(courses.map(c => c.level))].sort((a, b) => a - b));
	let types = $derived([...new Set(courses.map(c => c.type))]);

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function getTypeBadge(type: string) {
		const variants: Record<string, { variant: string; label: string }> = {
			COMPULSORY: { variant: 'default', label: 'Compulsory' },
			ELECTIVE: { variant: 'secondary', label: 'Elective' },
			GENERAL_STUDIES: { variant: 'info', label: 'General Studies' },
			CARRYOVER_ELIGIBLE: { variant: 'warning', label: 'Carryover Eligible' },
		};
		return variants[type] || { variant: 'secondary', label: type };
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
		<div class="grid gap-6 md:grid-cols-3">
			{#each [1, 2, 3] as item (item)}
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

		<!-- Show empty state with error context -->
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
				<h3 class="text-lg font-semibold">No courses available</h3>
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
		<div class="grid gap-6 md:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Courses</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{courses.length}</div>
					<p class="text-xs text-muted-foreground">active this semester</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{courses.reduce((sum, c) => sum + c.studentCount, 0)}
					</div>
					<p class="text-xs text-muted-foreground">across all courses</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Questions</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{courses.reduce((sum, c) => sum + c.questionCount, 0)}
					</div>
					<p class="text-xs text-muted-foreground">in your question bank</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters ────────────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search courses by code or title..."
							class="pl-9"
						/>
					</div>
					<div class="flex gap-2">
						<Select>
							<SelectTrigger class="w-[130px]" onchange={(e) => filterLevel = e.currentTarget.value}>
								<span class="truncate">
									{filterLevel === 'all' ? 'All Levels' : filterLevel}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem 
									value="all" 
									selected={filterLevel === 'all'}
									onclick={() => filterLevel = 'all'}
								>
									All Levels
								</SelectItem>
								{#each levels as level}
									<SelectItem 
										value={level}
										selected={filterLevel === level}
										onclick={() => filterLevel = level}
									>
										{level}
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>

						<Select>
							<SelectTrigger class="w-[150px]" onchange={(e) => filterType = e.currentTarget.value}>
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
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Courses Table ──────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Course Code</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Level</TableHead>
							<TableHead>Type</TableHead>
							<TableHead class="text-center">Students</TableHead>
							<TableHead class="text-center">Assessments</TableHead>
							<TableHead class="text-center">Questions</TableHead>
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
										<p class="text-sm mt-1">Try adjusting your search or filter criteria</p>
									{:else}
										<BookOpen class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No courses available</p>
									{/if}
								</TableCell>
							</TableRow>
						{:else}
							{#each filteredCourses as course}
								<TableRow>
									<TableCell class="font-medium">{course.code}</TableCell>
									<TableCell>{course.title}</TableCell>
									<TableCell>
										<Badge variant="outline">{course.level}</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={getTypeBadge(course.type).variant}>
											{getTypeBadge(course.type).label}
										</Badge>
									</TableCell>
									<TableCell class="text-center">{course.studentCount}</TableCell>
									<TableCell class="text-center">{course.assessmentCount}</TableCell>
									<TableCell class="text-center">{course.questionCount}</TableCell>
									<TableCell class="text-right">
										<div class="flex justify-end gap-2">
											<Button variant="ghost" size="sm" href={`/lecturer/courses/${course.id}`} class="h-8 w-8 p-0">
												<Eye class="size-4" />
												<span class="sr-only">View</span>
											</Button>
											<Button variant="ghost" size="sm" href={`/lecturer/courses/${course.id}/edit`} class="h-8 w-8 p-0">
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
						<div class="flex items-center gap-4">
							<span class="flex items-center gap-1">
								<Users class="size-4 text-muted-foreground" />
								{filteredCourses.reduce((sum, c) => sum + c.studentCount, 0)} students
							</span>
							<span class="flex items-center gap-1">
								<FileText class="size-4 text-muted-foreground" />
								{filteredCourses.reduce((sum, c) => sum + c.assessmentCount, 0)} assessments
							</span>
							<span class="flex items-center gap-1">
								<GraduationCap class="size-4 text-muted-foreground" />
								{filteredCourses.reduce((sum, c) => sum + c.questionCount, 0)} questions
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>