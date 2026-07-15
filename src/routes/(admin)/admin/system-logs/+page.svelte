<!-- src/routes/(admin)/admin/system-logs/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		ChevronLeft,
		ChevronRight,
		Search,
		RefreshCw,
		LoaderCircle,
		Shield,
		AlertCircle,
		CheckCircle,
		XCircle,
		Clock,
		Server,
		HardDrive,
		Cpu,
		Activity,
		FileText,
		Download,
		Trash2,
		Filter,
		Info,
		AlertTriangle,
		Circle,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';
	import { cn } from '$lib/utils.js';
	import { deserialize } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterLevel = $state(data?.filters?.level || 'all');
	let filterSource = $state(data?.filters?.source || 'all');
	let isClearing = $state(false);
	let isExporting = $state(false);

	// ─── Data ────────────────────────────────────────────────────────────────
	let logs = $derived(data?.logs || []);
	let error = $derived(data?.error);
	let pagination = $derived(data?.pagination);
	let stats = $derived(data?.stats);
	let sources = $derived(data?.sources || []);
	let logLevels = $derived(data?.logLevels || []);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredLogs = $derived(
		logs.filter(log => {
			const matchesSearch = searchQuery === '' ||
				log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.source.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
			const matchesSource = filterSource === 'all' || log.source === filterSource;
			return matchesSearch && matchesLevel && matchesSource;
		})
	);

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterLevel !== 'all') params.set('level', filterLevel);
		if (filterSource !== 'all') params.set('source', filterSource);
		if (searchQuery) params.set('search', searchQuery);
		window.location.href = `/admin/system-logs?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterLevel = 'all';
		filterSource = 'all';
		window.location.href = '/admin/system-logs';
	}

	async function handleClearLogs() {
		const levelLabel = filterLevel === 'all' ? 'all' : filterLevel;
		const sourceLabel = filterSource === 'all' ? 'all' : filterSource;
		if (!confirm(`Clear ${levelLabel} ${sourceLabel} logs? This action cannot be undone.`)) return;
		
		isClearing = true;
		const fd = new FormData();
		fd.set('level', filterLevel);
		fd.set('source', filterSource);

		try {
			const res = await fetch('?/clearLogs', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success(result.data?.message || 'Logs cleared successfully');
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to clear logs');
			}
		} catch (err) {
			toast.error('Failed to clear logs');
		} finally {
			isClearing = false;
		}
	}

	async function handleExportLogs() {
		isExporting = true;
		const fd = new FormData();
		fd.set('level', filterLevel);
		fd.set('source', filterSource);
		fd.set('limit', '1000');

		try {
			const res = await fetch('?/exportLogs', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				const data = result.data;
				const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(url);
				toast.success(`Exported ${data.count} log entries`);
			} else {
				toast.error(result.data?.error || 'Failed to export logs');
			}
		} catch (err) {
			toast.error('Failed to export logs');
		} finally {
			isExporting = false;
		}
	}

	function getLevelColor(level: string) {
		const colors: Record<string, string> = {
			error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
			fatal: 'bg-rose-200 text-rose-800 dark:bg-rose-800/30 dark:text-rose-300 border-rose-300 dark:border-rose-700',
			warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
			warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
			info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
			debug: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
			trace: 'bg-gray-200 text-gray-600 dark:bg-gray-800/30 dark:text-gray-500 border-gray-300 dark:border-gray-700',
			verbose: 'bg-gray-200 text-gray-600 dark:bg-gray-800/30 dark:text-gray-500 border-gray-300 dark:border-gray-700',
		};
		return colors[level] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
	}

	function getLevelIcon(level: string) {
		const icons: Record<string, any> = {
			error: XCircle,
			fatal: AlertCircle,
			warn: AlertTriangle,
			warning: AlertTriangle,
			info: Info,
			debug: Circle,
			trace: Circle,
			verbose: Circle,
		};
		return icons[level] || Circle;
	}

	function getLevelDot(level: string) {
		const colors: Record<string, string> = {
			error: 'bg-red-500',
			fatal: 'bg-rose-600',
			warn: 'bg-yellow-500',
			warning: 'bg-yellow-500',
			info: 'bg-blue-500',
			debug: 'bg-gray-400',
			trace: 'bg-gray-300',
			verbose: 'bg-gray-300',
		};
		return colors[level] || 'bg-gray-400';
	}

	function formatDate(date: Date) {
		return new Date(date).toLocaleString('en-NG', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}

	function getRelativeTime(date: Date) {
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return formatDate(date);
	}

	// ─── Pagination ──────────────────────────────────────────────────────────
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>System Logs — EAPS</title>
</svelte:head>

<Topbar title="System Logs" description="Monitor system activity and server logs">
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
		<Button variant="outline" size="sm" onclick={handleExportLogs} disabled={isExporting}>
			{#if isExporting}
				<LoaderCircle class="mr-2 size-4 animate-spin" />
			{:else}
				<Download class="mr-2 size-4" />
			{/if}
			Export
		</Button>
		<Button variant="destructive" size="sm" onclick={handleClearLogs} disabled={isClearing}>
			{#if isClearing}
				<LoaderCircle class="mr-2 size-4 animate-spin" />
			{:else}
				<Trash2 class="mr-2 size-4" />
			{/if}
			Clear Logs
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Shield class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Access Restricted</h3>
				<p class="text-sm text-muted-foreground mt-1">{error}</p>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Stats Cards ────────────────────────────────────────────── -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Events</CardTitle>
					<Activity class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">total log entries</p>
				</CardContent>
			</Card>

			<Card class="border-red-200 dark:border-red-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Recent Errors</CardTitle>
					<AlertCircle class="size-4 text-red-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.recentErrors || 0}</div>
					<p class="text-xs text-muted-foreground">in last 24 hours</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Sources</CardTitle>
					<Server class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{Object.keys(stats?.bySource || {}).length}</div>
					<p class="text-xs text-muted-foreground">log sources</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Levels</CardTitle>
					<FileText class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{Object.keys(stats?.byLevel || {}).length}</div>
					<p class="text-xs text-muted-foreground">log levels</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters ────────────────────────────────────────────────────── -->
		<Card>
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchQuery}
								placeholder="Search logs..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterLevel}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterLevel === 'all' ? 'All Levels' : filterLevel.charAt(0).toUpperCase() + filterLevel.slice(1)}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Levels</SelectItem>
									{#each logLevels as level}
										<SelectItem value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterSource}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterSource === 'all' ? 'All Sources' : filterSource.charAt(0).toUpperCase() + filterSource.slice(1)}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Sources</SelectItem>
									{#each sources as source}
										<SelectItem value={source}>{source.charAt(0).toUpperCase() + source.slice(1)}</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							{#if searchQuery || filterLevel !== 'all' || filterSource !== 'all'}
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Clear
								</Button>
							{/if}
						</div>
					</div>
					
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {filteredLogs.length} of {pagination?.totalItems || 0} logs
						</p>
						<Button variant="outline" size="sm" onclick={applyFilters}>
							Apply Filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Logs Table ─────────────────────────────────────────────────── -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[500px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead class="w-[100px]">Time</TableHead>
									<TableHead class="w-[80px]">Level</TableHead>
									<TableHead>Message</TableHead>
									<TableHead class="w-[100px]">Source</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if filteredLogs.length === 0}
									<TableRow>
										<TableCell colspan="4" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterLevel !== 'all' || filterSource !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No logs match your filters</p>
											{:else}
												<Activity class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No logs available</p>
												<p class="text-sm mt-1">System logs will appear here as they are generated</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each filteredLogs as log}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="whitespace-nowrap">
												<div class="flex flex-col">
													<span class="text-sm">{formatDate(log.createdAt)}</span>
													<span class="text-xs text-muted-foreground">{getRelativeTime(log.createdAt)}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge class={getLevelColor(log.level)}>
													<span class={cn("size-1.5 rounded-full mr-1", getLevelDot(log.level))} />
													{log.level}
												</Badge>
											</TableCell>
											<TableCell>
												<div class="flex flex-col gap-0.5">
													<span class="text-sm break-words font-mono">{log.message}</span>
													{#if log.metadata && Object.keys(log.metadata).length > 0}
														<span class="text-xs text-muted-foreground/50">
															{JSON.stringify(log.metadata).slice(0, 100)}
															{JSON.stringify(log.metadata).length > 100 ? '…' : ''}
														</span>
													{/if}
													{#if log.ipAddress}
														<span class="text-xs text-muted-foreground/50">
															IP: {log.ipAddress}
														</span>
													{/if}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" class="text-xs">
													{log.source}
												</Badge>
											</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>
				</div>

				<!-- ─── Pagination ────────────────────────────────────────────── -->
				{#if pagination && pagination.totalPages > 1}
					<div class="flex items-center justify-between border-t border-border px-4 py-3">
						<div class="text-sm text-muted-foreground">
							Page {pagination.currentPage} of {pagination.totalPages}
							<span class="mx-2">•</span>
							{pagination.totalItems} total
						</div>
						<div class="flex gap-1">
							<Button
								variant="outline"
								size="sm"
								class="h-7 w-7 p-0"
								disabled={!pagination.hasPrev}
								onclick={() => goToPage(pagination.currentPage - 1)}
							>
								<ChevronLeft class="size-4" />
							</Button>
							{#each Array(Math.min(5, pagination.totalPages)).fill(0).map((_, i) => i + 1) as p}
								<Button
									variant={p === pagination.currentPage ? 'default' : 'outline'}
									size="sm"
									class="h-7 w-7 p-0 text-xs"
									onclick={() => goToPage(p)}
								>
									{p}
								</Button>
							{/each}
							{#if pagination.totalPages > 5}
								<span class="flex items-center px-1 text-sm text-muted-foreground">…</span>
								<Button
									variant="outline"
									size="sm"
									class="h-7 w-7 p-0 text-xs"
									onclick={() => goToPage(pagination.totalPages)}
								>
									{pagination.totalPages}
								</Button>
							{/if}
							<Button
								variant="outline"
								size="sm"
								class="h-7 w-7 p-0"
								disabled={!pagination.hasNext}
								onclick={() => goToPage(pagination.currentPage + 1)}
							>
								<ChevronRight class="size-4" />
							</Button>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- ─── Log Distribution ───────────────────────────────────────────── -->
		{#if stats && (Object.keys(stats.byLevel).length > 0 || Object.keys(stats.bySource).length > 0)}
			<div class="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle class="text-sm font-medium">Log Levels Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="space-y-2">
							{#each Object.entries(stats.byLevel) as [level, count]}
								{@const total = stats.total || 1}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span class="flex items-center gap-1.5">
											<span class={cn("size-2 rounded-full", getLevelDot(level))} />
											{level}
										</span>
										<span>{count} ({Math.round((count / total) * 100)}%)</span>
									</div>
									<Progress value={(count / total) * 100} class="h-1.5 mt-0.5" />
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="text-sm font-medium">Log Sources Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="space-y-2">
							{#each Object.entries(stats.bySource).slice(0, 5) as [source, count]}
								{@const total = stats.total || 1}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span>{source}</span>
										<span>{count} ({Math.round((count / total) * 100)}%)</span>
									</div>
									<Progress value={(count / total) * 100} class="h-1.5 mt-0.5" />
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			</div>
		{/if}
	{/if}
</main>