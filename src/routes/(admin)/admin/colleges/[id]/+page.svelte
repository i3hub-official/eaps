<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table/index.js';
	import { ChevronLeft, ChevronRight, Search, Edit, Building2, Users, GraduationCap, Mail, Phone } from '@lucide/svelte/icons';

	let { data } = $props();

	let staffSearch = $state(data?.filters?.staffSearch || '');

	function applyStaffSearch() {
		const url = new URL(window.location.href);
		if (staffSearch) url.searchParams.set('staffSearch', staffSearch);
		else url.searchParams.delete('staffSearch');
		url.searchParams.delete('staffPage');
		window.location.href = url.toString();
	}

	function goToPage(param: string, page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set(param, String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>{data.college.name} — EAPS</title>
</svelte:head>

<Topbar title={data.college.name} description="College details, departments, and staff">
	{#snippet actions()}
		<Button variant="outline" size="sm" href={`/admin/colleges/${data.college.id}/edit`}>
			<Edit class="mr-2 size-4" />
			Edit College
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Building2 class="size-5" />
				{data.college.name}
			</CardTitle>
			<CardDescription>{data.college.shortName} · {data.college.code} · {data.college.university}</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
				<div>
					<p class="text-muted-foreground">Email</p>
					<p class="font-medium flex items-center gap-1"><Mail class="size-3.5" />{data.college.email || 'Not set'}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Phone</p>
					<p class="font-medium flex items-center gap-1"><Phone class="size-3.5" />{data.college.phone || 'Not set'}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Departments</p>
					<p class="font-medium">{data.deptPagination.totalItems}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Staff</p>
					<p class="font-medium">{data.staffPagination.totalItems}</p>
				</div>
			</div>
		</CardContent>
	</Card>

	<Tabs defaultValue="departments" class="space-y-4">
		<TabsList>
			<TabsTrigger value="departments">Departments</TabsTrigger>
			<TabsTrigger value="staff">Staff</TabsTrigger>
		</TabsList>

		<TabsContent value="departments">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><GraduationCap class="size-4" />Departments</CardTitle>
					<CardDescription>All departments under this college</CardDescription>
				</CardHeader>
				<CardContent class="p-0">
					<div class="max-h-[500px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Name</TableHead>
									<TableHead class="text-center">Staff</TableHead>
									<TableHead class="text-center">Students</TableHead>
									<TableHead class="text-center">Courses</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.departments.length === 0}
									<TableRow>
										<TableCell colspan="6" class="text-center text-muted-foreground py-8">No departments found</TableCell>
									</TableRow>
								{:else}
									{#each data.departments as dept}
										<TableRow class="hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{dept.code}</TableCell>
											<TableCell>{dept.name} <span class="text-xs text-muted-foreground">({dept.shortName})</span></TableCell>
											<TableCell class="text-center"><Badge variant="outline">{dept.staffCount}</Badge></TableCell>
											<TableCell class="text-center"><Badge variant="outline">{dept.studentCount}</Badge></TableCell>
											<TableCell class="text-center"><Badge variant="outline">{dept.courseCount}</Badge></TableCell>
											<TableCell class="text-right">
												<Button variant="ghost" size="sm" href={`/admin/departments/${dept.id}`}>View</Button>
											</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>

					{#if data.deptPagination.totalPages > 1}
						<div class="flex items-center justify-between border-t px-4 py-3">
							<p class="text-sm text-muted-foreground">Page {data.deptPagination.currentPage} of {data.deptPagination.totalPages}</p>
							<div class="flex gap-1">
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.deptPagination.hasPrev} onclick={() => goToPage('deptPage', data.deptPagination.currentPage - 1)}>
									<ChevronLeft class="size-4" />
								</Button>
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.deptPagination.hasNext} onclick={() => goToPage('deptPage', data.deptPagination.currentPage + 1)}>
									<ChevronRight class="size-4" />
								</Button>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="staff">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><Users class="size-4" />Staff</CardTitle>
					<CardDescription>All staff assigned to this college</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="relative">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={staffSearch}
							placeholder="Search by name, email, or staff number..."
							class="pl-9"
							onkeydown={(e) => e.key === 'Enter' && applyStaffSearch()}
						/>
					</div>
				</CardContent>
				<CardContent class="p-0">
					<div class="max-h-[500px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Staff No</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.staff.length === 0}
									<TableRow>
										<TableCell colspan="6" class="text-center text-muted-foreground py-8">No staff found</TableCell>
									</TableRow>
								{:else}
									{#each data.staff as s}
										<TableRow class="hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{s.staffNumber}</TableCell>
											<TableCell>{s.name}</TableCell>
											<TableCell>{s.department}</TableCell>
											<TableCell><Badge variant="outline">{s.role.replace(/_/g, ' ')}</Badge></TableCell>
											<TableCell><Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
											<TableCell class="text-right">
												<Button variant="ghost" size="sm" href={`/admin/lecturers/${s.id}`}>View</Button>
											</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>

					{#if data.staffPagination.totalPages > 1}
						<div class="flex items-center justify-between border-t px-4 py-3">
							<p class="text-sm text-muted-foreground">Page {data.staffPagination.currentPage} of {data.staffPagination.totalPages}</p>
							<div class="flex gap-1">
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.staffPagination.hasPrev} onclick={() => goToPage('staffPage', data.staffPagination.currentPage - 1)}>
									<ChevronLeft class="size-4" />
								</Button>
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.staffPagination.hasNext} onclick={() => goToPage('staffPage', data.staffPagination.currentPage + 1)}>
									<ChevronRight class="size-4" />
								</Button>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</main>