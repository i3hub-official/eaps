<!-- src/routes/(lecturer)/lecturer/notifications/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		Bell,
		CheckCircle,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		Clock,
		FileText,
		Users,
		Calendar,
		Building2,
		CheckCheck,
		X,
		Mail,
		Megaphone,
		Info,
		Trash2,
		Archive,
		Filter,
		Search,
		CalendarClock,
		UserCheck,
		CreditCard,
		GraduationCap,
		ShieldAlert,
		Hourglass,
		MessageSquare,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let filterType = $state('all');
	let filterRead = $state('all');
	let searchQuery = $state('');
	let selectedNotifications = $state<string[]>([]);
	let selectAll = $state(false);
	let isDeleting = $state(false);
	let isArchiving = $state(false);

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let notifications = $derived(data?.notifications || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredNotifications = $derived(
		notifications.filter(n => {
			const matchesSearch = searchQuery === '' || 
				n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				n.body.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesType = filterType === 'all' || n.type === filterType;
			const matchesRead = filterRead === 'all' || 
				(filterRead === 'read' && n.isRead) ||
				(filterRead === 'unread' && !n.isRead);
			return matchesSearch && matchesType && matchesRead;
		})
	);

	let types = $derived([...new Set(notifications.map(n => n.type))]);

	// ─── Selection ──────────────────────────────────────────────────────────
	$effect(() => {
		if (selectAll) {
			selectedNotifications = filteredNotifications.map(n => n.id);
		} else if (selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0) {
			// Do nothing
		} else if (selectAll && selectedNotifications.length !== filteredNotifications.length) {
			// Handle partial selection
		}
	});

	function toggleSelectAll() {
		if (selectedNotifications.length === filteredNotifications.length) {
			selectedNotifications = [];
			selectAll = false;
		} else {
			selectedNotifications = filteredNotifications.map(n => n.id);
			selectAll = true;
		}
	}

	function toggleSelect(id: string) {
		if (selectedNotifications.includes(id)) {
			selectedNotifications = selectedNotifications.filter(n => n !== id);
			selectAll = false;
		} else {
			selectedNotifications = [...selectedNotifications, id];
			if (selectedNotifications.length === filteredNotifications.length) {
				selectAll = true;
			}
		}
	}

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	async function markAsRead(notificationId: string) {
		try {
			const response = await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationId }),
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to mark notification as read:', err);
		}
	}

	async function markAllAsRead() {
		try {
			const response = await fetch('/api/notifications/mark-all-read', {
				method: 'POST',
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to mark all notifications as read:', err);
		}
	}

	async function markSelectedAsRead() {
		if (selectedNotifications.length === 0) return;
		try {
			const response = await fetch('/api/notifications/mark-bulk-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationIds: selectedNotifications }),
			});
			if (response.ok) {
				selectedNotifications = [];
				selectAll = false;
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to mark selected as read:', err);
		}
	}

	async function deleteSelected() {
		if (selectedNotifications.length === 0) return;
		if (!confirm(`Delete ${selectedNotifications.length} notification(s)?`)) return;
		
		isDeleting = true;
		try {
			const response = await fetch('/api/notifications/delete-bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationIds: selectedNotifications }),
			});
			if (response.ok) {
				selectedNotifications = [];
				selectAll = false;
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to delete notifications:', err);
		} finally {
			isDeleting = false;
		}
	}

	function getTypeIcon(type: string) {
		const icons: Record<string, any> = {
			REGISTRATION_REMINDER: CalendarClock,
			MISSING_COURSE_ALERT: AlertCircle,
			EXAM_SCHEDULE: Calendar,
			FACE_ENROLLMENT_REMINDER: UserCheck,
			PAYMENT_REMINDER: CreditCard,
			RESULT_RELEASED: GraduationCap,
			EXAM_STARTING: Clock,
			VIOLATION_ALERT: ShieldAlert,
			PENDING_APPROVAL: Hourglass,
			GENERAL: Bell,
		};
		return icons[type] || Bell;
	}

	function getTypeColor(type: string) {
		const colors: Record<string, string> = {
			REGISTRATION_REMINDER: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
			MISSING_COURSE_ALERT: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
			EXAM_SCHEDULE: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
			FACE_ENROLLMENT_REMINDER: 'text-green-500 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
			PAYMENT_REMINDER: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
			RESULT_RELEASED: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
			EXAM_STARTING: 'text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
			VIOLATION_ALERT: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
			PENDING_APPROVAL: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
			GENERAL: 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700',
		};
		return colors[type] || 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700';
	}

	function getTypeLabel(type: string) {
		const labels: Record<string, string> = {
			REGISTRATION_REMINDER: 'Registration',
			MISSING_COURSE_ALERT: 'Course Alert',
			EXAM_SCHEDULE: 'Exam Schedule',
			FACE_ENROLLMENT_REMINDER: 'Face Enrollment',
			PAYMENT_REMINDER: 'Payment',
			RESULT_RELEASED: 'Result',
			EXAM_STARTING: 'Exam Starting',
			VIOLATION_ALERT: 'Violation',
			PENDING_APPROVAL: 'Approval',
			GENERAL: 'General',
		};
		return labels[type] || type;
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
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	function getTimeCategory(date: Date) {
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const hours = Math.floor(diff / 3600000);
		
		if (hours < 1) return 'Recent';
		if (hours < 24) return 'Today';
		if (hours < 48) return 'Yesterday';
		if (hours < 168) return 'This Week';
		return 'Older';
	}

	function clearFilters() {
		filterType = 'all';
		filterRead = 'all';
		searchQuery = '';
	}

	function getNotificationCounts() {
		const unread = notifications.filter(n => !n.isRead).length;
		const read = notifications.filter(n => n.isRead).length;
		const total = notifications.length;
		return { unread, read, total };
	}
</script>

<svelte:head>
	<title>Notifications — EAPS</title>
</svelte:head>

<Topbar title="Notifications" description="Stay updated with your latest notifications">
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
			variant="outline" 
			size="sm" 
			onclick={markAllAsRead}
			disabled={!notifications.some(n => !n.isRead)}
		>
			<CheckCheck class="mr-2 size-4" />
			Mark All Read
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
				<div class="space-y-4">
					{#each [1, 2, 3, 4, 5] as item (item)}
						<Skeleton class="h-20 w-full" />
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
				<h3 class="text-lg font-semibold">Cannot load notifications</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading your notifications.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Statistics Cards ──────────────────────────────────────────── -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card class="transition-all hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total</CardTitle>
					<Bell class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all notifications</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Unread</CardTitle>
					<Bell class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.unread || 0}</div>
					<p class="text-xs text-muted-foreground">need attention</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Read</CardTitle>
					<CheckCircle class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.read || 0}</div>
					<p class="text-xs text-muted-foreground">already viewed</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">This Week</CardTitle>
					<Calendar class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{notifications.filter(n => {
							const weekAgo = new Date();
							weekAgo.setDate(weekAgo.getDate() - 7);
							return new Date(n.createdAt) > weekAgo;
						}).length}
					</div>
					<p class="text-xs text-muted-foreground">new notifications</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters & Search ──────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchQuery}
								placeholder="Search notifications..."
								class="pl-9"
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterType}>
								<SelectTrigger class="w-[140px]">
									<span class="truncate">
										{filterType === 'all' ? 'All Types' : getTypeLabel(filterType)}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									{#each types as type}
										<SelectItem value={type}>
											<span class="flex items-center gap-2">
												<svelte:component this={getTypeIcon(type)} class="size-3.5" />
												{getTypeLabel(type)}
											</span>
										</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterRead}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterRead === 'all' ? 'All Status' : 
										 filterRead === 'read' ? 'Read' : 'Unread'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="unread">
										<span class="flex items-center gap-2">
											<Bell class="size-3.5 text-blue-500" />
											Unread
										</span>
									</SelectItem>
									<SelectItem value="read">
										<span class="flex items-center gap-2">
											<CheckCircle class="size-3.5 text-green-500" />
											Read
										</span>
									</SelectItem>
								</SelectContent>
							</Select>

							{#if searchQuery || filterType !== 'all' || filterRead !== 'all'}
								<Button 
									variant="ghost" 
									size="sm" 
									onclick={clearFilters}
									class="text-muted-foreground"
								>
									<X class="mr-2 size-4" />
									Clear Filters
								</Button>
							{/if}
						</div>
					</div>

					<!-- ─── Bulk Actions ────────────────────────────────────────── -->
					{#if filteredNotifications.length > 0}
						<div class="flex items-center justify-between border-t border-border pt-3">
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									checked={selectAll}
									onchange={toggleSelectAll}
									class="size-4 rounded border-border accent-primary cursor-pointer"
								/>
								<span class="text-sm text-muted-foreground">
									{selectedNotifications.length} selected
								</span>
							</div>
							<div class="flex items-center gap-2">
								{#if selectedNotifications.length > 0}
									<Button
										variant="outline"
										size="sm"
										onclick={markSelectedAsRead}
										disabled={selectedNotifications.every(id => 
											notifications.find(n => n.id === id)?.isRead
										)}
									>
										<CheckCheck class="mr-2 size-4" />
										Mark Read
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onclick={deleteSelected}
										disabled={isDeleting}
									>
										{#if isDeleting}
											<LoaderCircle class="mr-2 size-4 animate-spin" />
										{:else}
											<Trash2 class="mr-2 size-4" />
										{/if}
										Delete
									</Button>
								{/if}
								<span class="text-sm text-muted-foreground">
									Showing {filteredNotifications.length} of {notifications.length}
								</span>
							</div>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- ─── Notifications List ──────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="p-0">
				{#if filteredNotifications.length === 0}
					<div class="flex flex-col items-center justify-center py-16">
						{#if searchQuery || filterType !== 'all' || filterRead !== 'all'}
							<Filter class="size-12 text-muted-foreground/50 mb-4" />
							<h3 class="text-lg font-semibold">No matching notifications</h3>
							<p class="text-sm text-muted-foreground mt-1">
								Try adjusting your filters or search terms
							</p>
							<Button variant="outline" size="sm" class="mt-4" onclick={clearFilters}>
								Clear Filters
							</Button>
						{:else}
							<Bell class="size-12 text-muted-foreground/50 mb-4" />
							<h3 class="text-lg font-semibold">All caught up!</h3>
							<p class="text-sm text-muted-foreground mt-1">
								You have no notifications at the moment
							</p>
						{/if}
					</div>
				{:else}
					<div class="divide-y divide-border max-h-[600px] overflow-y-auto">
						{#each filteredNotifications as notification, index}
							{@const timeCategory = getTimeCategory(notification.createdAt)}
							{@const prevNotification = filteredNotifications[index - 1]}
							{@const showDivider = !prevNotification || getTimeCategory(prevNotification.createdAt) !== timeCategory}
							
							{#if showDivider}
								<div class="sticky top-0 z-10 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur border-b border-border">
									{timeCategory}
								</div>
							{/if}
							
							<div class={`group flex items-start gap-4 p-4 transition-all hover:bg-muted/50 ${!notification.isRead ? 'bg-muted/20 border-l-2 border-l-blue-500' : ''}`}>
								<input
									type="checkbox"
									checked={selectedNotifications.includes(notification.id)}
									onchange={() => toggleSelect(notification.id)}
									class="mt-1.5 size-4 rounded border-border accent-primary cursor-pointer shrink-0"
								/>
								
								<div class={`rounded-full p-2 shrink-0 border ${getTypeColor(notification.type)}`}>
									<svelte:component this={getTypeIcon(notification.type)} class="size-4" />
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<p class={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
													{notification.title}
												</p>
												{#if !notification.isRead}
													<span class="size-1.5 rounded-full bg-blue-500 animate-pulse" />
												{/if}
											</div>
											<p class="text-sm text-muted-foreground mt-0.5 break-words">
												{notification.body}
											</p>
										</div>
										<div class="flex items-center gap-2 shrink-0">
											{#if !notification.isRead}
												<Button 
													variant="ghost" 
													size="sm" 
													class="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
													onclick={() => markAsRead(notification.id)}
												>
													<CheckCircle class="mr-1 size-3" />
													Mark Read
												</Button>
											{/if}
										</div>
									</div>
									
									<div class="flex flex-wrap items-center gap-2 mt-2">
										<Badge variant="outline" class="text-xs bg-background">
											<svelte:component this={getTypeIcon(notification.type)} class="size-3 mr-1" />
											{getTypeLabel(notification.type)}
										</Badge>
										<span class="text-xs text-muted-foreground">
											<Clock class="size-3 inline mr-1" />
											{getRelativeTime(notification.createdAt)}
										</span>
										{#if notification.isRead}
											<Badge variant="secondary" class="text-xs">
												<CheckCircle class="size-3 mr-1" />
												Read
											</Badge>
										{:else}
											<Badge variant="default" class="text-xs">
												<Bell class="size-3 mr-1" />
												Unread
											</Badge>
										{/if}
										{#if notification.link}
											<Button variant="link" size="sm" class="h-auto p-0 text-xs" href={notification.link}>
												View Details
												<ChevronRight class="size-3 ml-1" />
											</Button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- ─── Footer Stats ────────────────────────────────────────────────── -->
		{#if filteredNotifications.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredNotifications.length}</strong> of <strong class="text-foreground">{notifications.length}</strong> notifications
						</span>
						<div class="flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-blue-500" />
								{filteredNotifications.filter(n => !n.isRead).length} Unread
							</span>
							<span class="flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-green-500" />
								{filteredNotifications.filter(n => n.isRead).length} Read
							</span>
							{#if selectedNotifications.length > 0}
								<span class="flex items-center gap-1.5 text-muted-foreground">
									<CheckCircle class="size-4" />
									{selectedNotifications.length} Selected
								</span>
							{/if}
							{#if searchQuery || filterType !== 'all' || filterRead !== 'all'}
								<span class="flex items-center gap-1.5 text-muted-foreground">
									<Filter class="size-4" />
									{notifications.length - filteredNotifications.length} Hidden
								</span>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>