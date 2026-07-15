<!-- src/routes/(admin)/admin/courses/+page.svelte -->
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
		BookOpen,
		Search,
		Plus,
		Users,
		GraduationCap,
		UsersIcon,
		Eye,
		Edit,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		Building2,
		FileText,
		CheckCircle,
		XCircle,
		Clock,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterDepartment = $state('all');
	let filterLevel = $state('all');
	let filterStatus = $state('all');

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (filterDepartment !== 'all') params.set('department', filterDepartment);
		if (filterLevel !== 'all') params.set('level', filterLevel);
		if (filterStatus !== 'all') params.set('status', filterStatus);
		window.location.href = `/admin/courses?${params.toString()}`;
	}

	function clearFilters() {
		searchQuery = '';
		filterDepartment = 'all';
		filterLevel = 'all';
		filterStatus = 'all';
		window.location.href = '/admin/courses';
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { label: string; variant: string; icon: any }> = {
			ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
			INACTIVE: { label: 'Inactive', variant: 'secondary', icon: Clock },
			DISCONTINUED: { label: 'Discontinued', variant: 'destructive', icon: XCircle },
		};
		return variants[status] || { label: status, variant: 'secondary', icon: FileText };
	}

	function getTypeBadge(type: string) {
		const variants: Record<string, { label: string; variant: string }> = {
			COMPULSORY: { label: 'Compulsory', variant: 'default' },
			ELECTIVE: { label: 'Elective', variant: 'secondary' },
			GENERAL_STUDIES: { label: 'General Studies', variant: 'outline' },
			CARRYOVER_ELIGIBLE: { label: 'Carryover Eligible', variant: 'warning' },
		};
		return variants[type] || { label: type, variant: 'secondary' };
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}
</script>

<svelte:head>
	<title>Courses — EAPS</title>
</svelte:head>

<Topbar title="Courses" description="Manage all courses in the university">
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
		<Button size="sm">
			<Plus class="mr-2 size-4" />
			Add Course
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
					<CardTitle class="text-sm font-medium">Total Courses</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all courses</p>
				</CardContent>
			</Card>

			<Card class="border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Active</CardTitle>
					<CheckCircle class="size-4 text-green-500" />
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
					<p class="text-xs text-muted-foreground">temporarily inactive</p>
				</CardContent>
			</Card>

			<Card class="border-red-200 dark:border-red-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Discontinued</CardTitle>
					<XCircle class="size-4 text-red-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-red-600 dark:text-red-400">{data?.stats?.discontinued || 0}</div>
					<p class="text-xs text-muted-foreground">no longer offered</p>
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
								placeholder="Search by code or title..."
								class="pl-9"
								onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							/>
						</div>
						<div class="flex flex-wrap gap-2">
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

							<Select type="single" bind:value={filterLevel}>
								<SelectTrigger class="w-[100px]">
									<span class="truncate">
										{filterLevel === 'all' ? 'All Levels' : `${filterLevel}L`}
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
									<SelectItem value="INACTIVE">Inactive</SelectItem>
									<SelectItem value="DISCONTINUED">Discontinued</SelectItem>
								</SelectContent>
							</Select>

							{#if searchQuery || filterDepartment !== 'all' || filterLevel !== 'all' || filterStatus !== 'all'}
								<Button variant="ghost" size="sm" onclick={clearFilters}>
									Clear
								</Button>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {data?.courses?.length || 0} of {data?.stats?.total || 0} courses
						</p>
						<Button variant="outline" size="sm" onclick={applyFilters}>
							Apply Filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Courses Table -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Code</TableHead>
								<TableHead>Title</TableHead>
								<TableHead>Level</TableHead>
								<TableHead>Department</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead class="text-center">Students</TableHead>
								<TableHead class="text-center">Offerings</TableHead>
								<TableHead>Created</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#if data?.courses?.length === 0}
								<TableRow>
									<TableCell colspan="10" class="text-center text-muted-foreground py-8">
										{#if searchQuery || filterDepartment !== 'all' || filterLevel !== 'all' || filterStatus !== 'all'}
											<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
											<p>No courses match your filters</p>
										{:else}
											<BookOpen class="mx-auto size-8 text-muted-foreground/50 mb-2" />
											<p>No courses found</p>
										{/if}
									</TableCell>
								</TableRow>
							{:else}
								{#each data.courses as course}
									<TableRow class="transition-colors hover:bg-muted/30">
										<TableCell class="font-mono font-medium">{course.code}</TableCell>
										<TableCell>{course.title}</TableCell>
										<TableCell>
											<Badge variant="outline">{course.level}</Badge>
										</TableCell>
										<TableCell>{course.department}</TableCell>
										<TableCell>
											<Badge variant={getTypeBadge(course.type).variant}>
												{getTypeBadge(course.type).label}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge variant={getStatusBadge(course.status).variant} class="gap-1">
												<svelte:component this={getStatusBadge(course.status).icon} class="size-3" />
												{getStatusBadge(course.status).label}
											</Badge>
										</TableCell>
										<TableCell class="text-center">
											<Badge variant="secondary">{course.studentCount}</Badge>
										</TableCell>
										<TableCell class="text-center">{course.offeringCount}</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDate(course.createdAt)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/courses/${course.id}`}>
													<Eye class="size-3.5" />
													<span class="sr-only">View</span>
												</Button>
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/courses/${course.id}/edit`}>
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
			</CardContent>
		</Card>
	{/if}
</main>