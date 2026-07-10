<!-- src/routes/(lecturer)/lecturer/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatCard from '$lib/components/dashboard/stat-card.svelte';
	import {
		Table,
		TableBody,
		TableCaption,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Users from '@lucide/svelte/icons/users';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';

	let { data } = $props();

	const stats = [
		{ title: 'My Courses', value: data.stats.totalCourses, icon: BookOpen, trend: '+2 this semester' },
		{ title: 'Total Students', value: data.stats.totalStudents, icon: Users, trend: '+12 this month' },
		{ title: 'Pending Assessments', value: data.stats.pendingAssessments, icon: FileCheck, trend: '3 need grading' },
		{ title: 'Upcoming Exams', value: data.stats.upcomingExams, icon: Calendar, trend: 'Next: Tomorrow' },
	];

	const recentActivity = [
		{ type: 'Assessment', title: 'CSC301 Quiz 2 graded', time: '2 hours ago', status: 'completed' },
		{ type: 'Student', title: 'John Doe submitted assignment', time: '4 hours ago', status: 'pending' },
		{ type: 'Course', title: 'CSC401 Lecture notes updated', time: '1 day ago', status: 'completed' },
		{ type: 'Assessment', title: 'CSC301 Exam scheduled', time: '2 days ago', status: 'pending' },
	];

	const courses = data.courses.slice(0, 4);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Welcome back, {data.user.firstName}</h1>
			<p class="text-muted-foreground">Here's what's happening with your courses today.</p>
		</div>
		<Button href="/lecturer/courses">
			View All Courses
			<ChevronRight class="ml-2 size-4" />
		</Button>
	</div>

	<!-- Stats Grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<StatCard
				title={stat.title}
				value={stat.value}
				icon={stat.icon}
				trend={stat.trend}
			/>
		{/each}
	</div>

	<!-- Tabs for different views -->
	<Tabs defaultValue="overview" class="space-y-4">
		<TabsList>
			<TabsTrigger value="overview">Overview</TabsTrigger>
			<TabsTrigger value="courses">My Courses</TabsTrigger>
			<TabsTrigger value="assessments">Assessments</TabsTrigger>
		</TabsList>

		<TabsContent value="overview" class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<ClipboardList class="size-5" />
							Recent Activity
						</CardTitle>
						<CardDescription>Latest updates from your courses</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							{#each recentActivity as activity}
								<div class="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
									<div>
										<p class="text-sm font-medium">{activity.title}</p>
										<div class="flex items-center gap-2 text-xs text-muted-foreground">
											<span>{activity.type}</span>
											<span>•</span>
											<span>{activity.time}</span>
										</div>
									</div>
									<Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
										{activity.status}
									</Badge>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<GraduationCap class="size-5" />
							Course Progress
						</CardTitle>
						<CardDescription>Student progress across your courses</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							{#each data.courseProgress as course}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span>{course.name}</span>
										<span class="font-medium">{course.progress}%</span>
									</div>
									<Progress value={course.progress} class="h-2" />
									<p class="mt-1 text-xs text-muted-foreground">
										{course.enrolled} students enrolled
									</p>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			</div>
		</TabsContent>

		<TabsContent value="courses" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>My Courses</CardTitle>
					<CardDescription>All courses you're currently teaching</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Course Code</TableHead>
								<TableHead>Title</TableHead>
								<TableHead>Students</TableHead>
								<TableHead>Status</TableHead>
								<TableHead class="text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.courses as course}
								<TableRow>
									<TableCell class="font-medium">{course.code}</TableCell>
									<TableCell>{course.title}</TableCell>
									<TableCell>{course.studentCount}</TableCell>
									<TableCell>
										<Badge variant={course.status === 'Active' ? 'default' : 'secondary'}>
											{course.status}
										</Badge>
									</TableCell>
									<TableCell class="text-right">
										<Button variant="ghost" size="sm" href={`/lecturer/courses/${course.id}`}>
											View
										</Button>
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="assessments" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Assessments</CardTitle>
					<CardDescription>Create and manage assessments for your courses</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex gap-2">
						<Button href="/lecturer/assessments/create/exam">Create Exam</Button>
						<Button href="/lecturer/assessments/create/test" variant="outline">Create Test</Button>
						<Button href="/lecturer/assessments/create/assignment" variant="outline">Create Assignment</Button>
						<Button href="/lecturer/assessments/create/practice" variant="outline">Create Practice</Button>
					</div>
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</div>