<!-- src/routes/(admin)/admin/audit-logs/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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
		Filter,
		XCircle,
		RefreshCw,
		LoaderCircle,
		Shield,
		User,
		GraduationCap,
		Building2,
		BookOpen,
		FileText,
		Users,
		AlertCircle,
		Clock,
		CheckCircle,
		Eye,
		Edit,
		Trash2,
		Plus,
		LogIn,
		LogOut,
		CheckCheck,
		X,
		Download,
		Calendar,
		Server,
		Activity,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';
	import { cn } from '$lib/utils.js';
	import { page } from '$app/state';

	let { data } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterAction = $state(data?.filters?.action || 'all');
	let filterEntity = $state(data?.filters?.entity || 'all');
	let filterActor = $state(data?.filters?.actor || 'all');
	let filterDateFrom = $state(data?.filters?.dateFrom || '');
	let filterDateTo = $state(data?.filters?.dateTo || '');
	let expandedLog = $state<string | null>(null);

	// ─── Data ────────────────────────────────────────────────────────────────
	let logs = $derived(data?.logs || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);
	let pagination = $derived(data?.pagination);
	let actorOptions = $derived(data?.actorOptions || []);
	let availableActions = $derived(data?.availableActions || []);
	let availableEntities = $derived(data?.availableEntities || []);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredLogs = $derived(
		logs.filter(log => {
			const matchesSearch = searchQuery === '' ||
				log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(log.entityId && log.entityId.toLowerCase().includes(searchQuery.toLowerCase()));
			return matchesSearch;
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
		if (filterAction !== 'all') params.set('action', filterAction);
		if (filterEntity !== 'all') params.set('entity', filterEntity);
		if (filterActor !== 'all') params.set('actor', filterActor);
		if (filterDateFrom) params.set('dateFrom', filterDateFrom);
		if (filterDateTo) params.set('dateTo', filterDateTo);
		window.location.href = `/admin/audit-logs?${params.toString()}`;
	}

	function clearFilters() {
		filterAction = 'all';
		filterEntity = 'all';
		filterActor = 'all';
		filterDateFrom = '';
		filterDateTo = '';
		window.location.href = '/admin/audit-logs';
	}

	function toggleLog(id: string) {
		expandedLog = expandedLog === id ? null : id;
	}

	function getActionColor(action: string) {
		const colors: Record<string, string> = {
			CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
			UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
			DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
			LOGIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
			LOGOUT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
			VIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
			EXPORT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
			APPROVE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
			REJECT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
			PUBLISH: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
			UNPUBLISH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
			GRADE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
			RELEASE: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400 border-lime-200 dark:border-lime-800',
			SUSPEND: 'bg-red-200 text-red-800 dark:bg-red-800/30 dark:text-red-300 border-red-300 dark:border-red-700',
			ACTIVATE: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
			RESET_PASSWORD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
			VERIFY: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
			INVITE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
			REVOKE: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800',
		};
		return colors[action] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
	}

	function getActionIcon(action: string) {
		const icons: Record<string, any> = {
			CREATE: Plus,
			UPDATE: Edit,
			DELETE: Trash2,
			LOGIN: LogIn,
			LOGOUT: LogOut,
			VIEW: Eye,
			EXPORT: Download,
			APPROVE: CheckCircle,
			REJECT: X,
			PUBLISH: CheckCheck,
			UNPUBLISH: X,
			GRADE: Edit,
			RELEASE: CheckCircle,
			SUSPEND: AlertCircle,
			ACTIVATE: CheckCircle,
			RESET_PASSWORD: RefreshCw,
			VERIFY: CheckCircle,
			INVITE: Plus,
			REVOKE: X,
		};
		return icons[action] || Activity;
	}

	function getEntityIcon(entity: string) {
		const icons: Record<string, any> = {
			User: User,
			Student: GraduationCap,
			Staff: Users,
			Course: BookOpen,
			Assessment: FileText,
			Question: FileText,
			Result: FileText,
			Registration: FileText,
			Session: Activity,
			Notification: AlertCircle,
			Invitation: Plus,
			FaceData: Shield,
			Attendance: Calendar,
			Grade: Edit,
			Transcript: FileText,
		};
		return icons[entity] || FileText;
	}

	function getActorIcon(type: string) {
		if (type === 'staff') return Users;
		if (type === 'student') return GraduationCap;
		return Shield;
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleString('en-NG', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}

	function formatDateShort(date: string | Date) {
		return new Date(date).toLocaleDateString('en-NG', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}

	function formatTime(date: string | Date) {
		return new Date(date).toLocaleTimeString('en-NG', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}

	function getRelativeTime(date: string | Date) {
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return formatDateShort(date);
	}

	function truncateJSON(data: any, maxLength: number = 100) {
		const str = JSON.stringify(data);
		if (str.length <= maxLength) return str;
		return str.substring(0, maxLength) + '…';
	}

	// ─── Pagination ──────────────────────────────────────────────────────────
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>Audit Logs — EAPS</title>
</svelte:head>

<Topbar title="Audit Logs" description="Monitor system activity and user actions">
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
		<Button variant="outline" size="sm" onclick={applyFilters}>
			<Download class="mr-2 size-4" />
			Export Logs
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
			<Card class="transition-all hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Events</CardTitle>
					<Activity class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">total audit events</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Last 7 Days</CardTitle>
					<Calendar class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.recentCount || 0}</div>
					<p class="text-xs text-muted-foreground">recent activity</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-purple-200 dark:border-purple-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Unique Actions</CardTitle>
					<Server class="size-4 text-purple-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
						{Object.keys(stats?.byAction || {}).length}
					</div>
					<p class="text-xs text-muted-foreground">action types</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Entities</CardTitle>
					<Building2 class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">
						{Object.keys(stats?.byEntity || {}).length}
					</div>
					<p class="text-xs text-muted-foreground">entity types</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters ────────────────────────────────────────────────────── -->
		<Card>
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4">
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
						<div class="space-y-1">
							<Label class="text-xs">Action</Label>
							<Select type="single" bind:value={filterAction}>
								<SelectTrigger class="w-full h-9">
									<span class="truncate text-sm">
										{filterAction === 'all' ? 'All Actions' : filterAction}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Actions</SelectItem>
									{#each availableActions as action}
										<SelectItem value={action}>{action}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="space-y-1">
							<Label class="text-xs">Entity</Label>
							<Select type="single" bind:value={filterEntity}>
								<SelectTrigger class="w-full h-9">
									<span class="truncate text-sm">
										{filterEntity === 'all' ? 'All Entities' : filterEntity}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Entities</SelectItem>
									{#each availableEntities as entity}
										<SelectItem value={entity}>{entity}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="space-y-1">
							<Label class="text-xs">Actor</Label>
							<Select type="single" bind:value={filterActor}>
								<SelectTrigger class="w-full h-9">
									<span class="truncate text-sm">
										{filterActor === 'all' ? 'All Actors' : 
											actorOptions.find(a => a.id === filterActor)?.name || 'Unknown'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Actors</SelectItem>
									{#each actorOptions as actor}
										<SelectItem value={actor.id}>
											<span class="flex items-center gap-2">
												{actor.type === 'staff' ? '👤' : '🎓'}
												{actor.name}
											</span>
										</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="space-y-1">
							<Label class="text-xs">From</Label>
							<Input
								type="date"
								bind:value={filterDateFrom}
								class="h-9 text-sm"
							/>
						</div>

						<div class="space-y-1">
							<Label class="text-xs">To</Label>
							<Input
								type="date"
								bind:value={filterDateTo}
								class="h-9 text-sm"
							/>
						</div>
					</div>

					<div class="flex items-center justify-between gap-4">
						<div class="flex gap-2">
							<Button size="sm" onclick={applyFilters}>
								Apply Filters
							</Button>
							<Button size="sm" variant="outline" onclick={clearFilters}>
								Clear
							</Button>
						</div>
						<p class="text-sm text-muted-foreground">
							Showing {filteredLogs.length} of {pagination?.totalItems || 0} events
						</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Audit Logs Table ──────────────────────────────────────────── -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead class="w-[100px]">Time</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Entity</TableHead>
									<TableHead>Actor</TableHead>
									<TableHead>Details</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if filteredLogs.length === 0}
									<TableRow>
										<TableCell colspan="6" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterAction !== 'all' || filterEntity !== 'all' || filterActor !== 'all' || filterDateFrom || filterDateTo}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No logs match your filters</p>
												<Button variant="outline" size="sm" class="mt-2" onclick={clearFilters}>
													Clear Filters
												</Button>
											{:else}
												<Activity class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No audit logs found</p>
												<p class="text-sm mt-1">Activity will appear here as users interact with the system</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each filteredLogs as log}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="whitespace-nowrap">
												<div class="flex flex-col">
													<span class="text-sm font-medium">{formatTime(log.createdAt)}</span>
													<span class="text-xs text-muted-foreground">{getRelativeTime(log.createdAt)}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge class={getActionColor(log.action)}>
													<svelte:component this={getActionIcon(log.action)} class="size-3 mr-1" />
													{log.action}
												</Badge>
											</TableCell>
											<TableCell>
												<div class="flex items-center gap-1.5">
													<svelte:component this={getEntityIcon(log.entity)} class="size-3.5 text-muted-foreground" />
													<span>{log.entity}</span>
													{#if log.entityId}
														<span class="text-xs text-muted-foreground/50">#{log.entityId.slice(0, 8)}</span>
													{/if}
												</div>
											</TableCell>
											<TableCell>
												<div class="flex items-center gap-1.5">
													<svelte:component this={getActorIcon(log.actorType)} class="size-3.5 text-muted-foreground" />
													<span class="font-medium">{log.actorName}</span>
												</div>
											</TableCell>
											<TableCell>
												<div class="flex flex-col gap-0.5">
													{#if log.beforeData || log.afterData}
														<div class="flex flex-wrap gap-1">
															{#if log.beforeData}
																<Badge variant="outline" class="text-[9px] text-red-500 border-red-200">
																	Before: {truncateJSON(log.beforeData, 30)}
																</Badge>
															{/if}
															{#if log.afterData}
																<Badge variant="outline" class="text-[9px] text-green-500 border-green-200">
																	After: {truncateJSON(log.afterData, 30)}
																</Badge>
															{/if}
														</div>
													{:else}
														<span class="text-xs text-muted-foreground/50">No data changes</span>
													{/if}
													{#if log.ipAddress}
														<span class="text-xs text-muted-foreground/50">
															IP: {log.ipAddress}
														</span>
													{/if}
												</div>
											</TableCell>
											<TableCell class="text-right">
												<div class="flex justify-end gap-1">
														{#if log.beforeData || log.afterData}
															<Button 
																variant="ghost" 
																class="h-7 w-7 p-0"
																onclick={() => toggleLog(log.id)}
																title="Toggle details"
															>
																<Eye class="size-3.5" />
																<span class="sr-only">Toggle</span>
															</Button>
														{/if}
												</div>
											</TableCell>
										</TableRow>

										<!-- ─── Expanded Row ────────────────────────────────────────────── -->
										{#if expandedLog === log.id}
											<TableRow class="bg-muted/20">
												<TableCell colspan="6" class="px-4 py-3">
													<div class="grid gap-4 sm:grid-cols-2">
														{#if log.beforeData}
															<div>
																<h5 class="text-xs font-medium text-red-500 uppercase tracking-wider mb-2">Before</h5>
																<pre class="text-xs bg-background p-3 rounded border overflow-x-auto max-h-[200px]">
																		{JSON.stringify(log.beforeData, null, 2)}
																	</pre>
															</div>
														{/if}
														{#if log.afterData}
															<div>
																<h5 class="text-xs font-medium text-green-500 uppercase tracking-wider mb-2">After</h5>
																<pre class="text-xs bg-background p-3 rounded border overflow-x-auto max-h-[200px]">
																		{JSON.stringify(log.afterData, null, 2)}
																	</pre>
															</div>
														{/if}
														{#if log.ipAddress || log.userAgent}
															<div class={cn(log.beforeData || log.afterData ? 'sm:col-span-2' : '')}>
																<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Metadata</h5>
																<div class="grid gap-1 text-xs text-muted-foreground">
																	{#if log.ipAddress}
																		<p>IP: <span class="font-mono">{log.ipAddress}</span></p>
																	{/if}
																	{#if log.userAgent}
																		<p>User Agent: <span class="font-mono text-[10px]">{log.userAgent}</span></p>
																	{/if}
																	<p>Timestamp: {formatDate(log.createdAt)}</p>
																</div>
															</div>
														{/if}
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

		<!-- ─── Activity Summary ───────────────────────────────────────────── -->
		{#if filteredLogs.length > 0}
			<Card class="bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredLogs.length}</strong> of <strong class="text-foreground">{pagination?.totalItems || 0}</strong> events
						</span>
						<div class="flex flex-wrap items-center gap-4">
							{#each Object.entries(stats?.byAction || {}).slice(0, 5) as [action, count]}
								<span class="flex items-center gap-1.5">
									<Badge variant="outline" class="text-[10px]">{action}</Badge>
									<span class="text-xs text-muted-foreground">{count}</span>
								</span>
							{/each}
							{#if Object.keys(stats?.byAction || {}).length > 5}
								<span class="text-xs text-muted-foreground">+{Object.keys(stats?.byAction || {}).length - 5} more</span>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</main>