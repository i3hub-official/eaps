<!-- src/routes/(lecturer)/lecturer/report/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import {
		AlertCircle,
		Building2,
		CheckCircle,
		ChevronLeft,
		ChevronRight,
		ChevronsUpDown,
		Download,
		FileBarChart,
		LoaderCircle,
		RefreshCw,
		Users,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';

	let { data } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let isDownloading = $state(false);
	let filterCourse = $state(data?.filters?.course || 'all');
	let filterAssessment = $state(data?.filters?.assessment || 'all');

	// ─── Combobox state ───────────────────────────────────────────────────────
	let courseOpen = $state(false);
	let assessmentOpen = $state(false);
	let courseTriggerRef = $state<HTMLButtonElement>(null!);
	let assessmentTriggerRef = $state<HTMLButtonElement>(null!);

	// ─── Derived ──────────────────────────────────────────────────────────────
	let assessments = $derived(data?.assessments ?? []);
	let rows = $derived(data?.rows ?? []);
	let error = $derived(data?.error);

	const selectedCourseLabel = $derived(
		filterCourse === 'all'
			? 'All Courses'
			: data?.courses?.find((c) => c.id === filterCourse)?.label ?? 'All Courses'
	);
	const selectedAssessmentLabel = $derived(
		filterAssessment === 'all'
			? 'All Assessments'
			: data?.allAssessments?.find((a) => a.id === filterAssessment)?.label ?? 'All Assessments'
	);

	// ─── Pagination ───────────────────────────────────────────────────────────
	const PAGE_SIZE = 20;
	let currentPage = $state(1);

	$effect(() => {
		rows;
		currentPage = 1;
	});

	let totalPages = $derived(Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
	let pagedRows = $derived(rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	// ─── Stats ────────────────────────────────────────────────────────────────
	let stats = $derived.by(() => {
		const sat = rows.filter((r) => r.overallPct !== null);
		if (sat.length === 0) return { avg: null, passing: 0, total: rows.length };
		const avg = Math.round(sat.reduce((s, r) => s + (r.overallPct ?? 0), 0) / sat.length);
		const passing = sat.filter((r) => r.overallPass).length;
		return { avg, passing, total: rows.length };
	});

	// ─── Handlers ─────────────────────────────────────────────────────────────
	function closeCourse() {
		courseOpen = false;
		tick().then(() => courseTriggerRef?.focus());
	}
	function closeAssessment() {
		assessmentOpen = false;
		tick().then(() => assessmentTriggerRef?.focus());
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterCourse !== 'all') params.set('course', filterCourse);
		if (filterAssessment !== 'all') params.set('assessment', filterAssessment);
		window.location.href = `/lecturer/report?${params.toString()}`;
	}

	function clearFilters() {
		filterCourse = 'all';
		filterAssessment = 'all';
		window.location.href = '/lecturer/report';
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	async function downloadPdf() {
		if (isDownloading) return;
		isDownloading = true;
		try {
			const params = new URLSearchParams();
			if (filterCourse !== 'all') params.set('course', filterCourse);
			if (filterAssessment !== 'all') params.set('assessment', filterAssessment);
			const res = await fetch(`/lecturer/report?${params.toString()}`, {
				headers: { Accept: 'application/pdf' },
			});
			if (!res.ok) throw new Error('PDF generation failed');
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `score-report-${new Date().toISOString().slice(0, 10)}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error(e);
		} finally {
			isDownloading = false;
		}
	}

	// ─── Grade helpers ────────────────────────────────────────────────────────
	function gradeColor(grade: string) {
		const map: Record<string, string> = {
			A: 'text-green-600',
			B: 'text-blue-600',
			C: 'text-yellow-600',
			D: 'text-orange-500',
			E: 'text-red-500',
			F: 'text-red-800',
		};
		return map[grade] ?? 'text-muted-foreground';
	}
</script>

<svelte:head>
	<title>Score Report — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Score Report" description="Assessment scores for all students">
	{#snippet actions()}
		<div class="flex items-center gap-2">
			{#if rows.length > 0}
				<Button size="sm" onclick={downloadPdf} disabled={isDownloading}>
					{#if isDownloading}
						<LoaderCircle class="size-4 animate-spin" />
					{:else}
						<Download class="size-4" />
					{/if}
					Export PDF
				</Button>
			{/if}
			<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isRefreshing}>
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

<div class="p-6">
	{#if !data}
		<!-- ─── Skeleton ────────────────────────────────────────────────────── -->
		<div class="grid gap-6 md:grid-cols-3">
			{#each [1, 2, 3] as i (i)}
				<Card>
					<CardHeader><Skeleton class="h-4 w-24" /></CardHeader>
					<CardContent><Skeleton class="h-8 w-16" /><Skeleton class="mt-2 h-3 w-28" /></CardContent>
				</Card>
			{/each}
		</div>
		<Card class="mt-6"><CardContent class="p-6"><Skeleton class="h-64 w-full" /></CardContent></Card>

	{:else if error}
		<!-- ─── Error ────────────────────────────────────────────────────────── -->
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Building2 class="mb-4 size-12 text-muted-foreground/50" />
				<h3 class="text-lg font-semibold">Cannot load report</h3>
				<p class="mt-1 text-sm text-muted-foreground">Please contact your HOD to assign a department.</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" /> Try Again
				</Button>
			</CardContent>
		</Card>

	{:else}
		<!-- ─── Summary Cards ─────────────────────────────────────────────────── -->
		<div class="grid gap-6 sm:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats.total}</div>
					<p class="text-xs text-muted-foreground">sat at least one assessment</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Class Average</CardTitle>
					<FileBarChart class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{stats.avg !== null ? `${stats.avg}%` : '—'}
					</div>
					<p class="text-xs text-muted-foreground">overall across all assessments</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Pass Rate</CardTitle>
					<CheckCircle class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600">
						{stats.total > 0 ? `${Math.round((stats.passing / stats.total) * 100)}%` : '—'}
					</div>
					<p class="text-xs text-muted-foreground">
						{stats.passing} of {stats.total} students passing
					</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters ───────────────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex flex-wrap gap-2">
						<!-- Course combobox -->
						<Popover.Root bind:open={courseOpen}>
							<Popover.Trigger bind:ref={courseTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="h-10 w-[200px] justify-between"
										role="combobox"
										aria-expanded={courseOpen}
									>
										<span class="truncate">{selectedCourseLabel}</span>
										<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[240px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search courses..." />
									<Command.List>
										<Command.Empty>No course found.</Command.Empty>
										<Command.Group>
											<Command.Item value="all" onSelect={() => { filterCourse = 'all'; closeCourse(); }}>
												<CheckCircle class={cn('mr-2 size-4', filterCourse === 'all' ? 'opacity-100' : 'opacity-0')} />
												All Courses
											</Command.Item>
											{#each data?.courses ?? [] as course (course.id)}
												{#if course.id !== 'all'}
													<Command.Item value={course.id} onSelect={() => { filterCourse = course.id; closeCourse(); }}>
														<CheckCircle class={cn('mr-2 size-4', filterCourse === course.id ? 'opacity-100' : 'opacity-0')} />
														{course.label}
													</Command.Item>
												{/if}
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<!-- Assessment combobox -->
						<Popover.Root bind:open={assessmentOpen}>
							<Popover.Trigger bind:ref={assessmentTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="h-10 w-[220px] justify-between"
										role="combobox"
										aria-expanded={assessmentOpen}
									>
										<span class="truncate">{selectedAssessmentLabel}</span>
										<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[280px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search assessments..." />
									<Command.List>
										<Command.Empty>No assessment found.</Command.Empty>
										<Command.Group>
											<Command.Item value="all" onSelect={() => { filterAssessment = 'all'; closeAssessment(); }}>
												<CheckCircle class={cn('mr-2 size-4', filterAssessment === 'all' ? 'opacity-100' : 'opacity-0')} />
												All Assessments
											</Command.Item>
											{#each data?.allAssessments ?? [] as a (a.id)}
												<Command.Item value={a.id} onSelect={() => { filterAssessment = a.id; closeAssessment(); }}>
													<CheckCircle class={cn('mr-2 size-4', filterAssessment === a.id ? 'opacity-100' : 'opacity-0')} />
													{a.label}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
					</div>

					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={applyFilters}>Apply</Button>
						<Button variant="ghost" size="sm" onclick={clearFilters}>Clear</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Score Matrix Table ─────────────────────────────────────────────── -->
		<Card class="mt-6">
			{#if assessments.length === 0}
				<CardContent class="flex flex-col items-center justify-center py-16">
					<FileBarChart class="mb-4 size-12 text-muted-foreground/40" />
					<h3 class="text-base font-semibold">No assessments found</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Try a different filter or create assessments first.
					</p>
				</CardContent>
			{:else if rows.length === 0}
				<CardContent class="flex flex-col items-center justify-center py-16">
					<Users class="mb-4 size-12 text-muted-foreground/40" />
					<h3 class="text-base font-semibold">No completed submissions yet</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Results will appear once students complete and submit assessments.
					</p>
				</CardContent>
			{:else}
				<!-- Horizontal scroll wrapper for wide tables -->
				<div class="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="sticky left-0 z-10 min-w-[160px] bg-background">Student</TableHead>
								<TableHead class="sticky left-0 z-10 min-w-[120px] bg-background">Matric No.</TableHead>
								{#each assessments as a (a.id)}
									<TableHead class="min-w-[130px] text-center">
										<div class="text-[10px] font-normal text-muted-foreground">{a.courseCode}</div>
										<div class="text-xs font-semibold leading-tight">{a.title}</div>
										<div class="text-[10px] text-muted-foreground">/{a.totalMarks} marks</div>
									</TableHead>
								{/each}
								<TableHead class="min-w-[110px] border-l-2 border-border bg-muted/50 text-center font-bold">
									Overall
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each pagedRows as row (row.studentId)}
								<TableRow>
									<TableCell class="sticky left-0 bg-background font-medium">
										{row.name}
									</TableCell>
									<TableCell class="sticky left-0 bg-background font-mono text-sm text-muted-foreground">
										{row.matric}
									</TableCell>

									{#each row.cells as cell, i (assessments[i].id)}
										{#if cell === null}
											<TableCell class="text-center text-muted-foreground/50">—</TableCell>
										{:else}
											<TableCell class="text-center">
												<div class="flex flex-col items-center gap-0.5">
													<span class="text-xs text-muted-foreground">
														{cell.scored}/{cell.total}
													</span>
													<span class="text-sm font-bold">{cell.pct}%</span>
													<div class="flex items-center gap-1">
														<span class={cn('text-sm font-extrabold', gradeColor(cell.grade))}>
															{cell.grade}
														</span>
														<Badge
															variant={cell.pass ? 'success' : 'destructive'}
															class="px-1 py-0 text-[10px]"
														>
															{cell.pass ? 'P' : 'F'}
														</Badge>
													</div>
													{#if cell.submittedAt}
														<span class="text-[10px] text-muted-foreground">
															{new Date(cell.submittedAt).toLocaleDateString('en-NG', {
																day: '2-digit',
																month: 'short',
															})}
														</span>
													{/if}
												</div>
											</TableCell>
										{/if}
									{/each}

									<!-- Overall column -->
									<TableCell class="border-l-2 border-border bg-muted/30 text-center">
										{#if row.overallPct !== null}
											<div class="flex flex-col items-center gap-0.5">
												<span class="text-sm font-bold">{row.overallPct}%</span>
												<div class="flex items-center gap-1">
													<span class={cn('text-sm font-extrabold', gradeColor(row.overallGrade))}>
														{row.overallGrade}
													</span>
													<Badge
														variant={row.overallPass ? 'success' : 'destructive'}
														class="px-1 py-0 text-[10px]"
													>
														{row.overallPass ? 'P' : 'F'}
													</Badge>
												</div>
											</div>
										{:else}
											<span class="text-muted-foreground/50">—</span>
										{/if}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>

				<!-- ─── Pagination ──────────────────────────────────────────────── -->
				{#if rows.length > PAGE_SIZE}
					<div class="flex items-center justify-between border-t px-4 py-3">
						<p class="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(
								currentPage * PAGE_SIZE,
								rows.length
							)} of {rows.length} students
						</p>
						<div class="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={() => currentPage--}
								disabled={currentPage === 1}
							>
								<ChevronLeft class="size-4" />
							</Button>
							<span class="px-2 text-sm">{currentPage} / {totalPages}</span>
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={() => currentPage++}
								disabled={currentPage === totalPages}
							>
								<ChevronRight class="size-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</Card>

		<!-- ─── Grade key ──────────────────────────────────────────────────────── -->
		{#if rows.length > 0}
			<Card class="mt-4 border-border bg-muted/30">
				<CardContent class="py-3">
					<div class="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
						<span class="font-medium text-foreground">Grade Key:</span>
						<span><strong class="text-green-600">A</strong> ≥ 70%</span>
						<span><strong class="text-blue-600">B</strong> ≥ 60%</span>
						<span><strong class="text-yellow-600">C</strong> ≥ 50%</span>
						<span><strong class="text-orange-500">D</strong> ≥ 45%</span>
						<span><strong class="text-red-500">E</strong> ≥ 40%</span>
						<span><strong class="text-red-800">F</strong> &lt; 40%</span>
						<span class="ml-auto">P = Pass &nbsp;|&nbsp; F = Fail (cut-off: 40%)</span>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>