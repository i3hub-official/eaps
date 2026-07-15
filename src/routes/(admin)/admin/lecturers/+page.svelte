<!-- src/routes/(admin)/admin/lecturers/+page.svelte -->
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
		Shield,
		AlertCircle,
		CheckCircle,
		XCircle,
		Clock,
		Users,
		GraduationCap,
		UserCheck,
		UserX,
		Eye,
		Edit,
		Filter,
		Building2,
		UserPlus,
		Mail,
		User,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let isRefreshing = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterRole = $state(data?.filters?.role || 'all');
	let filterStatus = $state(data?.filters?.status || 'all');
	let filterDepartment = $state(data?.filters?.department || 'all');

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (filterRole !== 'all') params.set('role', filterRole);
		if (filterStatus !== 'all') params.set('status', filterStatus);
		if (filterDepartment !== 'all') params.set('department', filterDepartment);
		window.location.href = `/admin/lecturers?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterRole = 'all';
		filterStatus = 'all';
		filterDepartment = 'all';
		window.location.href = '/admin/lecturers';
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { label: string; variant: string; icon: any }> = {
			ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
			INACTIVE: { label: 'Inactive', variant: 'secondary', icon: Clock },
			SUSPENDED: { label: 'Suspended', variant: 'destructive', icon: XCircle },
			RETIRED: { label: 'Retired', variant: 'outline', icon: UserX },
		};
		return variants[status] || { label: status, variant: 'secondary', icon: Users };
	}

	function getRoleColor(role: string) {
		const colors: Record<string, string> = {
			LECTURER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
			HOD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			DEAN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
			DEPARTMENT_COORDINATOR: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
			DEPARTMENT_EXAM_OFFICER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			COLLEGE_COORDINATOR: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
			COLLEGE_EXAM_OFFICER: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
		};
		return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
	}

	function formatDate(date: Date | string | null) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>Lecturers — EAPS</title>
</svelte:head>

<Topbar title="Lecturers" description="Manage all teaching staff">
	{#snippet actions()}
		<Button variant="outline" size="sm" href="/admin/staff-invitations">
			<Mail class="mr-2 size-4" />
			Invite Staff
		</Button>
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
		<Button size="sm">
			<UserPlus class="mr-2 size-4" />
			Add Lecturer
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
					<CardTitle class="text-sm font-medium">Total Lecturers</CardTitle>
					<User class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all teaching staff</p>
				</CardContent>
			</Card>

			<Card class="border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Active</CardTitle>
					<UserCheck class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">{data?.stats?.active || 0}</div>
					<p class="text-xs text-muted-foreground">currently active</p>
				</CardContent>
			</Card>

			<Card class="border-yellow-200 dark:border-yellow-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Inactive</CardTitle>
					<Clock class="size-4 text-yellow-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data?.stats?.inactive || 0}</div>
					<p class="text-xs text-muted-foreground">not currently active</p>
				</CardContent>
			</Card>

			<Card class="border-red-200 dark:border-red-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Suspended</CardTitle>
					<UserX class="size-4 text-red-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-red-600 dark:text-red-400">{data?.stats?.suspended || 0}</div>
					<p class="text-xs text-muted-foreground">temporarily restricted</p>
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
								placeholder="Search by name, email, or staff number..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterRole}>
								<SelectTrigger class="w-[150px]">
									<span class="truncate">
										{filterRole === 'all' ? 'All Roles' : 
											data?.roles?.find(r => r.value === filterRole)?.label || 'All Roles'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Roles</SelectItem>
									{#each data?.roles || [] as role}
										<SelectItem value={role.value}>{role.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterStatus}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterStatus === 'all' ? 'All Status' : filterStatus}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="ACTIVE">Active</SelectItem>
									<SelectItem value="INACTIVE">Inactive</SelectItem>
									<SelectItem value="SUSPENDED">Suspended</SelectItem>
									<SelectItem value="RETIRED">Retired</SelectItem>
								</SelectContent>
							</Select>

							<Select type="single" bind:value={filterDepartment}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterDepartment === 'all' ? 'All Depts' : 
											data?.departments?.find(d => d.id === filterDepartment)?.shortName || 'All Depts'}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Departments</SelectItem>
									{#each data?.departments || [] as dept}
										<SelectItem value={dept.id}>{dept.shortName}</SelectItem>
									{/each}
								</SelectContent>
							</Select>

							{#if searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterDepartment !== 'all'}
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Clear
								</Button>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {data?.lecturers?.length || 0} of {data?.pagination?.totalItems || 0} lecturers
						</p>
						<Button variant="outline" size="sm" onclick={applyFilters}>
							Apply Filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Lecturers Table -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Staff No</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Courses</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data?.lecturers?.length === 0}
									<TableRow>
										<TableCell colspan="8" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterDepartment !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No lecturers match your filters</p>
											{:else}
												<User class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No lecturers found</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each data.lecturers as lecturer}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{lecturer.staffNumber}</TableCell>
											<TableCell>
												<div class="flex items-center gap-2">
													<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
														{lecturer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
													</div>
													<span>{lecturer.name}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge class={getRoleColor(lecturer.role)}>
													{lecturer.role.replace(/_/g, ' ')}
												</Badge>
											</TableCell>
											<TableCell>{lecturer.department}</TableCell>
											<TableCell class="text-center">
												<Badge variant="outline">{lecturer.courseCount}</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={getStatusBadge(lecturer.status).variant} class="gap-1">
													<svelte:component this={getStatusBadge(lecturer.status).icon} class="size-3" />
													{getStatusBadge(lecturer.status).label}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{formatDate(lecturer.createdAt)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/lecturers/${lecturer.id}`}>
														<Eye class="size-3.5" />
														<span class="sr-only">View</span>
													</Button>
													<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/lecturers/${lecturer.id}/edit`}>
														<Edit class="size-3.5" />
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