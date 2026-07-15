<!-- src/routes/(lecturer)/lecturer/attendance/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
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
	import { 
		Users, Search, LoaderCircle, Download, AlertCircle, CheckCircle, 
		Clock, Building2, RefreshCw, TrendingUp, TrendingDown, 
		Calendar, UserCheck, UserX, BarChart3 
	} from '@lucide/svelte/icons';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	let searchQuery = $state('');
	let selectedCourse = $state(data?.filters?.course || 'all');
	let selectedLevel = $state(data?.filters?.level || 'all');
	let selectedStatus = $state(data?.filters?.status || 'all');
	let isRefreshing = $state(false);
	let sortColumn = $state('name');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	const error = data?.error;
	const distribution = data?.stats?.attendanceDistribution || { excellent: 0, good: 0, average: 0, poor: 0 };
	const totalStudents = data?.stats?.totalStudents || 0;

	function getAttendanceColor(percent: number) {
		if (percent >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
		if (percent >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
		if (percent >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
		return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
	}

	function getAttendanceStatus(percent: number) {
		if (percent >= 80) return { label: 'Excellent', icon: CheckCircle, color: 'text-green-500' };
		if (percent >= 60) return { label: 'Good', icon: CheckCircle, color: 'text-yellow-500' };
		if (percent >= 40) return { label: 'Average', icon: Clock, color: 'text-orange-500' };
		return { label: 'Poor', icon: AlertCircle, color: 'text-red-500' };
	}

	function handleCourseChange(courseId: string) {
		selectedCourse = courseId;
		updateUrl({ course: courseId });
	}

	function handleLevelChange(levelId: string) {
		selectedLevel = levelId;
		updateUrl({ level: levelId });
	}

	function handleStatusChange(status: string) {
		selectedStatus = status;
		updateUrl({ status });
	}

	function updateUrl(params: Record<string, string>) {
		const url = new URL(window.location.href);
		Object.entries(params).forEach(([key, value]) => {
			if (value === 'all') {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, value);
			}
		});
		goto(url.toString());
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function handleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function getFilteredStudents() {
		if (!data?.studentAttendance) return [];
		let students = [...data.studentAttendance];
		
		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			students = students.filter(s => 
				s.matricNumber.toLowerCase().includes(query) ||
				s.name.toLowerCase().includes(query)
			);
		}
		
		// Apply sorting
		students.sort((a, b) => {
			let comparison = 0;
			switch (sortColumn) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'matric':
					comparison = a.matricNumber.localeCompare(b.matricNumber);
					break;
				case 'level':
					comparison = a.level.localeCompare(b.level);
					break;
				case 'course':
					comparison = a.course.localeCompare(b.course);
					break;
				case 'attendance':
					comparison = a.attendance - b.attendance;
					break;
				case 'lastActivity':
					if (a.lastActivity && b.lastActivity) {
						comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
					} else if (a.lastActivity) {
						comparison = 1;
					} else if (b.lastActivity) {
						comparison = -1;
					}
					break;
				default:
					comparison = a.name.localeCompare(b.name);
			}
			return sortDirection === 'asc' ? comparison : -comparison;
		});
		
		return students;
	}

	let filteredStudents = $derived(getFilteredStudents());

	function formatDate(date: Date | null) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString(undefined, { 
			month: 'short', 
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusIcon(percent: number) {
		return getAttendanceStatus(percent).icon;
	}

	function getStatusColor(percent: number) {
		return getAttendanceStatus(percent).color;
	}

	function getTrendIcon(percent: number) {
		return percent >= 60 ? TrendingUp : TrendingDown;
	}

	function getTrendColor(percent: number) {
		return percent >= 60 ? 'text-green-500' : 'text-red-500';
	}

	onMount(() => {
		// Update filters from URL on mount
		const params = new URLSearchParams(window.location.search);
		if (params.get('course')) selectedCourse = params.get('course')!;
		if (params.get('level')) selectedLevel = params.get('level')!;
		if (params.get('status')) selectedStatus = params.get('status')!;
	});
</script>

<svelte:head>
	<title>Attendance Tracking — EAPS</title>
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
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
					<BarChart3 class="size-4 text-muted-foreground" />
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

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Attendance Distribution</CardTitle>
					<UserCheck class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-green-500">{distribution.excellent}</span>
						<span class="text-sm text-muted-foreground">/</span>
						<span class="text-sm font-medium text-yellow-500">{distribution.good}</span>
						<span class="text-sm text-muted-foreground">/</span>
						<span class="text-sm font-medium text-orange-500">{distribution.average}</span>
						<span class="text-sm text-muted-foreground">/</span>
						<span class="text-sm font-medium text-red-500">{distribution.poor}</span>
					</div>
					<p class="text-xs text-muted-foreground">Excellent / Good / Avg / Poor</p>
				</CardContent>
			</Card>
		</div>

		<!-- Filters -->
		<Card class="mt-6">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search by name or matric number..."
							class="pl-9"
							disabled={!data?.studentAttendance?.length}
						/>
					</div>
					<div class="flex flex-wrap gap-2">
						<Select type="single">
							<SelectTrigger class="w-40" onchange={(e) => handleCourseChange(e.currentTarget.value)}>
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

						<Select type="single">
							<SelectTrigger class="w-36" onchange={(e) => handleLevelChange(e.currentTarget.value)}>
								<span class="truncate">
									{selectedLevel === 'all' 
										? 'All Levels' 
										: data?.levels?.find(l => l.id === selectedLevel)?.label || 'Select level'}
								</span>
							</SelectTrigger>
							<SelectContent>
								{#each data?.levels || [] as level}
									<SelectItem 
										value={level.id}
										selected={level.id === selectedLevel}
										onclick={() => handleLevelChange(level.id)}
									>
										{level.label}
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>

						<Select type="single">
							<SelectTrigger class="w-32" onchange={(e) => handleStatusChange(e.currentTarget.value)}>
								<span class="truncate">
									{selectedStatus === 'all' ? 'All Status' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all" selected={selectedStatus === 'all'} onclick={() => handleStatusChange('all')}>
									All Status
								</SelectItem>
								<SelectItem value="excellent" selected={selectedStatus === 'excellent'} onclick={() => handleStatusChange('excellent')}>
									Excellent (80%+)
								</SelectItem>
								<SelectItem value="good" selected={selectedStatus === 'good'} onclick={() => handleStatusChange('good')}>
									Good (60-79%)
								</SelectItem>
								<SelectItem value="average" selected={selectedStatus === 'average'} onclick={() => handleStatusChange('average')}>
									Average (40-59%)
								</SelectItem>
								<SelectItem value="poor" selected={selectedStatus === 'poor'} onclick={() => handleStatusChange('poor')}>
									Poor (&lt;40%)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Attendance Table -->
		<Card class="mt-6">
			<div class="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="cursor-pointer hover:bg-muted/50" onclick={() => handleSort('matric')}>
								<div class="flex items-center gap-1">
									Matric No
									{#if sortColumn === 'matric'}
										<span class="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</TableHead>
							<TableHead class="cursor-pointer hover:bg-muted/50" onclick={() => handleSort('name')}>
								<div class="flex items-center gap-1">
									Student Name
									{#if sortColumn === 'name'}
										<span class="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</TableHead>
							<TableHead class="cursor-pointer hover:bg-muted/50" onclick={() => handleSort('level')}>
								<div class="flex items-center gap-1">
									Level
									{#if sortColumn === 'level'}
										<span class="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</TableHead>
							<TableHead class="cursor-pointer hover:bg-muted/50" onclick={() => handleSort('course')}>
								<div class="flex items-center gap-1">
									Course
									{#if sortColumn === 'course'}
										<span class="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</TableHead>
							<TableHead class="text-center cursor-pointer hover:bg-muted/50" onclick={() => handleSort('attendance')}>
								<div class="flex items-center justify-center gap-1">
									Attendance
									{#if sortColumn === 'attendance'}
										<span class="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</TableHead>
							<TableHead class="text-center">Status</TableHead>
							<TableHead class="text-right">Assessments</TableHead>
							<TableHead class="text-center cursor-pointer hover:bg-muted/50" onclick={() => handleSort('lastActivity')}>
								<div class="flex items-center justify-center gap-1">
									<Calendar class="size-3" />
									Last Activity
									{#if sortColumn === 'lastActivity'}
										<span class="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if !data?.studentAttendance?.length}
							<TableRow>
								<TableCell colspan={8} class="text-center text-muted-foreground py-8">
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
								<TableCell colspan={8} class="text-center text-muted-foreground py-8">
									<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p>No students match your filters</p>
									<Button variant="outline" size="sm" class="mt-2" onclick={() => {
										searchQuery = '';
										handleCourseChange('all');
										handleLevelChange('all');
										handleStatusChange('all');
									}}>
										Clear All Filters
									</Button>
								</TableCell>
							</TableRow>
						{:else}
							{#each filteredStudents as student}
								<TableRow class="hover:bg-muted/30 transition-colors">
									<TableCell class="font-mono text-sm">{student.matricNumber}</TableCell>
									<TableCell class="font-medium">
										<div class="flex items-center gap-2">
											{student.name}
											{#if student.lastActivity}
												<svelte:component 
													this={getTrendIcon(student.attendance)} 
													class={`size-3 ${getTrendColor(student.attendance)}`}
												/>
											{/if}
										</div>
									</TableCell>
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
										<Badge class={`${getAttendanceColor(student.attendance)} border-0`}>
											<svelte:component 
												this={getStatusIcon(student.attendance)} 
												class={`size-3 mr-1 ${getStatusColor(student.attendance)}`}
											/>
											{getAttendanceStatus(student.attendance).label}
										</Badge>
									</TableCell>
									<TableCell class="text-right">
										<span class="text-sm font-medium">
											{student.assessmentsTaken} / {student.assessmentsEligible}
										</span>
										<p class="text-xs text-muted-foreground">completed</p>
									</TableCell>
									<TableCell class="text-center">
										<span class="text-xs text-muted-foreground">
											{formatDate(student.lastActivity)}
										</span>
									</TableCell>
								</TableRow>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</div>
		</Card>

		<!-- Summary -->
		{#if filteredStudents.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredStudents.length}</strong> of <strong class="text-foreground">{data?.studentAttendance?.length || 0}</strong> students
						</span>
						<div class="flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1">
								<CheckCircle class="size-4 text-green-500" />
								{filteredStudents.filter(s => s.attendance >= 80).length} Excellent
							</span>
							<span class="flex items-center gap-1">
								<CheckCircle class="size-4 text-yellow-500" />
								{filteredStudents.filter(s => s.attendance >= 60 && s.attendance < 80).length} Good
							</span>
							<span class="flex items-center gap-1">
								<Clock class="size-4 text-orange-500" />
								{filteredStudents.filter(s => s.attendance >= 40 && s.attendance < 60).length} Average
							</span>
							<span class="flex items-center gap-1">
								<AlertCircle class="size-4 text-red-500" />
								{filteredStudents.filter(s => s.attendance < 40).length} Poor
							</span>
							<span class="flex items-center gap-1 text-muted-foreground">
								<UserX class="size-4" />
								{totalStudents - filteredStudents.length} Hidden by filters
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>