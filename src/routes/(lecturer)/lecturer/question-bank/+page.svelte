<!-- src/routes/(lecturer)/lecturer/question-bank/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
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
	import {
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type SortingState,
		type VisibilityState,
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel,
	} from '@tanstack/table-core';
	import { createRawSnippet } from 'svelte';
	import {
		FlexRender,
		createSvelteTable,
		renderSnippet,
	} from '$lib/components/ui/data-table/index.js';
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
		BarChart3,
	} from '@lucide/svelte/icons';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterCourse = $state(data?.filters?.course || 'all');
	let filterType = $state(data?.filters?.type || 'all');
	let filterDifficulty = $state(data?.filters?.difficulty || 'all');

	// ─── Course Combobox State ──────────────────────────────────────────────
	let courseOpen = $state(false);
	let courseTriggerRef = $state<HTMLButtonElement>(null!);

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let questions = $derived(data?.questions || []);
	let courses = $derived(data?.courses || []);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	const selectedCourseLabel = $derived(
		filterCourse === 'all' 
			? 'All Courses' 
			: courses.find((c) => c.id === filterCourse)?.code + ' — ' + courses.find((c) => c.id === filterCourse)?.title || 'All Courses'
	);

	let filteredQuestions = $derived(
		questions.filter((q) => {
			const matchesSearch = q.body.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCourse = filterCourse === 'all' || q.course === filterCourse;
			const matchesType = filterType === 'all' || q.type === filterType;
			const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
			return matchesSearch && matchesCourse && matchesType && matchesDifficulty;
		})
	);

	let types = $derived([...new Set(questions.map((q) => q.type))]);
	let difficulties = $derived([...new Set(questions.map((q) => q.difficulty))]);

	// ─── Table State ──────────────────────────────────────────────────────────
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});

	// ─── Table Columns ───────────────────────────────────────────────────────
	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'body',
			header: 'Question',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ body: string }]>((getBody) => {
					const { body } = getBody();
					return {
						render: () =>
							`<div class="max-w-xs truncate" title="${body.replace(/"/g, '&quot;')}">${body}</div>`,
					};
				});
				return renderSnippet(cellSnippet, { body: row.original.body });
			},
		},
		{
			accessorKey: 'type',
			header: 'Type',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ type: string }]>((getType) => {
					const { type } = getType();
					const labels: Record<string, string> = {
						SINGLE_CHOICE: 'Single Choice',
						MULTIPLE_CHOICE: 'Multiple Choice',
						TRUE_FALSE: 'True/False',
						FILL_BLANK: 'Fill Blank',
						MATCHING: 'Matching',
						ESSAY: 'Essay',
						ORDERING: 'Ordering',
					};
					const label = labels[type] || type;
					return {
						render: () =>
							`<span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">${label}</span>`,
					};
				});
				return renderSnippet(cellSnippet, { type: row.original.type });
			},
		},
		{
			accessorKey: 'difficulty',
			header: 'Difficulty',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ difficulty: string }]>((getDifficulty) => {
					const { difficulty } = getDifficulty();
					const colors: Record<string, string> = {
						EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
						MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
						HARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
						EXPERT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
					};
					const color = colors[difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
					return {
						render: () =>
							`<span class="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${color}">${difficulty}</span>`,
					};
				});
				return renderSnippet(cellSnippet, { difficulty: row.original.difficulty });
			},
		},
		{
			accessorKey: 'course',
			header: 'Course',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ course: string }]>((getCourse) => {
					const { course } = getCourse();
					return {
						render: () => `<div>${course}</div>`,
					};
				});
				return renderSnippet(cellSnippet, { course: row.original.course });
			},
		},
		{
			accessorKey: 'optionCount',
			header: 'Options',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ optionCount: number }]>((getCount) => {
					const { optionCount } = getCount();
					return {
						render: () => `<div class="text-center">${optionCount}</div>`,
					};
				});
				return renderSnippet(cellSnippet, { optionCount: row.original.optionCount });
			},
		},
		{
			accessorKey: 'tagCount',
			header: 'Tags',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ tagCount: number }]>((getCount) => {
					const { tagCount } = getCount();
					return {
						render: () => `<div class="text-center">${tagCount}</div>`,
					};
				});
				return renderSnippet(cellSnippet, { tagCount: row.original.tagCount });
			},
		},
		{
			accessorKey: 'marks',
			header: 'Marks',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ marks: number }]>((getMarks) => {
					const { marks } = getMarks();
					return {
						render: () => `<div class="text-center font-medium">${marks}</div>`,
					};
				});
				return renderSnippet(cellSnippet, { marks: row.original.marks });
			},
		},
		{
			id: 'actions',
			enableHiding: false,
			header: 'Actions',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ id: string }]>((getId) => {
					const { id } = getId();
					return {
						render: () =>
							`<div class="flex justify-end gap-2">
								<a href="/lecturer/question-bank/${id}" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
									<span class="sr-only">View</span>
								</a>
								<a href="/lecturer/question-bank/${id}/edit" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
									<span class="sr-only">Edit</span>
								</a>
							</div>`,
					};
				});
				return renderSnippet(cellSnippet, { id: row.original.id });
			},
		},
	];

	// ─── Table Instance ──────────────────────────────────────────────────────
	const table = createSvelteTable({
		get data() {
			return filteredQuestions;
		},
		columns,
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get columnFilters() {
				return columnFilters;
			},
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
	});

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
		<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isRefreshing}>
			{#if isRefreshing}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<RefreshCw class="size-4" />
			{/if}
			Refresh
		</Button>

		<Button href="/lecturer/question-bank/analytics" size="sm" variant="outline">
			<BarChart3 class="mr-2 size-4" />
			Analytics
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
				<DropdownMenuItem onclick={() => (window.location.href = '/lecturer/question-bank/create/single-choice')} class="gap-3 cursor-pointer">
					<div>
						<p class="font-medium">Single Choice</p>
						<p class="text-xs text-muted-foreground">One correct answer</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => (window.location.href = '/lecturer/question-bank/create/multiple-choice')} class="gap-3 cursor-pointer">
					<div>
						<p class="font-medium">Multiple Choice</p>
						<p class="text-xs text-muted-foreground">Multiple correct answers</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => (window.location.href = '/lecturer/question-bank/create/true-false')} class="gap-3 cursor-pointer">
					<div>
						<p class="font-medium">True/False</p>
						<p class="text-xs text-muted-foreground">Boolean questions</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => (window.location.href = '/lecturer/question-bank/create/fill-blank')} class="gap-3 cursor-pointer">
					<div>
						<p class="font-medium">Fill Blank</p>
						<p class="text-xs text-muted-foreground">Text entry questions</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => (window.location.href = '/lecturer/question-bank/create/essay')} class="gap-3 cursor-pointer">
					<div>
						<p class="font-medium">Essay</p>
						<p class="text-xs text-muted-foreground">Open-ended responses</p>
					</div>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Topbar>

