<!-- src/routes/(lecturer)/lecturer/assessments/+page.svelte -->
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
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import XCircle from '@lucide/svelte/icons/x-circle';
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
		XCircle as XCircleIcon,
		BarChart3,
		FileCheck,
		ClipboardList,
		GraduationCap,
		ChevronDown,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

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

	// ─── URL Sync ────────────────────────────────────────────────────────────
	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('status')) filterStatus = params.get('status')!;
		if (params.get('type')) filterType = params.get('type')!;
		if (params.get('search')) searchQuery = params.get('search')!;
	});

	function updateFilters() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (filterStatus !== 'all') url.searchParams.set('status', filterStatus);
		else url.searchParams.delete('status');
		if (filterType !== 'all') url.searchParams.set('type', filterType);
		else url.searchParams.delete('type');
		window.history.replaceState({}, '', url.toString());
	}

	$effect(() => {
		updateFilters();
	});

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
			const due = new Date(dueDate);
			const countdown = getCountdown(due);
			return {
				label: countdown ? `Due ${formatSchedule(dueDate)} · ${countdown} left` : `Due ${formatSchedule(dueDate)}`,
				tone: countdown ? 'warning' : 'default',
			};
		}

		switch (status) {
			case 'DRAFT':
				return startTime
					? { label: `Planned for ${formatSchedule(startTime)}`, tone: 'default' }
					: null;
			case 'SCHEDULED': {
				if (!startTime) return { label: 'Awaiting start time', tone: 'warning' };
				const start = new Date(startTime);
				const countdown = getCountdown(start);
				return {
					label: countdown ? `Opens ${formatSchedule(startTime)} · ${countdown}` : `Opens ${formatSchedule(startTime)}`,
					tone: 'warning',
				};
			}
			case 'ACTIVE': {
				if (!endTime) return { label: 'Open now', tone: 'success' };
				const end = new Date(endTime);
				const countdown = getCountdown(end);
				return {
					label: countdown ? `Closes ${formatSchedule(endTime)} · ${countdown} left` : `Closes ${formatSchedule(endTime)}`,
					tone: countdown ? 'warning' : 'success',
				};
			}
			case 'ENDED':
				return endTime
					? { label: `Ended ${formatSchedule(endTime)}`, tone: 'muted' }
					: { label: 'Ended', tone: 'muted' };
			case 'PUBLISHED':
				return startTime
					? { label: `Starts ${formatSchedule(startTime)}`, tone: 'default' }
					: { label: 'Published', tone: 'default' };
			default:
				return null; // CANCELLED
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

	function getCountdown(target: Date, thresholdHours = 48): string | null {
		const now = Date.now();
		const diffMs = target.getTime() - now;

		if (diffMs <= 0) return null;
		const diffHours = diffMs / (1000 * 60 * 60);
		if (diffHours > thresholdHours) return null;

		const totalMinutes = Math.floor(diffMs / (1000 * 60));
		const days = Math.floor(totalMinutes / (60 * 24));
		const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
		const minutes = totalMinutes % 60;

		if (days >= 1) {
			if (hours === 0) return `${days} day${days === 1 ? '' : 's'}`;
			return `${days} day${days === 1 ? '' : 's'} ${hours} hr${hours === 1 ? '' : 's'}`;
		}
		if (hours >= 1) {
			if (minutes === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
			return `${hours} hr${hours === 1 ? '' : 's'} ${minutes} min`;
		}
		return `${minutes} min`;
	}

	// ─── Sorting ──────────────────────────────────────────────────────────────
	const STATUS_PRIORITY: Record<string, number> = {
		ACTIVE: 0,
		SCHEDULED: 1,
		DRAFT: 2,
		PUBLISHED: 3,
		ENDED: 4,
		CANCELLED: 5,
	};

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
				return null;
		}
	}

	function sortByUrgency<T extends { status: string; type: string; startTime: any; endTime: any; dueDate: any }>(
		list: T[]
	): T[] {
		return [...list].sort((a, b) => {
			const priorityA = STATUS_PRIORITY[a.status] ?? 99;
			const priorityB = STATUS_PRIORITY[b.status] ?? 99;

			if (priorityA !== priorityB) return priorityA - priorityB;

			const dateA = getUrgencyDate(a);
			const dateB = getUrgencyDate(b);
			const timeA = dateA ? dateA.getTime() : Infinity;
			const timeB = dateB ? dateB.getTime() : Infinity;

			return timeA - timeB;
		});
	}

	let sortedAssessments = $derived(sortByUrgency(filteredAssessments));

	// ─── Pagination ─────────────────────────────────────────────────────────
	const PAGE_SIZE = 10;
	let currentPage = $state(1);

	let totalPages = $derived(Math.max(1, Math.ceil(sortedAssessments.length / PAGE_SIZE)));

	let paginatedAssessments = $derived(
		sortedAssessments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);

	$effect(() => {
		const _deps = [searchQuery, filterType, filterStatus];
		void _deps;
		currentPage = 1;
	});

	function goToPage(page: number) {
		currentPage = Math.min(Math.max(1, page), totalPages);
	}

	// ─── Dot-badge colors ──────────────────────────────────────────────────
	function getTypeDotColor(type: string) {
		const colors: Record<string, string> = {
			EXAMINATION: 'bg-red-500',
			TEST: 'bg-yellow-500',
			ASSIGNMENT: 'bg-blue-500',
			PRACTICE: 'bg-green-500',
		};
		return colors[type] || 'bg-gray-400';
	}

	function getStatusDotColor(status: string) {
		const colors: Record<string, string> = {
			DRAFT: 'bg-gray-400',
			PUBLISHED: 'bg-blue-500',
			SCHEDULED: 'bg-yellow-500',
			ACTIVE: 'bg-green-500',
			ENDED: 'bg-purple-500',
			CANCELLED: 'bg-red-500',
		};
		return colors[status] || 'bg-gray-400';
	}

	const TAG_PALETTE = [
		'bg-purple-500', 'bg-blue-500', 'bg-orange-500',
		'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
	];

	function tagDotColor(tag: string) {
		let hash = 0;
		for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
		return TAG_PALETTE[hash % TAG_PALETTE.length];
	}

	function initials(title: string) {
		return title.trim().slice(0, 2).toUpperCase();
	}

	function clearAllFilters() {
		searchQuery = '';
		filterType = 'all';
		filterStatus = 'all';
	}
