<!-- src/routes/(admin)/admin/colleges/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
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
		Building2,
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
		Mail,
		Phone,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let isRefreshing = $state(false);
	let searchQuery = $state('');

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	let filteredColleges = $derived(
		(data?.colleges || []).filter(c => 
			c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.code.toLowerCase().includes(searchQuery.toLowerCase())
		)
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
	<title>Colleges — EAPS</title>
</svelte:head>

<Topbar title="Colleges" description="Manage all colleges in the university">
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
			Add College
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
					<CardTitle class="text-sm font-medium">Total Colleges</CardTitle>
					<Building2 class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all colleges</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Departments</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.departments || 0}</div>
					<p class="text-xs text-muted-foreground">across all colleges</p>
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
		</div>

		<!-- Search & Filters -->
		<Card>
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search colleges..."
							class="pl-9"
						/>
					</div>
					<p class="text-sm text-muted-foreground">
						Showing {filteredColleges.length} of {data?.colleges?.length || 0} colleges
					</p>
				</div>
			</CardContent>
		</Card>

		<!-- Colleges Table -->
		<Card>
			<CardContent class="p-0">
				<div class="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Short Name</TableHead>
								<TableHead>Code</TableHead>
								<TableHead class="text-center">Departments</TableHead>
								<TableHead class="text-center">Students</TableHead>
								<TableHead class="text-center">Staff</TableHead>
								<TableHead>Created</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#if filteredColleges.length === 0}
								<TableRow>
									<TableCell colspan="8" class="text-center text-muted-foreground py-8">
										{#if searchQuery}
											<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
											<p>No colleges match your search</p>
										{:else}
											<Building2 class="mx-auto size-8 text-muted-foreground/50 mb-2" />
											<p>No colleges found</p>
										{/if}
									</TableCell>
								</TableRow>
							{:else}
								{#each filteredColleges as college}
									<TableRow class="transition-colors hover:bg-muted/30">
										<TableCell class="font-medium">{college.name}</TableCell>
										<TableCell>{college.shortName}</TableCell>
										<TableCell>
											<Badge variant="outline">{college.code}</Badge>
										</TableCell>
										<TableCell class="text-center">
											<Badge variant="secondary">{college.departmentCount}</Badge>
										</TableCell>
										<TableCell class="text-center">{college.studentCount}</TableCell>
										<TableCell class="text-center">{college.staffCount}</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDate(college.createdAt)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/colleges/${college.id}`}>
													<Eye class="size-3.5" />
													<span class="sr-only">View</span>
												</Button>
												<Button variant="ghost" size="sm" class="h-7 w-7 p-0" href={`/admin/colleges/${college.id}/edit`}>
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