<div class="p-6">
	{#if !data}
		<!-- Loading State -->
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
		<!-- Error State -->
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
		<!-- Statistics Cards -->
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

		<!-- Quick Filters -->
		<div class="mt-6 flex flex-wrap items-center gap-4">
			<div class="relative flex-1 min-w-[200px] max-w-sm">
				<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					bind:value={searchQuery}
					placeholder="Search questions..."
					class="pl-9"
					onkeydown={(e) => e.key === 'Enter' && applyFilters()}
				/>
			</div>

			<!-- Course Combobox -->
			<Popover.Root bind:open={courseOpen}>
				<Popover.Trigger bind:ref={courseTriggerRef}>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							class="w-[200px] justify-between h-10"
							role="combobox"
							aria-expanded={courseOpen}
						>
							<span class="truncate">{selectedCourseLabel}</span>
							<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-[200px] p-0">
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
									<CheckIcon
										class={cn(
											"mr-2 size-4",
											filterCourse === 'all' ? "opacity-100" : "opacity-0"
										)}
									/>
									All Courses
								</Command.Item>
								{#each courses as course}
									<Command.Item
										value={course.code}
										onSelect={() => {
											filterCourse = course.id;
											closeAndFocusCourse();
										}}
									>
										<CheckIcon
											class={cn(
												"mr-2 size-4",
												filterCourse === course.id ? "opacity-100" : "opacity-0"
											)}
										/>
										{course.code} — {course.title}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<Button variant="outline" size="sm" onclick={applyFilters}>
				Apply
			</Button>
			<Button variant="ghost" size="sm" onclick={clearFilters}>
				<X class="mr-1 size-4" />
				Clear
			</Button>
		</div>

		<!-- DataTable -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<div class="w-full">
					<!-- Table Controls: Column Visibility -->
					<div class="flex items-center justify-end p-4">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<Filter class="mr-2 size-4" />
									Columns
									<ChevronDown class="ml-2 size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{#each table.getAllColumns().filter((col) => col.getCanHide()) as column}
									<DropdownMenuItem onclick={() => column.toggleVisibility(!column.getIsVisible())}>
										<span class="flex items-center gap-2">
											<input
												type="checkbox"
												checked={column.getIsVisible()}
												onchange={(e) => column.toggleVisibility(e.currentTarget.checked)}
												class="h-4 w-4 rounded border-gray-300"
												onclick={(e) => e.stopPropagation()}
											/>
											{column.id}
										</span>
									</DropdownMenuItem>
								{/each}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
									<Table.Row>
										{#each headerGroup.headers as header (header.id)}
											<Table.Head>
												{#if !header.isPlaceholder}
													<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
												{/if}
											</Table.Head>
										{/each}
									</Table.Row>
								{/each}
							</Table.Header>
							<Table.Body>
								{#each table.getRowModel().rows as row (row.id)}
									<Table.Row>
										{#each row.getVisibleCells() as cell (cell.id)}
											<Table.Cell>
												<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
											</Table.Cell>
										{/each}
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={columns.length} class="h-24 text-center">
											No results.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<!-- Pagination -->
					<div class="flex items-center justify-between space-x-2 pt-4">
						<span class="text-sm text-muted-foreground">
							Showing {table.getRowModel().rows.length} of {filteredQuestions.length} questions
						</span>
						<div class="space-x-2">
							<Button variant="outline" size="sm" onclick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
								Previous
							</Button>
							<Button variant="outline" size="sm" onclick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
								Next
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Quick Stats -->
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
								{filteredQuestions.filter((q) => q.difficulty === 'EASY').length} Easy
							</span>
							<span class="flex items-center gap-1">
								<span class="text-yellow-600">●</span>
								{filteredQuestions.filter((q) => q.difficulty === 'MEDIUM').length} Medium
							</span>
							<span class="flex items-center gap-1">
								<span class="text-orange-600">●</span>
								{filteredQuestions.filter((q) => q.difficulty === 'HARD').length} Hard
							</span>
							<span class="flex items-center gap-1">
								<span class="text-red-600">●</span>
								{filteredQuestions.filter((q) => q.difficulty === 'EXPERT').length} Expert
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>