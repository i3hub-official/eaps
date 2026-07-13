<!-- src/routes/(lecturer)/lecturer/courses/[id]/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js'
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table/index.js'
	import { 
		BookOpen, 
		Users, 
		FileQuestion, 
		ClipboardList, 
		Calendar, 
		Building2,
		ChevronRight,
		Plus,
		Pencil,
		Eye
	} from '@lucide/svelte/icons'

	let { data } = $props()

	const { course, offerings, assessments, recentQuestions, recentStudents, studentCount, assessmentStats, recentActivity, currentSemester } = data

	function getStatusBadge(status: string) {
		const variants: Record<string, any> = {
			ACTIVE: { label: 'Active', variant: 'default' },
			INACTIVE: { label: 'Inactive', variant: 'secondary' },
			DISCONTINUED: { label: 'Discontinued', variant: 'destructive' }
		}
		return variants[status] || { label: status, variant: 'secondary' }
	}

	function getAssessmentStatusBadge(status: string) {
		const variants: Record<string, any> = {
			DRAFT: { label: 'Draft', variant: 'outline' },
			PUBLISHED: { label: 'Published', variant: 'default' },
			SCHEDULED: { label: 'Scheduled', variant: 'secondary' },
			ACTIVE: { label: 'Active', variant: 'default' },
			ENDED: { label: 'Ended', variant: 'secondary' },
			CANCELLED: { label: 'Cancelled', variant: 'destructive' }
		}
		return variants[status] || { label: status, variant: 'secondary' }
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		})
	}
</script>

<Topbar 
	title={course.code} 
	description={`${course.title} • ${course.level.name} Level`}
/>

