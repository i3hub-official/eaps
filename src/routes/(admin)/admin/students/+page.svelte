<!-- src/routes/(admin)/admin/students/+page.svelte -->
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
		BookOpen,
		Calendar,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let isRefreshing = $state(false);
	let searchQuery = $state(data?.filters?.search || '');
	let filterLevel = $state(data?.filters?.level || 'all');
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
		if (filterLevel !== 'all') params.set('level', filterLevel);
		if (filterStatus !== 'all') params.set('status', filterStatus);
		if (filterDepartment !== 'all') params.set('department', filterDepartment);
		window.location.href = `/admin/students?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterLevel = 'all';
		filterStatus = 'all';
		filterDepartment = 'all';
		window.location.href = '/admin/students';
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { label: string; variant: string; icon: any }> = {
			ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
			SUSPENDED: { label: 'Suspended', variant: 'destructive', icon: XCircle },
			GRADUATED: { label: 'Graduated', variant: 'secondary', icon: GraduationCap },
			WITHDRAWN: { label: 'Withdrawn', variant: 'outline', icon: UserX },
			DEFERRED: { label: 'Deferred', variant: 'outline', icon: Clock },
			EXPELLED: { label: 'Expelled', variant: 'destructive', icon: AlertCircle },
		};
		return variants[status] || { label: status, variant: 'secondary', icon: Users };
	}

	function formatDate(date: Date | string | null) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	// ─── Pagination ──────────────────────────────────────────────────────────
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>Students — EAPS</title>
</svelte:head>

<Topbar title="Students" description="Manage all student accounts">
	{#snippet actions()}
		<Button variant="outline" size="sm" href="/admin/students/registration-control">
			Registration Control
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
			Add Student
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
					<CardTitle class="text-sm font-medium">Total Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all students</p>
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
					<CardTitle class="text-sm font-medium">Suspended</CardTitle>
					<UserX class="size-4 text-yellow-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data?.stats?.suspended || 0}</div>
					<p class="text-xs text-muted-foreground">temporarily restricted</p>
				</CardContent>
			</Card>

			<Card class="border-purple-200 dark:border-purple-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Graduated</CardTitle>
					<GraduationCap class="size-4 text-purple-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{data?.stats?.graduated || 0}</div>
					<p class="text-xs text-muted-foreground">completed studies</p>
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
								placeholder="Search by name, matric, or email..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
							<Select type="single" bind:value={filterLevel}>
								<SelectTrigger class="w-[130px]">
									<span class="truncate">
										{filterLevel === 'all' ? 'All Levels' : `${filterLevel} Level`}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Levels</SelectItem>
									{#each data?.levels || [] as level}
										<SelectItem value={level.id}>{level.name}</SelectItem>
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
									<SelectItem value="SUSPENDED">Suspended</SelectItem>
									<SelectItem value="GRADUATED">Graduated</SelectItem>
									<SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
									<SelectItem value="DEFERRED">Deferred</SelectItem>
									<SelectItem value="EXPELLED">Expelled</SelectItem>
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

							{#if searchQuery || filterLevel !== 'all' || filterStatus !== 'all' || filterDepartment !== 'all'}
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Clear
								</Button>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {data?.students?.length || 0} of {data?.pagination?.totalItems || 0} students
						</p>
						<Button variant="outline" size="sm" onclick={applyFilters}>
							Apply Filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Students Table -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<div class="max-h-[600px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Matric No</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Level</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Programme</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data?.students?.length === 0}
									<TableRow>
										<TableCell colspan="8" class="text-center text-muted-foreground py-8">
											{#if searchQuery || filterLevel !== 'all' || filterStatus !== 'all' || filterDepartment !== 'all'}
												<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No students match your filters</p>
											{:else}
												<Users class="mx-auto size-8 text-muted-foreground/50 mb-2" />
												<p>No students found</p>
											{/if}
										</TableCell>
									</TableRow>
								{:else}
									{#each data.students as student}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{student.matricNumber}</TableCell>
											<TableCell>
												<div class="flex items-center gap-2">
													<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
														{student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
													</div>
													<span>{student.name}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{student.level}</Badge>
											</TableCell>
											<TableCell>{student.department}</TableCell>
											<TableCell>{student.programme}</TableCell>
											<TableCell>
												<Badge variant={getStatusBadge(student.status).variant} class="gap-1">
													<svelte:component this={getStatusBadge(student.status).icon} class="size-3" />
													{getStatusBadge(student.status).label}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{formatDate(student.createdAt)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/students/${student.id}`}>
														<Eye class="size-3.5" />
														<span class="sr-only">View</span>
													</Button>
													<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/students/${student.id}/edit`}>
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