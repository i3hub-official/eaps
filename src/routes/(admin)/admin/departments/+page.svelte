<!-- src/routes/(admin)/admin/departments/+page.svelte -->
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
		Layers,
		Search,
		Plus,
		Users,
		GraduationCap,
		UsersIcon,
		BookOpen,
		Eye,
		Edit,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		Building2,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterCollege = $state('all');

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	let filteredDepartments = $derived(
		(data?.departments || []).filter(d => {
			const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				d.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				d.code.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCollege = filterCollege === 'all' || d.collegeId === filterCollege;
			return matchesSearch && matchesCollege;
		})
	);

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}
</script>

<svelte:head>
	<title>Departments — EAPS</title>
</svelte:head>

<Topbar title="Departments" description="Manage all departments in the university">
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
			Add Department
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
					<CardTitle class="text-sm font-medium">Total Departments</CardTitle>
					<Layers class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all departments</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Students</CardTitle>
					<GraduationCap class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.students || 0}</div>
					<p class="text-xs text-muted-foreground">total enrolled</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Staff</CardTitle>
					<UsersIcon class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.staff || 0}</div>
					<p class="text-xs text-muted-foreground">total staff</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Courses</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.courses || 0}</div>
					<p class="text-xs text-muted-foreground">active courses</p>
				</CardContent>
			</Card>
		</div>

		<!-- Filters -->
		<Card>
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search departments..."
							class="pl-9"
						/>
					</div>
					<div class="flex flex-wrap gap-2">
						<Select type="single" bind:value={filterCollege}>
							<SelectTrigger class="w-[150px]">
								<span class="truncate">
									{filterCollege === 'all' ? 'All Colleges' : 
										data?.colleges?.find(c => c.id === filterCollege)?.shortName || 'All Colleges'}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Colleges</SelectItem>
								{#each data?.colleges || [] as college}
									<SelectItem value={college.id}>{college.shortName}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
						<p class="text-sm text-muted-foreground self-center">
							Showing {filteredDepartments.length} of {data?.departments?.length || 0} departments
						</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Departments Table -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Short Name</TableHead>
								<TableHead>Code</TableHead>
								<TableHead>College</TableHead>
								<TableHead class="text-center">Students</TableHead>
								<TableHead class="text-center">Staff</TableHead>
								<TableHead class="text-center">Courses</TableHead>
								<TableHead>Created</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#if filteredDepartments.length === 0}
								<TableRow>
									<TableCell colspan="9" class="text-center text-muted-foreground py-8">
										{#if searchQuery || filterCollege !== 'all'}
											<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
											<p>No departments match your filters</p>
										{:else}
											<Layers class="mx-auto size-8 text-muted-foreground/50 mb-2" />
											<p>No departments found</p>
										{/if}
									</TableCell>
								</TableRow>
							{:else}
								{#each filteredDepartments as dept}
									<TableRow class="transition-colors hover:bg-muted/30">
										<TableCell class="font-medium">{dept.name}</TableCell>
										<TableCell>{dept.shortName}</TableCell>
										<TableCell>
											<Badge variant="outline">{dept.code}</Badge>
										</TableCell>
										<TableCell>{dept.college}</TableCell>
										<TableCell class="text-center">{dept.studentCount}</TableCell>
										<TableCell class="text-center">{dept.staffCount}</TableCell>
										<TableCell class="text-center">
											<Badge variant="secondary">{dept.courseCount}</Badge>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDate(dept.createdAt)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/departments/${dept.id}`}>
													<Eye class="size-3.5" />
													<span class="sr-only">View</span>
												</Button>
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/departments/${dept.id}/edit`}>
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