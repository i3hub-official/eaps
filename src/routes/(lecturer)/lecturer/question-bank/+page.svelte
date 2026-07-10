<!-- src/routes/(lecturer)/lecturer/question-bank/+page.svelte -->
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
	import {
		Database,
		Search,
		Plus,
		FileText,
		Eye,
		Edit,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		ChevronDown,
		Filter,
		X,
		Building2,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterCourse = $state(data?.filters?.course || 'all');
	let filterType = $state(data?.filters?.type || 'all');
	let filterDifficulty = $state(data?.filters?.difficulty || 'all');
	let activeTab = $state('all');

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let questions = $derived(data?.questions || []);
	let courses = $derived(data?.courses || []);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredQuestions = $derived(
		questions.filter(q => {
			const matchesSearch = q.body.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCourse = filterCourse === 'all' || q.course === filterCourse;
			const matchesType = filterType === 'all' || q.type === filterType;
			const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
			return matchesSearch && matchesCourse && matchesType && matchesDifficulty;
		})
	);

	let types = $derived([...new Set(questions.map(q => q.type))]);
	let difficulties = $derived([...new Set(questions.map(q => q.difficulty))]);

	// ─── Handlers ────────────────────────────────────────────────────────────
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
		if (filterType !== 'all') params.set('type', filterType);
		if (filterDifficulty !== 'all') params.set('difficulty', filterDifficulty);
		window.location.href = `/lecturer/question-bank?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterCourse = 'all';
		filterType = 'all';
		filterDifficulty = 'all';
		window.location.href = '/lecturer/question-bank';
	}

	function getTypeBadge(type: string) {
		const variants: Record<string, { variant: string; label: string }> = {
			SINGLE_CHOICE: { variant: 'default', label: 'Single Choice' },
			MULTIPLE_CHOICE: { variant: 'secondary', label: 'Multiple Choice' },
			TRUE_FALSE: { variant: 'info', label: 'True/False' },
			FILL_BLANK: { variant: 'warning', label: 'Fill Blank' },
			MATCHING: { variant: 'destructive', label: 'Matching' },
			ESSAY: { variant: 'default', label: 'Essay' },
			ORDERING: { variant: 'secondary', label: 'Ordering' },
		};
		return variants[type] || { variant: 'secondary', label: type };
	}

	function getDifficultyColor(difficulty: string) {
		const colors: Record<string, string> = {
			EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
			MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
			HARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
			EXPERT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		};
		return colors[difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
	}
</script>

<svelte:head>
	<title>Question Bank — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Question Bank" description="Manage and organize your question repository">
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
					New Question
					<ChevronDown class="ml-2 size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-56">
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/question-bank/create/single-choice'}
					class="gap-3 cursor-pointer"
				>
					<div>
						<p class="font-medium">Single Choice</p>
						<p class="text-xs text-muted-foreground">One correct answer</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/question-bank/create/multiple-choice'}
					class="gap-3 cursor-pointer"
				>
					<div>
						<p class="font-medium">Multiple Choice</p>
						<p class="text-xs text-muted-foreground">Multiple correct answers</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/question-bank/create/true-false'}
					class="gap-3 cursor-pointer"
				>
					<div>
						<p class="font-medium">True/False</p>
						<p class="text-xs text-muted-foreground">Boolean questions</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/question-bank/create/fill-blank'}
					class="gap-3 cursor-pointer"
				>
					<div>
						<p class="font-medium">Fill Blank</p>
						<p class="text-xs text-muted-foreground">Text entry questions</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem 
					onclick={() => window.location.href = '/lecturer/question-bank/create/essay'}
					class="gap-3 cursor-pointer"
				>
					<div>
						<p class="font-medium">Essay</p>
						<p class="text-xs text-muted-foreground">Open-ended responses</p>
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

		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Building2 class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot load question bank</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading your questions.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Statistics Cards ──────────────────────────────────────────── -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Questions</CardTitle>
					<Database class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{questions.length}</div>
					<p class="text-xs text-muted-foreground">in your question bank</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Question Types</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{types.length}</div>
					<p class="text-xs text-muted-foreground">different types available</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Courses</CardTitle>
					<Filter class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{courses.length}</div>
					<p class="text-xs text-muted-foreground">with questions</p>
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
								placeholder="Search questions by content..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex gap-2">
							<Select>
								<SelectTrigger class="w-[150px]" onchange={(e) => filterCourse = e.currentTarget.value}>
									<span class="truncate">
										{filterCourse === 'all' ? 'All Courses' : courses.find(c => c.id === filterCourse)?.label || 'Select'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem 
										value="all" 
										selected={filterCourse === 'all'}
										onclick={() => filterCourse = 'all'}
									>
										All Courses
									</SelectItem>
									{#each courses as course}
										<SelectItem 
											value={course.id}
											selected={filterCourse === course.id}
											onclick={() => filterCourse = course.id}
										>
											{course.label}
										</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							<Select>
								<SelectTrigger class="w-[140px]" onchange={(e) => filterType = e.currentTarget.value}>
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
								<SelectTrigger class="w-[140px]" onchange={(e) => filterDifficulty = e.currentTarget.value}>
									<span class="truncate">
										{filterDifficulty === 'all' ? 'All Difficulty' : filterDifficulty}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem 
										value="all" 
										selected={filterDifficulty === 'all'}
										onclick={() => filterDifficulty = 'all'}
									>
										All Difficulty
									</SelectItem>
									{#each difficulties as difficulty}
										<SelectItem 
											value={difficulty}
											selected={filterDifficulty === difficulty}
											onclick={() => filterDifficulty = difficulty}
										>
											{difficulty}
										</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>
					</div>
					
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {filteredQuestions.length} of {questions.length} questions
						</p>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" onclick={applyFilters}>
								Apply Filters
							</Button>
							<Button variant="ghost" size="sm" onclick={clearFilters}>
								<X class="mr-1 size-4" />
								Clear
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Questions Table ────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Question</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Difficulty</TableHead>
							<TableHead>Course</TableHead>
							<TableHead class="text-center">Options</TableHead>
							<TableHead class="text-center">Tags</TableHead>
							<TableHead class="text-center">Marks</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if filteredQuestions.length === 0}
							<TableRow>
								<TableCell colspan="8" class="text-center text-muted-foreground py-8">
									{#if searchQuery || filterCourse !== 'all' || filterType !== 'all' || filterDifficulty !== 'all'}
										<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No questions match your filters</p>
										<Button variant="outline" size="sm" class="mt-2" onclick={clearFilters}>
											Clear Filters
										</Button>
									{:else}
										<Database class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No questions in your bank yet</p>
										<Button href="/lecturer/question-bank/create/single-choice" size="sm" class="mt-2">
											<Plus class="mr-2 size-4" />
											Create First Question
										</Button>
									{/if}
								</TableCell>
							</TableRow>
						{:else}
							{#each filteredQuestions as question}
								<TableRow>
									<TableCell class="max-w-xs">
										<div class="truncate" title={question.body}>
											{question.body}
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={getTypeBadge(question.type).variant}>
											{getTypeBadge(question.type).label}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge class={getDifficultyColor(question.difficulty)}>
											{question.difficulty}
										</Badge>
									</TableCell>
									<TableCell>{question.course}</TableCell>
									<TableCell class="text-center">{question.optionCount}</TableCell>
									<TableCell class="text-center">{question.tagCount}</TableCell>
									<TableCell class="text-center">{question.marks}</TableCell>
									<TableCell class="text-right">
										<div class="flex justify-end gap-2">
											<Button variant="ghost" size="sm" href={`/lecturer/question-bank/${question.id}`} class="h-8 w-8 p-0">
												<Eye class="size-4" />
												<span class="sr-only">View</span>
											</Button>
											<Button variant="ghost" size="sm" href={`/lecturer/question-bank/${question.id}/edit`} class="h-8 w-8 p-0">
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
		{#if filteredQuestions.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredQuestions.length}</strong> of <strong class="text-foreground">{questions.length}</strong> questions
						</span>
						<div class="flex items-center gap-4">
							<span class="flex items-center gap-1">
								<span class="text-green-600">●</span>
								{filteredQuestions.filter(q => q.difficulty === 'EASY').length} Easy
							</span>
							<span class="flex items-center gap-1">
								<span class="text-yellow-600">●</span>
								{filteredQuestions.filter(q => q.difficulty === 'MEDIUM').length} Medium
							</span>
							<span class="flex items-center gap-1">
								<span class="text-orange-600">●</span>
								{filteredQuestions.filter(q => q.difficulty === 'HARD').length} Hard
							</span>
							<span class="flex items-center gap-1">
								<span class="text-red-600">●</span>
								{filteredQuestions.filter(q => q.difficulty === 'EXPERT').length} Expert
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>