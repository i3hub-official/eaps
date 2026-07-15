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
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		type ColumnDef,
		getCoreRowModel,
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
	import { deserialize } from '$app/forms';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterCourse = $state(data?.filters?.course || 'all');
	let filterType = $state(data?.filters?.type || 'all');
	let filterDifficulty = $state(data?.filters?.difficulty || 'all');

	// Full enum lists — kept static rather than derived from the current
	// page's results, since with server-side pagination the current page
	// only ever contains up to 10 questions and wouldn't reliably surface
	// every type/difficulty in use across all of a lecturer's questions.
	const TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING', 'ESSAY', 'ORDERING'];
	const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];

	// ─── Course Combobox State ──────────────────────────────────────────────
	let courseOpen = $state(false);
	let courseTriggerRef = $state<HTMLButtonElement>(null!);

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let questions = $derived(data?.questions || []);
	let courses = $derived(data?.courses || []);
	let pagination = $derived(data?.pagination);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	const selectedCourseLabel = $derived(
		filterCourse === 'all'
			? 'All Courses'
			: (courses.find((c) => c.id === filterCourse)
					? `${courses.find((c) => c.id === filterCourse)!.code} — ${courses.find((c) => c.id === filterCourse)!.title}`
					: 'All Courses')
	);

	// Page numbers with ellipsis for large page counts, e.g. 1 … 4 5 [6] 7 8 … 12
	let pageNumbers = $derived.by(() => {
		const total = pagination?.totalPages ?? 1;
		const current = pagination?.page ?? 1;
		const result: (number | '...')[] = [];
		for (let i = 1; i <= total; i++) {
			if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
				result.push(i);
			} else if (result[result.length - 1] !== '...') {
				result.push('...');
			}
		}
		return result;
	});

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
							`<span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">${label}</span>`,
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
							`<span class="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${color}">${difficulty}</span>`,
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
						render: () =>
							`<div class="max-w-[160px] truncate" title="${course.replace(/"/g, '&quot;')}">${course}</div>`,
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
					return { render: () => `<div class="text-center">${optionCount}</div>` };
				});
				return renderSnippet(cellSnippet, { optionCount: row.original.optionCount });
			},
		},
		{
			accessorKey: 'tagCount',
			header: 'Tags',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ tagCount: number; tagNames: string[] }]>((getProps) => {
					const { tagCount, tagNames } = getProps();
					const title = tagNames.length ? tagNames.join(', ').replace(/"/g, '&quot;') : 'No tags';
					return { render: () => `<div class="text-center" title="${title}">${tagCount}</div>` };
				});
				return renderSnippet(cellSnippet, { tagCount: row.original.tagCount, tagNames: row.original.tagNames });
			},
		},
		{
			accessorKey: 'marks',
			header: 'Marks',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ marks: number }]>((getMarks) => {
					const { marks } = getMarks();
					return { render: () => `<div class="text-center font-medium">${marks}</div>` };
				});
				return renderSnippet(cellSnippet, { marks: row.original.marks });
			},
		},
		{
			accessorKey: 'isActive',
			header: 'Status',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ isActive: boolean }]>((getProps) => {
					const { isActive } = getProps();
					const label = isActive ? 'Active' : 'Inactive';
					const cls = isActive
						? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
						: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400';
					return {
						render: () =>
							`<span class="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}">${label}</span>`,
					};
				});
				return renderSnippet(cellSnippet, { isActive: row.original.isActive });
			},
		},
		{
			id: 'actions',
			enableHiding: false,
			header: 'Actions',
			cell: ({ row }) => {
				const q = row.original;
				const cellSnippet = createRawSnippet<[{ id: string; isActive: boolean }]>((getProps) => {
					const { id, isActive } = getProps();
					return {
						render: () => `
							<div class="flex justify-end gap-1">
								<a href="/lecturer/question-bank/${id}" title="View" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
								</a>
								<a href="/lecturer/question-bank/${id}/edit" title="Edit" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
								</a>
								<button type="button" data-action="toggle" title="${isActive ? 'Deactivate' : 'Activate'}" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${
										isActive
											? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
											: '<circle cx="12" cy="12" r="10"/>'
									}</svg>
								</button>
								<button type="button" data-action="delete" title="Delete" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								</button>
							</div>
						`,
						setup: (node: Element) => {
							node.querySelector('[data-action="toggle"]')?.addEventListener('click', () => handleToggleActive(id));
							node.querySelector('[data-action="delete"]')?.addEventListener('click', () => handleDelete(id));
						},
					};
				});
				return renderSnippet(cellSnippet, { id: q.id, isActive: q.isActive });
			},
		},
	];

	// ─── Table Instance ──────────────────────────────────────────────────────
	// No client-side pagination/sorting/filtering models — the server has
	// already paginated and filtered `data.questions`, so the table just
	// renders exactly what it was given.
	const table = createSvelteTable({
		get data() {
			return questions;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
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

	function buildParams(extra: Record<string, string | undefined> = {}) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (filterCourse !== 'all') params.set('course', filterCourse);
		if (filterType !== 'all') params.set('type', filterType);
		if (filterDifficulty !== 'all') params.set('difficulty', filterDifficulty);
		for (const [k, v] of Object.entries(extra)) {
			if (v) params.set(k, v);
		}
		return params;
	}

	function applyFilters() {
		window.location.href = `/lecturer/question-bank?${buildParams().toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterCourse = 'all';
		filterType = 'all';
		filterDifficulty = 'all';
		window.location.href = '/lecturer/question-bank';
	}

	function goToPage(n: number) {
		window.location.href = `/lecturer/question-bank?${buildParams({ page: String(n) }).toString()}`;
	}

	async function handleToggleActive(questionId: string) {
		const fd = new FormData();
		fd.set('questionId', questionId);
		const res = await fetch('?/toggleActive', { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'success') {
			await invalidateAll();
		} else if (result.type === 'failure') {
			alert((result.data as any)?.error ?? 'Failed to update question');
		} else if (result.type === 'error') {
			alert(result.error?.message ?? 'Failed to update question');
		}
	}

	async function handleDelete(questionId: string) {
		if (!confirm('Delete this question permanently? This cannot be undone.')) return;
		const fd = new FormData();
		fd.set('questionId', questionId);
		const res = await fetch('?/delete', { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'success') {
			await invalidateAll();
		} else if (result.type === 'failure') {
			alert((result.data as any)?.error ?? 'Failed to delete question');
		} else if (result.type === 'error') {
			alert(result.error?.message ?? 'Failed to delete question');
		}
	}
</script>

<svelte:head>
	<title>Question Bank — EAPS</title>
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
		<div class="grid gap-6 md:grid-cols-3">
			{#each [1, 2, 3] as item (item)}
				<Card>
					<CardHeader><Skeleton class="h-4 w-24" /></CardHeader>
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
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Building2 class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot load question bank</h3>
				<p class="text-sm text-muted-foreground mt-1">There was an error loading your questions.</p>
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
					<div class="text-2xl font-bold">{pagination?.totalCount ?? 0}</div>
					<p class="text-xs text-muted-foreground">in your question bank</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Question Types</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{TYPES.length}</div>
					<p class="text-xs text-muted-foreground">supported types</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Courses</CardTitle>
					<Filter class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{courses.length}</div>
					<p class="text-xs text-muted-foreground">you teach</p>
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

			<Popover.Root bind:open={courseOpen}>
				<Popover.Trigger bind:ref={courseTriggerRef}>
					{#snippet child({ props })}
						<Button {...props} variant="outline" class="w-[200px] justify-between h-10" role="combobox" aria-expanded={courseOpen}>
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
								<Command.Item value="all" onSelect={() => { filterCourse = 'all'; closeAndFocusCourse(); }}>
									<CheckIcon class={cn('mr-2 size-4', filterCourse === 'all' ? 'opacity-100' : 'opacity-0')} />
									All Courses
								</Command.Item>
								{#each courses as course}
									<Command.Item value={course.code} onSelect={() => { filterCourse = course.id; closeAndFocusCourse(); }}>
										<CheckIcon class={cn('mr-2 size-4', filterCourse === course.id ? 'opacity-100' : 'opacity-0')} />
										{course.code} — {course.title}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<select bind:value={filterType} class="h-10 rounded-md border border-input bg-background px-3 text-sm">
				<option value="all">All Types</option>
				{#each TYPES as t}
					<option value={t}>{t.replace('_', ' ')}</option>
				{/each}
			</select>

			<select bind:value={filterDifficulty} class="h-10 rounded-md border border-input bg-background px-3 text-sm">
				<option value="all">All Difficulty</option>
				{#each DIFFICULTIES as d}
					<option value={d}>{d}</option>
				{/each}
			</select>

			<Button variant="outline" size="sm" onclick={applyFilters}>Apply</Button>
			<Button variant="ghost" size="sm" onclick={clearFilters}>
				<X class="mr-1 size-4" />
				Clear
			</Button>
		</div>

		<!-- DataTable -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<!--
					Width fix: Table.Root renders <table class="w-full">, which has
					no cap of its own — with 9 columns (several with fixed min
					content widths: badges, truncated text, action icons) the table's
					intrinsic width can exceed the card's box and overflow the page
					instead of respecting the card boundary.

					Wrapping it in a block with `overflow-x-auto` gives the table a
					horizontal scrollbar *inside* the card when content is wider than
					the viewport, instead of the whole card (or page) stretching.
					`max-w-full` ensures the wrapper itself never exceeds its parent.
				-->
				<div class="w-full max-w-full overflow-x-auto">
					<Table.Root class="min-w-[900px]">
						<Table.Header>
							{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
								<Table.Row>
									{#each headerGroup.headers as header (header.id)}
										<Table.Head class="whitespace-nowrap">
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
									<Table.Cell colspan={columns.length} class="h-40 text-center">
										{#if searchQuery || filterCourse !== 'all' || filterType !== 'all' || filterDifficulty !== 'all'}
											<p class="text-sm text-muted-foreground">No questions match your filters.</p>
											<Button variant="ghost" size="sm" class="mt-2" onclick={clearFilters}>
												<X class="mr-1 size-4" />
												Clear filters
											</Button>
										{:else}
											<div class="flex flex-col items-center gap-3 py-4">
												<Database class="size-10 text-muted-foreground/40" />
												<div>
													<p class="text-sm font-medium">No questions in your bank yet</p>
													<p class="text-xs text-muted-foreground mt-1">Get started by creating your first question.</p>
												</div>
												<Button
													size="sm"
													onclick={() => (window.location.href = '/lecturer/question-bank/create/single-choice')}
												>
													<Plus class="mr-2 size-4" />
													Add Question
												</Button>
											</div>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>

				<!-- Pagination — real page numbers, driven by the server -->
				<div class="flex items-center justify-between p-4">
					<span class="text-sm text-muted-foreground">
						Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1} · {pagination?.totalCount ?? 0} total
					</span>
					<div class="flex items-center gap-1">
						<Button variant="outline" size="sm" onclick={() => goToPage((pagination?.page ?? 1) - 1)} disabled={(pagination?.page ?? 1) <= 1}>
							Previous
						</Button>
						{#each pageNumbers as p}
							{#if p === '...'}
								<span class="px-2 text-sm text-muted-foreground">…</span>
							{:else}
								<Button
									variant={p === pagination?.page ? 'default' : 'outline'}
									size="sm"
									class="w-9"
									onclick={() => goToPage(p)}
								>
									{p}
								</Button>
							{/if}
						{/each}
						<Button
							variant="outline"
							size="sm"
							onclick={() => goToPage((pagination?.page ?? 1) + 1)}
							disabled={(pagination?.page ?? 1) >= (pagination?.totalPages ?? 1)}
						>
							Next
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>