<main class="flex flex-1 flex-col gap-6 p-6">
	<!-- Quick Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Students</p>
						<p class="text-2xl font-bold">{studentCount}</p>
					</div>
					<div class="rounded-lg bg-primary/10 p-2">
						<Users class="size-4 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Assessments</p>
						<p class="text-2xl font-bold">{assessmentStats.total}</p>
					</div>
					<div class="rounded-lg bg-blue-500/10 p-2">
						<ClipboardList class="size-4 text-blue-500" />
					</div>
				</div>
				<div class="mt-2 flex gap-2 text-xs text-muted-foreground">
					<span>📝 {assessmentStats.draft} Draft</span>
					<span>📤 {assessmentStats.published} Published</span>
					<span>✅ {assessmentStats.completed} Completed</span>
				</div>
			</CardContent>
		</Card>
		
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Questions</p>
						<p class="text-2xl font-bold">{recentQuestions.length}+</p>
					</div>
					<div class="rounded-lg bg-purple-500/10 p-2">
						<FileQuestion class="size-4 text-purple-500" />
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Current Semester</p>
						<p class="text-sm font-medium">{currentSemester?.name || 'None'}</p>
					</div>
					<div class="rounded-lg bg-green-500/10 p-2">
						<Calendar class="size-4 text-green-500" />
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Course Info -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2 text-base">
				<BookOpen class="size-4" />
				Course Information
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<p class="text-sm text-muted-foreground">Department</p>
					<p class="font-medium">{course.department.name}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">College</p>
					<p class="font-medium">{course.college.name}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Level</p>
					<p class="font-medium">Level {course.level.name}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Credit Units</p>
					<p class="font-medium">{course.creditUnits}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Type</p>
					<Badge variant="outline">{course.type}</Badge>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Status</p>
					<Badge variant={getStatusBadge(course.status).variant}>
						{getStatusBadge(course.status).label}
					</Badge>
				</div>
			</div>
			{#if course.description}
				<div>
					<p class="text-sm text-muted-foreground">Description</p>
					<p class="text-sm">{course.description}</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Tabs -->
	<Tabs defaultValue="assessments" class="space-y-4">
		<TabsList>
			<TabsTrigger value="assessments">Assessments</TabsTrigger>
			<TabsTrigger value="questions">Questions</TabsTrigger>
			<TabsTrigger value="students">Students</TabsTrigger>
			<TabsTrigger value="activity">Activity</TabsTrigger>
		</TabsList>

		<!-- Assessments Tab -->
		<TabsContent value="assessments" class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">All Assessments</h3>
				<Button href="/lecturer/assessments/create/test" size="sm">
					<Plus class="mr-1 size-3.5" />
					Create Test
				</Button>
			</div>
			
			{#if assessments.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-2 py-8 text-center">
						<ClipboardList class="size-8 text-muted-foreground/50" />
						<p class="text-sm text-muted-foreground">No assessments created for this course yet.</p>
						<Button href="/lecturer/assessments/create/test" variant="outline" size="sm">
							Create your first assessment
						</Button>
					</CardContent>
				</Card>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Questions</TableHead>
							<TableHead>Due Date</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each assessments as a}
							<TableRow>
								<TableCell class="font-medium">{a.title}</TableCell>
								<TableCell>{a.type}</TableCell>
								<TableCell>
									<Badge variant={getAssessmentStatusBadge(a.status).variant}>
										{getAssessmentStatusBadge(a.status).label}
									</Badge>
								</TableCell>
								<TableCell>{a.questionCount}</TableCell>
								<TableCell>
									{a.dueDate ? formatDate(a.dueDate) : 'N/A'}
								</TableCell>
								<TableCell class="text-right">
									<Button href={`/lecturer/assessments/${a.id}`} variant="ghost" size="sm">
										<Eye class="size-3.5" />
									</Button>
									{#if a.status === 'DRAFT'}
										<Button href={`/lecturer/assessments/edit/${a.id}`} variant="ghost" size="sm">
											<Pencil class="size-3.5" />
										</Button>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</TabsContent>

		<!-- Questions Tab -->
		<TabsContent value="questions" class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">Recent Questions</h3>
				<Button href="/lecturer/question-bank/create" size="sm">
					<Plus class="mr-1 size-3.5" />
					Add Question
				</Button>
			</div>
			
			{#if recentQuestions.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-2 py-8 text-center">
						<FileQuestion class="size-8 text-muted-foreground/50" />
						<p class="text-sm text-muted-foreground">No questions created for this course yet.</p>
						<Button href="/lecturer/question-bank/create" variant="outline" size="sm">
							Create your first question
						</Button>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-3">
					{#each recentQuestions as q}
						<Card>
							<CardContent class="flex items-center justify-between p-4">
								<div class="flex-1 space-y-1">
									<p class="text-sm font-medium">{q.body}</p>
									<div class="flex gap-3 text-xs text-muted-foreground">
										<span>Type: {q.type}</span>
										<span>Difficulty: {q.difficulty}</span>
										<span>Marks: {q.marks}</span>
									</div>
								</div>
								<Button href={`/lecturer/question-bank/${q.id}`} variant="ghost" size="sm">
									<Eye class="size-3.5" />
								</Button>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- Students Tab -->
		<TabsContent value="students" class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">Registered Students</h3>
				<span class="text-sm text-muted-foreground">{studentCount} total</span>
			</div>
			
			{#if recentStudents.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-2 py-8 text-center">
						<Users class="size-8 text-muted-foreground/50" />
						<p class="text-sm text-muted-foreground">No students registered for this course yet.</p>
					</CardContent>
				</Card>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Matric Number</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Level</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Registered</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each recentStudents as reg}
							<TableRow>
								<TableCell className="font-mono text-sm">{reg.student.matricNumber}</TableCell>
								<TableCell>
									{reg.student.firstName} {reg.student.lastName}
								</TableCell>
								<TableCell>Level {reg.student.currentLevel.name}</TableCell>
								<TableCell>
									<Badge variant="outline">{reg.status}</Badge>
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{formatDate(reg.createdAt)}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
				{#if studentCount > 10}
					<p class="text-center text-sm text-muted-foreground">
						Showing 10 of {studentCount} students
					</p>
				{/if}
			{/if}
		</TabsContent>

		<!-- Activity Tab -->
		<TabsContent value="activity" class="space-y-4">
			<h3 class="text-sm font-medium">Recent Activity</h3>
			
			{#if recentActivity.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-2 py-8 text-center">
						<p class="text-sm text-muted-foreground">No recent activity</p>
					</CardContent>
				</Card>
			{:else}
				<div className="space-y-3">
					{#each recentActivity as activity}
						<Card>
							<CardContent className="flex items-center justify-between p-4">
								<div className="space-y-1">
									<p className="text-sm font-medium">{activity.action}</p>
									<p className="text-xs text-muted-foreground">
										By {activity.staff ? `${activity.staff.firstName} ${activity.staff.lastName}` : 'System'}
									</p>
								</div>
								<span className="text-xs text-muted-foreground">
									{formatDate(activity.createdAt)}
								</span>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</TabsContent>
	</Tabs>
</main>