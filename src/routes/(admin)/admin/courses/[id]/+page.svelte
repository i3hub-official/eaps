<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table/index.js';
	import { ChevronLeft, ChevronRight, Edit, BookOpen, ClipboardList, FileText, Users } from '@lucide/svelte/icons';

	let { data } = $props();

	function goToPage(param: string, page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set(param, String(page));
		window.location.href = url.toString();
	}

	function statusVariant(status: string) {
		const map: Record<string, string> = {
			APPROVED: 'default',
			PENDING: 'secondary',
			REJECTED: 'destructive',
			CANCELLED: 'outline',
		};
		return map[status] || 'secondary';
	}
</script>

<svelte:head>
	<title>{data.course.code} — EAPS</title>
</svelte:head>

<Topbar title={`${data.course.code} — ${data.course.title}`} description="Course details, offerings, and registrations">
	{#snippet actions()}
		<Button variant="outline" size="sm" href={`/admin/courses/${data.course.id}/edit`}>
			<Edit class="mr-2 size-4" />
			Edit Course
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><BookOpen class="size-5" />{data.course.code} — {data.course.title}</CardTitle>
			<CardDescription>{data.course.department} · {data.course.level}L</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-sm">
				<div>
					<p class="text-muted-foreground">Credit Units</p>
					<p class="font-medium">{data.course.creditUnits}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Type</p>
					<Badge variant="outline">{data.course.type.replace(/_/g, ' ')}</Badge>
				</div>
				<div>
					<p class="text-muted-foreground">Status</p>
					<Badge variant={data.course.status === 'ACTIVE' ? 'default' : 'secondary'}>{data.course.status}</Badge>
				</div>
				<div>
					<p class="text-muted-foreground">Assessments</p>
					<p class="font-medium">{data.assessmentCount}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Registrations</p>
					<p class="font-medium">{data.regStats.total}</p>
				</div>
			</div>
			{#if data.course.description}
				<p class="mt-4 text-sm text-muted-foreground">{data.course.description}</p>
			{/if}
		</CardContent>
	</Card>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card class="border-green-200 dark:border-green-800">
			<CardHeader class="pb-2"><CardTitle class="text-sm font-medium">Approved</CardTitle></CardHeader>
			<CardContent><div class="text-2xl font-bold text-green-600 dark:text-green-400">{data.regStats.approved}</div></CardContent>
		</Card>
		<Card class="border-yellow-200 dark:border-yellow-800">
			<CardHeader class="pb-2"><CardTitle class="text-sm font-medium">Pending</CardTitle></CardHeader>
			<CardContent><div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.regStats.pending}</div></CardContent>
		</Card>
		<Card class="border-red-200 dark:border-red-800">
			<CardHeader class="pb-2"><CardTitle class="text-sm font-medium">Rejected</CardTitle></CardHeader>
			<CardContent><div class="text-2xl font-bold text-red-600 dark:text-red-400">{data.regStats.rejected}</div></CardContent>
		</Card>
	</div>

	<Tabs defaultValue="offerings" class="space-y-4">
		<TabsList>
			<TabsTrigger value="offerings">Offerings</TabsTrigger>
			<TabsTrigger value="registrations">Registrations</TabsTrigger>
		</TabsList>

		<TabsContent value="offerings">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><ClipboardList class="size-4" />Course Offerings</CardTitle>
					<CardDescription>Semesters this course has been offered in, and assigned lecturers</CardDescription>
				</CardHeader>
				<CardContent class="p-0">
					<div class="max-h-[400px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Session</TableHead>
									<TableHead>Semester</TableHead>
									<TableHead>Lecturer</TableHead>
									<TableHead>Staff No</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.offerings.length === 0}
									<TableRow><TableCell colspan="4" class="text-center text-muted-foreground py-8">No offerings found</TableCell></TableRow>
								{:else}
									{#each data.offerings as o}
										<TableRow class="hover:bg-muted/30">
											<TableCell>{o.session}</TableCell>
											<TableCell><Badge variant="outline">{o.semesterType}</Badge></TableCell>
											<TableCell>{o.lecturer}</TableCell>
											<TableCell class="font-mono text-sm">{o.lecturerStaffNumber || '—'}</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="registrations">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"><Users class="size-4" />Registrations</CardTitle>
					<CardDescription>Student registrations for this course</CardDescription>
				</CardHeader>
				<CardContent class="p-0">
					<div class="max-h-[500px] overflow-y-auto">
						<Table>
							<TableHeader class="sticky top-0 z-10 bg-background">
								<TableRow>
									<TableHead>Level</TableHead>
									<TableHead>Semester</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.registrations.length === 0}
									<TableRow><TableCell colspan="5" class="text-center text-muted-foreground py-8">No registrations found</TableCell></TableRow>
								{:else}
									{#each data.registrations as r}
										<TableRow class="hover:bg-muted/30">
											<TableCell><Badge variant="outline">{r.level}L</Badge></TableCell>
											<TableCell>{r.semesterType}</TableCell>
											<TableCell><Badge variant="outline">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
											<TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
											<TableCell class="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>

					{#if data.regPagination.totalPages > 1}
						<div class="flex items-center justify-between border-t px-4 py-3">
							<p class="text-sm text-muted-foreground">Page {data.regPagination.currentPage} of {data.regPagination.totalPages} · {data.regPagination.totalItems} total</p>
							<div class="flex gap-1">
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.regPagination.hasPrev} onclick={() => goToPage('regPage', data.regPagination.currentPage - 1)}>
									<ChevronLeft class="size-4" />
								</Button>
								<Button variant="outline" size="sm" class="h-7 w-7 p-0" disabled={!data.regPagination.hasNext} onclick={() => goToPage('regPage', data.regPagination.currentPage + 1)}>
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