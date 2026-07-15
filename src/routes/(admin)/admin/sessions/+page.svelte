<!-- src/routes/(admin)/admin/sessions/+page.svelte -->
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
		Users,
		User,
		GraduationCap,
		LogOut,
		UserX,
		Activity,
		Server,
		Wifi,
		Laptop,
		Smartphone,
		Monitor,
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
	let filterStatus = $state(data?.filters?.status || 'all');
	let filterUserType = $state(data?.filters?.userType || 'all');
	let isRevoking = $state<string | null>(null);
	let isRevokingAll = $state(false);

	// ─── Data ────────────────────────────────────────────────────────────────
	let sessions = $derived(data?.sessions || []);
	let error = $derived(data?.error);
	let pagination = $derived(data?.pagination);
	let stats = $derived(data?.stats);
	let filters = $derived(data?.filters);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredSessions = $derived(
		sessions.filter(session => {
			const matchesSearch = searchQuery === '' ||
				session.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				session.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(session.matricNumber && session.matricNumber.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesStatus = filterStatus === 'all' || 
				(filterStatus === 'active' && session.isActive) ||
				(filterStatus === 'expired' && !session.isActive);
			const matchesUserType = filterUserType === 'all' || session.userType === filterUserType;
			return matchesSearch && matchesStatus && matchesUserType;
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
		if (filterStatus !== 'all') params.set('status', filterStatus);
		if (filterUserType !== 'all') params.set('userType', filterUserType);
		if (searchQuery) params.set('search', searchQuery);
		window.location.href = `/admin/sessions?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterStatus = 'all';
		filterUserType = 'all';
		window.location.href = '/admin/sessions';
	}

	async function handleRevoke(sessionId: string, sessionType: string, userName: string) {
		if (!confirm(`Revoke session for ${userName}? They will be logged out immediately.`)) return;
		
		isRevoking = sessionId;
		const fd = new FormData();
		fd.set('sessionId', sessionId);
		fd.set('sessionType', sessionType);

		try {
			const res = await fetch('?/revoke', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success(result.data?.message || 'Session revoked successfully');
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to revoke session');
			}
		} catch (err) {
			toast.error('Failed to revoke session');
		} finally {
			isRevoking = null;
		}
	}

	async function handleRevokeAllUser(userId: string, userType: string, userName: string) {
		if (!confirm(`Revoke all sessions for ${userName}? They will be logged out from all devices.`)) return;
		
		const fd = new FormData();
		fd.set('userId', userId);
		fd.set('userType', userType);

		try {
			const res = await fetch('?/revokeAllUser', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success(result.data?.message || 'All user sessions revoked successfully');
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to revoke user sessions');
			}
		} catch (err) {
			toast.error('Failed to revoke user sessions');
		}
	}

	async function handleRevokeAll() {
		if (!confirm('Revoke ALL active sessions? All users will be logged out from all devices.')) return;
		
		isRevokingAll = true;
		try {
			const res = await fetch('?/revokeAll', { method: 'POST' });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success(result.data?.message || 'All sessions revoked successfully');
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to revoke all sessions');
			}
		} catch (err) {
			toast.error('Failed to revoke all sessions');
		} finally {
			isRevokingAll = false;
		}
	}

	function getStatusBadge(isActive: boolean) {
		if (isActive) {
			return { label: 'Active', variant: 'default', icon: CheckCircle, color: 'text-green-500' };
		}
		return { label: 'Expired', variant: 'secondary', icon: Clock, color: 'text-gray-500' };
	}

	function getUserTypeIcon(userType: string) {
		if (userType === 'staff') return Users;
		if (userType === 'student') return GraduationCap;
		return User;
	}

	function getDeviceIcon(userAgent?: string) {
		if (!userAgent) return Laptop;
		const ua = userAgent.toLowerCase();
		if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
		if (ua.includes('tablet') || ua.includes('ipad')) return Monitor;
		return Laptop;
	}

	function formatTimeRemaining(ms: number) {
		if (ms <= 0) return 'Expired';
		const hours = Math.floor(ms / (1000 * 60 * 60));
		const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleString('en-NG', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getRelativeTime(date: string) {
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
	<title>User Sessions — EAPS</title>
</svelte:head>

<Topbar title="User Sessions" description="Monitor and manage active user sessions">
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
		<Button
			variant="destructive"
			size="sm"
			onclick={handleRevokeAll}
			disabled={isRevokingAll}
		>
			{#if isRevokingAll}
				<LoaderCircle class="mr-2 size-4 animate-spin" />
			{:else}
				<LogOut class="mr-2 size-4" />
			{/if}
			Revoke All
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
					<CardTitle class="text-sm font-medium">Total Sessions</CardTitle>
					<Activity class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all sessions</p>
				</CardContent>
			</Card>

			<Card class="border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Active</CardTitle>
					<CheckCircle class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.active || 0}</div>
					<p class="text-xs text-muted-foreground">currently active</p>
				</CardContent>
			</Card>

			<Card class="border-gray-200 dark:border-gray-700">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Expired</CardTitle>
					<Clock class="size-4 text-gray-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats?.expired || 0}</div>
					<p class="text-xs text-muted-foreground">expired sessions</p>
				</CardContent>
			</Card>

			<Card class="border-blue-200 dark:border-blue-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">By User Type</CardTitle>
					<Users class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{stats?.byUserType?.staff || 0} / {stats?.byUserType?.student || 0}
					</div>
					<p class="text-xs text-muted-foreground">staff / students</p>
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
								placeholder="Search by name, email, or matric..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterStatus}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterStatus === 'all' ? 'All Status' : 
										 filterStatus === 'active' ? 'Active' : 'Expired'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="expired">Expired</SelectItem>
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterUserType}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterUserType === 'all' ? 'All Users' : 
										 filterUserType === 'staff' ? 'Staff' : 'Students'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Users</SelectItem>
									<SelectItem value="staff">Staff</SelectItem>
									<SelectItem value="student">Students</SelectItem>
								</SelectContent>
							</Select>

							{#if searchQuery || filterStatus !== 'all' || filterUserType !== 'all'}
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Clear
								</Button>
							{/if}
						</div>
					</div>
					
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {filteredSessions.length} of {pagination?.totalItems || 0} sessions
						</p>
						<Button variant="outline" size="sm" onclick={applyFilters}>
							Apply Filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Sessions Table ───────────────────────────────────────────── -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Device</TableHead>
									<TableHead>IP Address</TableHead>
									<TableHead>Last Active</TableHead>
									<TableHead>Expires</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if filteredSessions.length === 0}
									<TableRow>
										<TableCell colspan="8" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterStatus !== 'all' || filterUserType !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No sessions match your filters</p>
											{:else}
												<Activity class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No sessions found</p>
												<p class="text-sm mt-1">Sessions will appear here as users log in</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each filteredSessions as session}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell>
												<div class="flex items-center gap-2">
													<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
														{session.userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
													</div>
													<div>
														<span class="font-medium">{session.userName}</span>
														<p class="text-xs text-muted-foreground">{session.userEmail}</p>
														{#if session.matricNumber}
															<p class="text-xs font-mono text-muted-foreground/70">{session.matricNumber}</p>
														{/if}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" class="gap-1">
													<svelte:component this={getUserTypeIcon(session.userType)} class="size-3" />
													{session.userType}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={getStatusBadge(session.isActive).variant} class="gap-1">
													<svelte:component this={getStatusBadge(session.isActive).icon} class={cn("size-3", getStatusBadge(session.isActive).color)} />
													{getStatusBadge(session.isActive).label}
												</Badge>
												{#if session.isActive}
													<span class="block text-xs text-muted-foreground/70 mt-0.5">
														{formatTimeRemaining(session.timeRemaining)} remaining
													</span>
												{/if}
											</TableCell>
											<TableCell>
												<div class="flex items-center gap-1.5">
													<svelte:component this={getDeviceIcon(session.userAgent)} class="size-3.5 text-muted-foreground" />
													<span class="text-xs text-muted-foreground/70 truncate max-w-[100px]">
														{session.userAgent ? session.userAgent.split(' ').slice(0, 3).join(' ') : 'Unknown'}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<span class="font-mono text-xs">{session.ipAddress || 'N/A'}</span>
											</TableCell>
											<TableCell>
												<span class="text-sm">{getRelativeTime(session.lastActiveAt)}</span>
											</TableCell>
											<TableCell>
												<span class="text-sm">{formatDate(session.expiresAt)}</span>
											</TableCell>
											<TableCell class="text-right">
												<div class="flex items-center justify-end gap-1">
													{#if session.isActive}
														<Button
															variant="ghost"
															size="sm"
															class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
															onclick={() => handleRevoke(session.id, session.userType, session.userName)}
															disabled={isRevoking === session.id}
															title="Revoke session"
														>
															{#if isRevoking === session.id}
																<LoaderCircle class="size-3.5 animate-spin" />
															{:else}
																<XCircle class="size-3.5" />
															{/if}
															<span class="sr-only">Revoke</span>
														</Button>
													{/if}
													<Button
														variant="ghost"
														size="sm"
														class="h-7 w-7 p-0"
														onclick={() => handleRevokeAllUser(session.userId, session.userType, session.userName)}
														title="Revoke all sessions for this user"
													>
														<LogOut class="size-3.5" />
														<span class="sr-only">Revoke all</span>
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

		<!-- ─── Session Summary ───────────────────────────────────────────── -->
		{#if filteredSessions.length > 0}
			<Card class="bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredSessions.length}</strong> of <strong class="text-foreground">{pagination?.totalItems || 0}</strong> sessions
						</span>
						<div class="flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-green-500" />
								{filteredSessions.filter(s => s.isActive).length} Active
							</span>
							<span class="flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-gray-400" />
								{filteredSessions.filter(s => !s.isActive).length} Expired
							</span>
							<span class="flex items-center gap-1.5">
								<Users class="size-3.5 text-blue-500" />
								{filteredSessions.filter(s => s.userType === 'staff').length} Staff
							</span>
							<span class="flex items-center gap-1.5">
								<GraduationCap class="size-3.5 text-green-500" />
								{filteredSessions.filter(s => s.userType === 'student').length} Students
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</main>