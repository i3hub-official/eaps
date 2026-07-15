<!-- src/routes/(admin)/admin/suspicious/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
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
		RefreshCw,
		LoaderCircle,
		AlertCircle,
		CheckCircle,
		XCircle,
		Clock,
		Shield,
		User,
		GraduationCap,
		Eye,
		Filter,
		Flag,
		AlertTriangle,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterSeverity = $state(data?.filters?.severity || 'all');
	let filterType = $state(data?.filters?.type || 'all');
	let filterStatus = $state(data?.filters?.status || 'all');
	let isResolving = $state<string | null>(null);

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterSeverity !== 'all') params.set('severity', filterSeverity);
		if (filterType !== 'all') params.set('type', filterType);
		if (filterStatus !== 'all') params.set('status', filterStatus);
		window.location.href = `/admin/suspicious?${params.toString()}`;
	}

	function clearFilters() {
		filterSeverity = 'all';
		filterType = 'all';
		filterStatus = 'all';
		window.location.href = '/admin/suspicious';
	}

	async function handleResolve(violationId: string) {
		if (!confirm('Mark this violation as resolved?')) return;
		isResolving = violationId;

		const fd = new FormData();
		fd.set('violationId', violationId);

		try {
			const res = await fetch('?/resolve', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				toast.success(result.message || 'Violation resolved');
				await invalidateAll();
			} else {
				toast.error(result.error || 'Failed to resolve violation');
			}
		} catch (err) {
			toast.error('Failed to resolve violation');
		} finally {
			isResolving = null;
		}
	}

	function getSeverityLabel(severity: number) {
		const labels: Record<number, { label: string; color: string; variant: string }> = {
			1: { label: 'Low', color: 'text-blue-500', variant: 'secondary' },
			2: { label: 'Medium', color: 'text-yellow-500', variant: 'secondary' },
			3: { label: 'High', color: 'text-orange-500', variant: 'destructive' },
			4: { label: 'Critical', color: 'text-red-600', variant: 'destructive' },
			5: { label: 'Emergency', color: 'text-red-700', variant: 'destructive' },
		};
		return labels[severity] || { label: 'Unknown', color: 'text-gray-500', variant: 'secondary' };
	}

	function getTypeLabel(type: string) {
		const labels: Record<string, string> = {
			FULLSCREEN_EXIT: 'Fullscreen Exit',
			TAB_SWITCH: 'Tab Switch',
			COPY_ATTEMPT: 'Copy Attempt',
			PASTE_ATTEMPT: 'Paste Attempt',
			DEVTOOLS_OPEN: 'DevTools Open',
			FACE_NOT_DETECTED: 'Face Not Detected',
			FACE_MISMATCH: 'Face Mismatch',
			MULTIPLE_FACES: 'Multiple Faces',
			IDLE_TIMEOUT: 'Idle Timeout',
			NETWORK_DROP: 'Network Drop',
			SCREEN_CAPTURE: 'Screen Capture',
			FOCUS_LOSS: 'Focus Loss',
			KEYBOARD_SHORTCUT: 'Keyboard Shortcut',
			CLOCK_TAMPER: 'Clock Tamper',
		};
		return labels[type] || type;
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getRelativeTime(date: Date | string) {
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

	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>Suspicious Activity — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Suspicious Activity" description="Monitor and investigate suspicious behavior">
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
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{:else}
		<!-- Stats Cards -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Incidents</CardTitle>
					<AlertCircle class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all violations</p>
				</CardContent>
			</Card>

			<Card class="border-red-200 dark:border-red-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Critical</CardTitle>
					<AlertTriangle class="size-4 text-red-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-red-600 dark:text-red-400">{data?.stats?.critical || 0}</div>
					<p class="text-xs text-muted-foreground">requires immediate attention</p>
				</CardContent>
			</Card>

			<Card class="border-orange-200 dark:border-orange-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">High</CardTitle>
					<Flag class="size-4 text-orange-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{data?.stats?.high || 0}</div>
					<p class="text-xs text-muted-foreground">high priority</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Medium / Low</CardTitle>
					<Shield class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{ (data?.stats?.medium || 0) + (data?.stats?.low || 0) }</div>
					<p class="text-xs text-muted-foreground">needs review</p>
				</CardContent>
			</Card>
		</div>

		<!-- Filters -->
		<Card>
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchQuery}
								placeholder="Search by student or assessment..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterSeverity}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterSeverity === 'all' ? 'All Severity' : 
											getSeverityLabel(parseInt(filterSeverity)).label}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Severity</SelectItem>
									<SelectItem value="4">Critical</SelectItem>
									<SelectItem value="3">High</SelectItem>
									<SelectItem value="2">Medium</SelectItem>
									<SelectItem value="1">Low</SelectItem>
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterType}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterType === 'all' ? 'All Types' : getTypeLabel(filterType)}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									{#each data?.violationTypes || [] as type}
										<SelectItem value={type}>{getTypeLabel(type)}</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterStatus}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterStatus === 'all' ? 'All Status' : 
										 filterStatus === 'resolved' ? 'Resolved' : 'Pending'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="resolved">Resolved</SelectItem>
								</SelectContent>
							</Select>

							{#if searchQuery || filterSeverity !== 'all' || filterType !== 'all' || filterStatus !== 'all'}
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Clear
								</Button>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {data?.activities?.length || 0} of {data?.pagination?.totalItems || 0} incidents
						</p>
						<Button variant="outline" size="sm" onclick={applyFilters}>
							Apply Filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Activities Table -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto max-h-[600px] overflow-y-auto">
					<Table>
						<TableHeader class="sticky top-0 z-10 bg-background">
							<TableRow>
								<TableHead>Time</TableHead>
								<TableHead>Student</TableHead>
								<TableHead>Assessment</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Severity</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#if data?.activities?.length === 0}
								<TableRow>
									<TableCell colspan="6" class="text-center text-muted-foreground py-8">
										<Shield class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No suspicious activity found</p>
										<p class="text-sm mt-1">All clear!</p>
									</TableCell>
								</TableRow>
							{:else}
								{#each data.activities as activity}
									{@const severity = getSeverityLabel(activity.severity)}
									<TableRow class="transition-colors hover:bg-muted/30">
										<TableCell className="whitespace-nowrap">
											<div class="flex flex-col">
												<span class="text-sm">{formatDate(activity.createdAt)}</span>
												<span class="text-xs text-muted-foreground">{getRelativeTime(activity.createdAt)}</span>
											</div>
										</TableCell>
										<TableCell>
											<div class="flex items-center gap-2">
												<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
													{activity.studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
												</div>
												<div>
													<span class="font-medium">{activity.studentName}</span>
													<p class="text-xs text-muted-foreground font-mono">{activity.matricNumber}</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div>
												<span class="text-sm">{activity.assessmentTitle}</span>
												<p class="text-xs text-muted-foreground">{activity.courseCode}</p>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline">{getTypeLabel(activity.type)}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant={severity.variant} class="gap-1">
												<span class={severity.color}>●</span>
												{severity.label}
											</Badge>
										</TableCell>
										<TableCell class="text-right">
											<div class="flex justify-end gap-1">
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" title="View details">
													<Eye class="size-3.5" />
													<span class="sr-only">View</span>
												</Button>
												<Button 
													variant="ghost" 
													size="sm" 
													class="h-7 w-7 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
													onclick={() => handleResolve(activity.id)}
													disabled={isResolving === activity.id}
													title="Mark as resolved"
												>
													{#if isResolving === activity.id}
														<LoaderCircle class="size-3.5 animate-spin" />
													{:else}
														<CheckCircle class="size-3.5" />
													{/if}
													<span class="sr-only">Resolve</span>
												</Button>
											</div>
										</TableCell>
									</TableRow>
								{/each}
							{/if}
						</TableBody>
					</Table>
				</div>

				<!-- Pagination -->
				{#if data?.pagination && data.pagination.totalPages > 1}
					<div class="flex items-center justify-between border-t border-border px-4 py-3">
						<div class="text-sm text-muted-foreground">
							Page {data.pagination.currentPage} of {data.pagination.totalPages}
							<span class="mx-2">•</span>
							{data.pagination.totalItems} total
						</div>
						<div class="flex gap-1">
							<Button
								variant="outline"
								size="sm"
								class="h-7 w-7 p-0"
								disabled={!data.pagination.hasPrev}
								onclick={() => goToPage(data.pagination.currentPage - 1)}
							>
								<ChevronLeft class="size-4" />
							</Button>
							{#each Array(Math.min(5, data.pagination.totalPages)).fill(0).map((_, i) => i + 1) as p}
								<Button
									variant={p === data.pagination.currentPage ? 'default' : 'outline'}
									size="sm"
									class="h-7 w-7 p-0 text-xs"
									onclick={() => goToPage(p)}
								>
									{p}
								</Button>
							{/each}
							{#if data.pagination.totalPages > 5}
								<span class="flex items-center px-1 text-sm text-muted-foreground">…</span>
								<Button
									variant="outline"
									size="sm"
									class="h-7 w-7 p-0 text-xs"
									onclick={() => goToPage(data.pagination.totalPages)}
								>
									{data.pagination.totalPages}
								</Button>
							{/if}
							<Button
								variant="outline"
								size="sm"
								class="h-7 w-7 p-0"
								disabled={!data.pagination.hasNext}
								onclick={() => goToPage(data.pagination.currentPage + 1)}
							>
								<ChevronRight class="size-4" />
							</Button>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</main>