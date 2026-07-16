<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table/index.js';
	import { ChevronLeft, ChevronRight, Search, Edit, GraduationCap, Users, BookOpen, Mail, Phone, Layers } from '@lucide/svelte/icons';

	let { data } = $props();

	let staffSearch = $state(data?.filters?.staffSearch || '');
	let studentSearch = $state(data?.filters?.studentSearch || '');

	function applySearch(param: 'staffSearch' | 'studentSearch', pageParam: string, value: string) {
		const url = new URL(window.location.href);
		if (value) url.searchParams.set(param, value);
		else url.searchParams.delete(param);
		url.searchParams.delete(pageParam);
		window.location.href = url.toString();
	}

	function goToPage(param: string, page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set(param, String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>{data.department.name} — EAPS</title>
</svelte:head>

<Topbar title={data.department.name} description="Department details, staff, students, and courses">
	{#snippet actions()}
		<Button variant="outline" size="sm" href={`/admin/departments/${data.department.id}/edit`}>
			<Edit class="mr-2 size-4" />
			Edit Department
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<GraduationCap class="size-5" />
				{data.department.name}
			</CardTitle>
			<CardDescription>{data.department.shortName} · {data.department.code} · {data.department.college}</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-sm">
				<div>
					<p class="text-muted-foreground">Email</p>
					<p class="font-medium flex items-center gap-1"><Mail class="size-3.5" />{data.department.email || 'Not set'}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Phone</p>
					<p class="font-medium flex items-center gap-1"><Phone class="size-3.5" />{data.department.phone || 'Not set'}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Programmes</p>
					<p class="font-medium">{data.programmes.length}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Staff</p>
					<p class="font-medium">{data.staffPagination.totalItems}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Students</p>
					<p class="font-medium">{data.studentPagination.totalItems}</p>
				</div>
			</div>
		</CardContent>
	</Card>

	<Tabs defaultValue="courses" class="space-y-4">
		<TabsList>
			<TabsTrigger value="courses">Courses</TabsTrigger>
			<TabsTrigger value="staff">Staff</TabsTrigger>
			<TabsTrigger value="students">Students</TabsTrigger>
			<TabsTrigger value="programmes">Programmes</TabsTrigger>
		</TabsList>

		<!-- Courses -->
		<TabsContent value="courses">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><BookOpen class="size-4" />Courses</CardTitle>
					<CardDescription>All courses offered by this department</CardDescription>
				</CardHeader>
				<CardContent class="p-0">
					<div class="max-h-[500px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>Level</TableHead>
									<TableHead>Units</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.courses.length === 0}
									<TableRow><TableCell colspan="7" class="text-center text-muted-foreground py-8">No courses found</TableCell></TableRow>
								{:else}
									{#each data.courses as course}
										<TableRow class="hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{course.code}</TableCell>
											<TableCell>{course.title}</TableCell>
											<TableCell><Badge variant="outline">{course.level}L</Badge></TableCell>
											<TableCell>{course.creditUnits}</TableCell>
											<TableCell><Badge variant="outline">{course.type.replace(/_/g, ' ')}</Badge></TableCell>
											<TableCell><Badge variant={course.status === 'ACTIVE' ? 'default' : 'secondary'}>{course.status}</Badge></TableCell>
											<TableCell class="text-right">
												<Button variant="ghost" size="sm" href={`/admin/courses/${course.id}`}>View</Button>
											</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>

					{#if data.coursePagination.totalPages > 1}
						<div class="flex items-center justify-between border-t px-4 py-3">
							<p class="text-sm text-muted-foreground">Page {data.coursePagination.currentPage} of {data.coursePagination.totalPages}</p>
							<div class="flex gap-1">
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.coursePagination.hasPrev} onclick={() => goToPage('coursePage', data.coursePagination.currentPage - 1)}>
									<ChevronLeft class="size-4" />
								</Button>
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.coursePagination.hasNext} onclick={() => goToPage('coursePage', data.coursePagination.currentPage + 1)}>
									<ChevronRight class="size-4" />
								</Button>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Staff -->
		<TabsContent value="staff">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><Users class="size-4" />Staff</CardTitle>
					<CardDescription>All staff assigned to this department</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="relative">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={staffSearch}
							placeholder="Search by name, email, or staff number..."
							class="pl-9"
							onkeydown={(e) => e.key === 'Enter' && applySearch('staffSearch', 'staffPage', staffSearch)}
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
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.staff.length === 0}
									<TableRow><TableCell colspan="5" class="text-center text-muted-foreground py-8">No staff found</TableCell></TableRow>
								{:else}
									{#each data.staff as s}
										<TableRow class="hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{s.staffNumber}</TableCell>
											<TableCell>{s.name}</TableCell>
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

		<!-- Students -->
		<TabsContent value="students">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><Users class="size-4" />Students</CardTitle>
					<CardDescription>All students enrolled in this department</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="relative">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={studentSearch}
							placeholder="Search by name, email, or matric number..."
							class="pl-9"
							onkeydown={(e) => e.key === 'Enter' && applySearch('studentSearch', 'studentPage', studentSearch)}
						/>
					</div>
				</CardContent>
				<CardContent class="p-0">
					<div class="max-h-[500px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Matric No</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Level</TableHead>
									<TableHead>Programme</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.students.length === 0}
									<TableRow><TableCell colspan="6" class="text-center text-muted-foreground py-8">No students found</TableCell></TableRow>
								{:else}
									{#each data.students as s}
										<TableRow class="hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{s.matricNumber}</TableCell>
											<TableCell>{s.name}</TableCell>
											<TableCell><Badge variant="outline">{s.level}L</Badge></TableCell>
											<TableCell>{s.programme}</TableCell>
											<TableCell><Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
											<TableCell class="text-right">
												<Button variant="ghost" size="sm" href={`/admin/students/${s.id}`}>View</Button>
											</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>

					{#if data.studentPagination.totalPages > 1}
						<div class="flex items-center justify-between border-t px-4 py-3">
							<p class="text-sm text-muted-foreground">Page {data.studentPagination.currentPage} of {data.studentPagination.totalPages}</p>
							<div class="flex gap-1">
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.studentPagination.hasPrev} onclick={() => goToPage('studentPage', data.studentPagination.currentPage - 1)}>
									<ChevronLeft class="size-4" />
								</Button>
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.studentPagination.hasNext} onclick={() => goToPage('studentPage', data.studentPagination.currentPage + 1)}>
									<ChevronRight class="size-4" />
								</Button>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Programmes -->
		<TabsContent value="programmes">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><Layers class="size-4" />Programmes</CardTitle>
					<CardDescription>Degree programmes under this department</CardDescription>
				</CardHeader>
				<CardContent class="p-0">
					<div class="max-h-[400px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.programmes.length === 0}
									<TableRow><TableCell colspan="4" class="text-center text-muted-foreground py-8">No programmes found</TableCell></TableRow>
								{:else}
									{#each data.programmes as p}
										<TableRow class="hover:bg-muted/30">
											<TableCell>{p.name} <span class="text-xs text-muted-foreground">({p.shortName})</span></TableCell>
											<TableCell><Badge variant="outline">{p.type.replace(/_/g, ' ')}</Badge></TableCell>
											<TableCell>{p.durationYears} yrs</TableCell>
											<TableCell><Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</main>