</script>

<svelte:head>
	<title>Assessments — EAPS</title>
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
			<DropdownMenuTrigger>
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
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
			{#each [1, 2, 3, 4, 5] as item (item)}
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
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
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

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Pass Rate</CardTitle>
					<CheckCircle class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{stats?.total > 0 
							? Math.round(((stats?.total - stats?.draft) / stats?.total) * 100) 
							: 0}%
					</div>
					<p class="text-xs text-muted-foreground">overall pass rate</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Status Distribution Bar ──────────────────────────────────────── -->
		<Card class="mt-6">
			<CardHeader class="pb-2">
				<CardTitle class="text-sm font-medium">Assessment Status Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex h-2 w-full rounded-full overflow-hidden">
					{#if stats?.total > 0}
						{@const activePct = Math.round((stats.active || 0) / stats.total * 100)}
						{@const scheduledPct = Math.round((stats.scheduled || 0) / stats.total * 100)}
						{@const publishedPct = Math.round((stats.published || 0) / stats.total * 100)}
						{@const draftPct = Math.round((stats.draft || 0) / stats.total * 100)}
						{@const endedPct = Math.round((stats.ended || 0) / stats.total * 100)}
						
						{#if activePct > 0}
							<div class="h-full bg-green-500" style="width: {activePct}%" title="Active" />
						{/if}
						{#if scheduledPct > 0}
							<div class="h-full bg-yellow-500" style="width: {scheduledPct}%" title="Scheduled" />
						{/if}
						{#if publishedPct > 0}
							<div class="h-full bg-blue-500" style="width: {publishedPct}%" title="Published" />
						{/if}
						{#if draftPct > 0}
							<div class="h-full bg-gray-400" style="width: {draftPct}%" title="Draft" />
						{/if}
						{#if endedPct > 0}
							<div class="h-full bg-purple-500" style="width: {endedPct}%" title="Ended" />
						{/if}
					{:else}
						<div class="h-full w-full bg-muted" />
					{/if}
				</div>
				<div class="mt-2 flex flex-wrap gap-3 text-xs">
					<span class="flex items-center gap-1">
						<span class="size-2 rounded-full bg-green-500" /> Active ({stats?.active || 0})
					</span>
					<span class="flex items-center gap-1">
						<span class="size-2 rounded-full bg-yellow-500" /> Scheduled ({stats?.scheduled || 0})
					</span>
					<span class="flex items-center gap-1">
						<span class="size-2 rounded-full bg-blue-500" /> Published ({stats?.published || 0})
					</span>
					<span class="flex items-center gap-1">
						<span class="size-2 rounded-full bg-gray-400" /> Draft ({stats?.draft || 0})
					</span>
					<span class="flex items-center gap-1">
						<span class="size-2 rounded-full bg-purple-500" /> Ended ({stats?.ended || 0})
					</span>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Tabs ──────────────────────────────────────────────────────────── -->
<Tabs bind:value={activeTab} class="mt-8">
	<TabsList class="mb-6">
		<TabsTrigger value="overview">Overview</TabsTrigger>
		<TabsTrigger value="practice">Practice</TabsTrigger>
		<TabsTrigger value="assignment">Assignments</TabsTrigger>
		<TabsTrigger value="test">Tests</TabsTrigger>
		<TabsTrigger value="examination">Exams</TabsTrigger>
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
					<div class="flex flex-wrap gap-2">
						<Select type="single" bind:value={filterType}>
							<SelectTrigger class="w-[130px]">
								<span class="truncate">
									{filterType === 'all' ? 'All Types' : getTypeBadge(filterType).label}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								{#each types as type}
									<SelectItem value={type}>{getTypeBadge(type).label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>

						<Select type="single" bind:value={filterStatus}>
							<SelectTrigger class="w-[130px]">
								<span class="truncate">
									{filterStatus === 'all' ? 'All Status' : getStatusBadge(filterStatus).label}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								{#each statuses as status}
									<SelectItem value={status}>{getStatusBadge(status).label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>

						{#if searchQuery || filterType !== 'all' || filterStatus !== 'all'}
							<Button 
								variant="ghost" 
								size="sm" 
								onclick={clearAllFilters}
							>
								<XCircleIcon class="mr-2 size-4" />
								Clear Filters
							</Button>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Assessments Table ────────────────────────────────────────── -->
		<Card class="overflow-hidden">
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Course</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Tags</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Schedule</TableHead>
									<TableHead class="text-center">Students</TableHead>
									<TableHead class="text-center">Completion</TableHead>
									<TableHead class="text-center">Avg Score</TableHead>
									<TableHead class="text-center">Pass Rate</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if paginatedAssessments.length === 0}
									<TableRow>
										<TableCell colspan={11} class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterType !== 'all' || filterStatus !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No assessments match your filters</p>
												<Button variant="outline" size="sm" class="mt-2" onclick={clearAllFilters}>
													Clear Filters
												</Button>
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
									{#each paginatedAssessments as assessment (assessment.id)}
										<TableRow>
											<TableCell class="font-medium">
												<div class="flex items-center gap-2.5">
													<div class="flex size-7 shrink-0 items-center justify-center rounded-full {getTypeDotColor(assessment.type)} text-[11px] font-semibold text-white">
														{initials(assessment.title)}
													</div>
													<span>{assessment.title}</span>
												</div>
											</TableCell>
											<TableCell class="text-muted-foreground">{assessment.courseCode}</TableCell>
											<TableCell>
												<span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap">
													<span class="size-1.5 rounded-full {getTypeDotColor(assessment.type)}" />
													{getTypeBadge(assessment.type).label}
												</span>
											</TableCell>
											<TableCell>
												{#if assessment.tags?.length}
													<div class="flex flex-wrap gap-1">
														{#each assessment.tags as tag}
															<span class="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap">
																<span class="size-1.5 rounded-full {tagDotColor(tag)}" />
																{tag}
															</span>
														{/each}
													</div>
												{:else}
													<span class="text-xs text-muted-foreground/50">—</span>
												{/if}
											</TableCell>
											<TableCell>
												<span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap">
													<span class="size-1.5 rounded-full {getStatusDotColor(assessment.status)}" />
													{getStatusBadge(assessment.status).label}
												</span>
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
											<TableCell class="text-center">
												<span class="text-sm font-medium {assessment.passRate >= 70 ? 'text-green-500' : assessment.passRate >= 50 ? 'text-yellow-500' : 'text-red-500'}">
													{assessment.passRate || 0}%
												</span>
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

				<!-- ─── Pagination footer ─────────────────────────────────────────── -->
				<div class="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
					<span class="text-muted-foreground">
						Page <strong class="text-foreground">{currentPage}</strong> of <strong class="text-foreground">{totalPages}</strong>
						· {sortedAssessments.length} total
					</span>
					<div class="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							class="h-7 w-7 p-0"
							disabled={currentPage <= 1}
							onclick={() => goToPage(currentPage - 1)}
						>
							<ChevronLeft class="size-4" />
						</Button>
						{#each Array(totalPages) as _, i}
							{@const page = i + 1}
							{#if totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1}
								<Button
									variant={page === currentPage ? 'default' : 'outline'}
									size="sm"
									class="h-7 w-7 p-0 text-xs"
									onclick={() => goToPage(page)}
								>
									{page}
								</Button>
							{:else if Math.abs(page - currentPage) === 2}
								<span class="px-1 text-muted-foreground">…</span>
							{/if}
						{/each}
						<Button
							variant="outline"
							size="sm"
							class="h-7 w-7 p-0"
							disabled={currentPage >= totalPages}
							onclick={() => goToPage(currentPage + 1)}
						>
							<ChevronRight class="size-4" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Quick Stats ────────────────────────────────────────────────────── -->
		{#if filteredAssessments.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredAssessments.length}</strong> of <strong class="text-foreground">{assessments.length}</strong> assessments
						</span>
						<div class="flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1">
								<FileCheck class="size-4 text-green-500" />
								{filteredAssessments.filter(a => a.status === 'ACTIVE').length} Active
							</span>
							<span class="flex items-center gap-1">
								<Clock class="size-4 text-yellow-500" />
								{filteredAssessments.filter(a => a.status === 'SCHEDULED').length} Scheduled
							</span>
							<span class="flex items-center gap-1">
								<FileText class="size-4 text-gray-500" />
								{filteredAssessments.filter(a => a.status === 'DRAFT').length} Drafts
							</span>
							<span class="flex items-center gap-1">
								<XCircleIcon class="size-4 text-red-500" />
								{filteredAssessments.filter(a => a.status === 'CANCELLED').length} Cancelled
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	</TabsContent>

	<!-- ─── Practice Tab ─────────────────────────────────────────────────── -->
	<TabsContent value="practice">
		<Card>
			<CardHeader>
				<CardTitle>Practice Assessments</CardTitle>
				<CardDescription>All practice assessments</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				{#if assessments.filter(a => a.type === 'PRACTICE').length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<GraduationCap class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p>No practice assessments created yet</p>
						<Button href="/lecturer/assessments/create/practice" size="sm" class="mt-2">
							<Plus class="mr-2 size-4" />
							Create Practice
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
										<TableHead class="text-center">Pass Rate</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each sortByUrgency(assessments.filter(a => a.type === 'PRACTICE')) as assessment}
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
											<TableCell class="text-center">
												<span class="text-sm font-medium {assessment.passRate >= 70 ? 'text-green-500' : assessment.passRate >= 50 ? 'text-yellow-500' : 'text-red-500'}">
													{assessment.passRate || 0}%
												</span>
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

	<!-- ─── Assignment Tab ───────────────────────────────────────────────── -->
	<TabsContent value="assignment">
		<Card>
			<CardHeader>
				<CardTitle>Assignments</CardTitle>
				<CardDescription>All assignment assessments</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				{#if assessments.filter(a => a.type === 'ASSIGNMENT').length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<FileText class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p>No assignments created yet</p>
						<Button href="/lecturer/assessments/create/assignment" size="sm" class="mt-2">
							<Plus class="mr-2 size-4" />
							Create Assignment
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
										<TableHead class="text-center">Pass Rate</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each sortByUrgency(assessments.filter(a => a.type === 'ASSIGNMENT')) as assessment}
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
											<TableCell class="text-center">
												<span class="text-sm font-medium {assessment.passRate >= 70 ? 'text-green-500' : assessment.passRate >= 50 ? 'text-yellow-500' : 'text-red-500'}">
													{assessment.passRate || 0}%
												</span>
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

	<!-- ─── Test Tab ─────────────────────────────────────────────────────── -->
	<TabsContent value="test">
		<Card>
			<CardHeader>
				<CardTitle>Tests</CardTitle>
				<CardDescription>All test assessments</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				{#if assessments.filter(a => a.type === 'TEST').length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<ClipboardList class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p>No tests created yet</p>
						<Button href="/lecturer/assessments/create/test" size="sm" class="mt-2">
							<Plus class="mr-2 size-4" />
							Create Test
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
										<TableHead class="text-center">Pass Rate</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each sortByUrgency(assessments.filter(a => a.type === 'TEST')) as assessment}
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
											<TableCell class="text-center">
												<span class="text-sm font-medium {assessment.passRate >= 70 ? 'text-green-500' : assessment.passRate >= 50 ? 'text-yellow-500' : 'text-red-500'}">
													{assessment.passRate || 0}%
												</span>
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

	<!-- ─── Exam Tab ─────────────────────────────────────────────────────── -->
	<TabsContent value="examination">
		<Card>
			<CardHeader>
				<CardTitle>Exams</CardTitle>
				<CardDescription>All examination assessments</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				{#if assessments.filter(a => a.type === 'EXAMINATION').length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<FileCheck class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p>No exams created yet</p>
						<Button href="/lecturer/assessments/create/exam" size="sm" class="mt-2">
							<Plus class="mr-2 size-4" />
							Create Exam
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
										<TableHead class="text-center">Pass Rate</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each sortByUrgency(assessments.filter(a => a.type === 'EXAMINATION')) as assessment}
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
											<TableCell class="text-center">
												<span class="text-sm font-medium {assessment.passRate >= 70 ? 'text-green-500' : assessment.passRate >= 50 ? 'text-yellow-500' : 'text-red-500'}">
													{assessment.passRate || 0}%
												</span>
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
</Tabs>
	{/if}
</div>