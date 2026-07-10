<!-- src/routes/(lecturer)/lecturer/attendance/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Users, Search, Filter, Download, AlertCircle, CheckCircle, Clock, Building2, RefreshCw } from '@lucide/svelte/icons';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data, form } = $props();

	let searchQuery = $state('');
	let selectedCourse = $state(data?.filters?.course || 'all');
	let isRefreshing = $state(false);

	const error = data?.error;

	function getAttendanceColor(percent: number) {
		if (percent >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
		if (percent >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
		if (percent >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
		return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
	}

	function getAttendanceStatus(percent: number) {
		if (percent >= 80) return { label: 'Excellent', icon: CheckCircle };
		if (percent >= 60) return { label: 'Good', icon: CheckCircle };
		if (percent >= 40) return { label: 'Average', icon: Clock };
		return { label: 'Poor', icon: AlertCircle };
	}

	function handleCourseChange(courseId: string) {
		selectedCourse = courseId;
		const url = new URL(window.location.href);
		if (courseId === 'all') {
			url.searchParams.delete('course');
		} else {
			url.searchParams.set('course', courseId);
		}
		goto(url.toString());
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function getFilteredStudents() {
		if (!data?.studentAttendance) return [];
		return data.studentAttendance.filter(student => {
			const matchesSearch = student.matricNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				student.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCourse = selectedCourse === 'all' || student.course === selectedCourse;
			return matchesSearch && matchesCourse;
		});
	}

	let filteredStudents = $derived(getFilteredStudents());
</script>

<svelte:head>
	<title>Attendance Tracking — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Attendance Tracking" description="Monitor student attendance and participation">
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
		<Button variant="outline" size="sm" disabled={!data?.studentAttendance?.length}>
			<Download class="mr-2 size-4" />
			Export Report
		</Button>
	{/snippet}
</Topbar>

<div class="p-6">
	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>

		<!-- Show empty state with error context -->
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Building2 class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot load attendance data</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading attendance data.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Stats Cards -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.totalStudents || 0}</div>
					<p class="text-xs text-muted-foreground">across all courses</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Average Attendance</CardTitle>
					<CheckCircle class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.averageAttendance || 0}%</div>
					<p class="text-xs text-muted-foreground">overall average</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Course Count</CardTitle>
					<Building2 class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{Math.max(0, (data?.courses?.length || 1) - 1)}</div>
					<p class="text-xs text-muted-foreground">active courses</p>
				</CardContent>
			</Card>
		</div>

		<!-- Filters -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search by name or matric number..."
							class="pl-9"
							disabled={!data?.studentAttendance?.length}
						/>
					</div>
					<div class="flex gap-2">
						<Select>
							<SelectTrigger class="w-[200px]" onchange={(e) => handleCourseChange(e.currentTarget.value)}>
								<span class="truncate">
									{selectedCourse === 'all' 
										? 'All Courses' 
										: data?.courses?.find(c => c.id === selectedCourse)?.label || 'Select course'}
								</span>
							</SelectTrigger>
							<SelectContent>
								{#each data?.courses || [] as course}
									<SelectItem 
										value={course.id}
										selected={course.id === selectedCourse}
										onclick={() => handleCourseChange(course.id)}
									>
										{course.label}
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Attendance Table -->
		<Card class="mt-6">
			<CardContent class="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Matric No</TableHead>
							<TableHead>Student Name</TableHead>
							<TableHead>Level</TableHead>
							<TableHead>Course</TableHead>
							<TableHead class="text-center">Attendance</TableHead>
							<TableHead class="text-center">Status</TableHead>
							<TableHead class="text-right">Assessments</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if !data?.studentAttendance?.length}
							<TableRow>
								<TableCell colspan="7" class="text-center text-muted-foreground py-8">
									{#if data?.courses?.length <= 1}
										<Building2 class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No courses available</p>
										<p class="text-sm mt-1">You haven't been assigned any courses yet</p>
									{:else}
										<Users class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No student data available</p>
										<p class="text-sm mt-1">Students need to take assessments to show attendance</p>
									{/if}
								</TableCell>
							</TableRow>
						{:else if filteredStudents.length === 0}
							<TableRow>
								<TableCell colspan="7" class="text-center text-muted-foreground py-8">
									<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p>No students match your filters</p>
									<Button variant="outline" size="sm" class="mt-2" onclick={() => {
										searchQuery = '';
										handleCourseChange('all');
									}}>
										Clear Filters
									</Button>
								</TableCell>
							</TableRow>
						{:else}
							{#each filteredStudents as student}
								<TableRow>
									<TableCell class="font-mono">{student.matricNumber}</TableCell>
									<TableCell class="font-medium">{student.name}</TableCell>
									<TableCell>
										<Badge variant="outline">{student.level}</Badge>
									</TableCell>
									<TableCell>
										<div>
											<span class="font-medium">{student.course}</span>
											<p class="text-xs text-muted-foreground">{student.courseTitle}</p>
										</div>
									</TableCell>
									<TableCell class="text-center">
										<div class="flex flex-col items-center gap-1">
											<span class="font-bold">{student.attendance}%</span>
											<Progress value={student.attendance} class="h-1.5 w-16" />
										</div>
									</TableCell>
									<TableCell class="text-center">
										<Badge class={getAttendanceColor(student.attendance)}>
											{getAttendanceStatus(student.attendance).label}
										</Badge>
									</TableCell>
									<TableCell class="text-right">
										<span class="text-sm">
											{student.assessmentsTaken} / {student.assessmentsEligible}
										</span>
										<p class="text-xs text-muted-foreground">completed</p>
									</TableCell>
								</TableRow>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</CardContent>
		</Card>

		<!-- Summary -->
		{#if filteredStudents.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredStudents.length}</strong> of <strong class="text-foreground">{data?.studentAttendance?.length || 0}</strong> students
						</span>
						<div class="flex items-center gap-4">
							<span class="flex items-center gap-1">
								<CheckCircle class="size-4 text-green-500" />
								{filteredStudents.filter(s => s.attendance >= 80).length} Excellent
							</span>
							<span class="flex items-center gap-1">
								<Clock class="size-4 text-yellow-500" />
								{filteredStudents.filter(s => s.attendance >= 40 && s.attendance < 80).length} Average
							</span>
							<span class="flex items-center gap-1">
								<AlertCircle class="size-4 text-red-500" />
								{filteredStudents.filter(s => s.attendance < 40).length} Poor
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>