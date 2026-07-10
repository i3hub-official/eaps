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
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
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
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let filterType = $state('all');
	let filterRead = $state('all');
	let activeTab = $state('all');

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let notifications = $derived(data?.notifications || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredNotifications = $derived(
		notifications.filter(n => {
			const matchesType = filterType === 'all' || n.type === filterType;
			const matchesRead = filterRead === 'all' || 
				(filterRead === 'read' && n.isRead) ||
				(filterRead === 'unread' && !n.isRead);
			return matchesType && matchesRead;
		})
	);

	let types = $derived([...new Set(notifications.map(n => n.type))]);

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

	function getTypeIcon(type: string) {
		const icons: Record<string, any> = {
			REGISTRATION_REMINDER: Calendar,
			MISSING_COURSE_ALERT: AlertCircle,
			EXAM_SCHEDULE: Calendar,
			FACE_ENROLLMENT_REMINDER: Users,
			PAYMENT_REMINDER: FileText,
			RESULT_RELEASED: CheckCircle,
			EXAM_STARTING: Clock,
			VIOLATION_ALERT: AlertCircle,
			PENDING_APPROVAL: Clock,
			GENERAL: Bell,
		};
		return icons[type] || Bell;
	}

	function getTypeColor(type: string) {
		const colors: Record<string, string> = {
			REGISTRATION_REMINDER: 'text-blue-500',
			MISSING_COURSE_ALERT: 'text-yellow-500',
			EXAM_SCHEDULE: 'text-purple-500',
			FACE_ENROLLMENT_REMINDER: 'text-green-500',
			PAYMENT_REMINDER: 'text-orange-500',
			RESULT_RELEASED: 'text-green-600',
			EXAM_STARTING: 'text-red-500',
			VIOLATION_ALERT: 'text-red-600',
			PENDING_APPROVAL: 'text-yellow-600',
			GENERAL: 'text-gray-500',
		};
		return colors[type] || 'text-gray-500';
	}

	function getTypeLabel(type: string) {
		const labels: Record<string, string> = {
			REGISTRATION_REMINDER: 'Registration Reminder',
			MISSING_COURSE_ALERT: 'Missing Course Alert',
			EXAM_SCHEDULE: 'Exam Schedule',
			FACE_ENROLLMENT_REMINDER: 'Face Enrollment',
			PAYMENT_REMINDER: 'Payment Reminder',
			RESULT_RELEASED: 'Result Released',
			EXAM_STARTING: 'Exam Starting',
			VIOLATION_ALERT: 'Violation Alert',
			PENDING_APPROVAL: 'Pending Approval',
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
		return format(new Date(date), 'PP');
	}
</script>

<svelte:head>
	<title>Notifications — MOUAU e-Test</title>
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
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Notifications</CardTitle>
					<Bell class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all notifications</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Unread</CardTitle>
					<Bell class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600">{stats?.unread || 0}</div>
					<p class="text-xs text-muted-foreground">need your attention</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Read</CardTitle>
					<CheckCircle class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600">{stats?.read || 0}</div>
					<p class="text-xs text-muted-foreground">already viewed</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Filters ────────────────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex gap-2">
						<Select>
							<SelectTrigger class="w-[150px]" onchange={(e) => filterType = e.currentTarget.value}>
								<span class="truncate">
									{filterType === 'all' ? 'All Types' : getTypeLabel(filterType)}
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
										{getTypeLabel(type)}
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>

						<Select>
							<SelectTrigger class="w-[130px]" onchange={(e) => filterRead = e.currentTarget.value}>
								<span class="truncate">
									{filterRead === 'all' ? 'All Status' : 
									 filterRead === 'read' ? 'Read' : 'Unread'}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem 
									value="all" 
									selected={filterRead === 'all'}
									onclick={() => filterRead = 'all'}
								>
									All Status
								</SelectItem>
								<SelectItem 
									value="unread" 
									selected={filterRead === 'unread'}
									onclick={() => filterRead = 'unread'}
								>
									Unread
								</SelectItem>
								<SelectItem 
									value="read" 
									selected={filterRead === 'read'}
									onclick={() => filterRead = 'read'}
								>
									Read
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<p class="text-sm text-muted-foreground">
						Showing {filteredNotifications.length} of {notifications.length} notifications
					</p>
				</div>
			</CardContent>
		</Card>

		<!-- ─── Notifications List ──────────────────────────────────────────── -->
		<Card class="mt-6">
			<CardContent class="p-0">
				{#if filteredNotifications.length === 0}
					<div class="flex flex-col items-center justify-center py-12">
						<Bell class="size-12 text-muted-foreground/50 mb-4" />
						<h3 class="text-lg font-semibold">No notifications</h3>
						<p class="text-sm text-muted-foreground mt-1">
							{#if filterType !== 'all' || filterRead !== 'all'}
								No notifications match your filters
							{:else}
								You're all caught up!
							{/if}
						</p>
						{#if filterType !== 'all' || filterRead !== 'all'}
							<Button variant="outline" size="sm" class="mt-4" onclick={() => {
								filterType = 'all';
								filterRead = 'all';
							}}>
								Clear Filters
							</Button>
						{/if}
					</div>
				{:else}
					<div class="divide-y divide-border">
						{#each filteredNotifications as notification}
							<div class={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${!notification.isRead ? 'bg-muted/30' : ''}`}>
								<div class={`mt-0.5 ${getTypeColor(notification.type)}`}>
									<svelte:component this={getTypeIcon(notification.type)} class="size-5" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<div>
											<p class={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
												{notification.title}
											</p>
											<p class="text-sm text-muted-foreground mt-0.5">
												{notification.body}
											</p>
										</div>
										{#if !notification.isRead}
											<Button 
												variant="ghost" 
												size="sm" 
												class="h-7 text-xs shrink-0"
												onclick={() => markAsRead(notification.id)}
											>
												<CheckCircle class="mr-1 size-3" />
												Mark Read
											</Button>
										{/if}
									</div>
									<div class="flex flex-wrap items-center gap-3 mt-2">
										<Badge variant="outline" class="text-xs">
											{getTypeLabel(notification.type)}
										</Badge>
										<span class="text-xs text-muted-foreground">
											{getRelativeTime(notification.createdAt)}
										</span>
										{#if notification.isRead}
											<Badge variant="secondary" class="text-xs">
												Read
											</Badge>
										{:else}
											<Badge variant="default" class="text-xs">
												Unread
											</Badge>
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
						<div class="flex items-center gap-4">
							<span class="flex items-center gap-1">
								<Bell class="size-4 text-blue-500" />
								{filteredNotifications.filter(n => !n.isRead).length} Unread
							</span>
							<span class="flex items-center gap-1">
								<CheckCircle class="size-4 text-green-500" />
								{filteredNotifications.filter(n => n.isRead).length} Read
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>