<!-- src/routes/(lecturer)/lecturer/courses/[id]/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard'
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js'
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table/index.js'
	import { Progress } from '$lib/components/ui/progress/index.js'
	import { Skeleton } from '$lib/components/ui/skeleton/index.js'
	import * as Popover from '$lib/components/ui/popover/index.js'
	import * as Command from '$lib/components/ui/command/index.js'
	import { 
		BookOpen, 
		Users, 
		FileQuestion, 
		ClipboardList, 
		Calendar, 
		Building2,
		Plus,
		Pencil,
		Eye,
		User,
		FileText,
		GraduationCap,
		Clock,
		CheckCircle,
		XCircle,
		AlertCircle,
		TrendingUp,
		TrendingDown,
		ChevronRight,
		ChevronDown,
		ChevronUp,
		Search,
		Filter,
		Download,
		RefreshCw,
		LoaderCircle,
		Zap,
		Brain,
		BarChart3,
	} from '@lucide/svelte/icons'
	import { invalidateAll } from '$app/navigation'
	import { format } from '$lib/utils/date'
	import { cn } from '$lib/utils.js'

	let { data } = $props()

	const { course, assessments, recentQuestions, recentStudents, studentCount, assessmentStats, recentActivity, currentSemester } = data

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false)
	let searchQuery = $state('')
	let filterStatus = $state('all')
	let expandedStudent = $state<string | null>(null)

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredStudents = $derived(
		recentStudents.filter(reg => {
			const matchesSearch = searchQuery === '' ||
				reg.student.matricNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				`${reg.student.firstName} ${reg.student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
			const matchesStatus = filterStatus === 'all' || reg.status === filterStatus
			return matchesSearch && matchesStatus
		})
	)

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return
		isRefreshing = true
		await invalidateAll()
		isRefreshing = false
	}

	function toggleStudent(studentId: string) {
		expandedStudent = expandedStudent === studentId ? null : studentId
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, any> = {
			ACTIVE: { label: 'Active', variant: 'default', color: 'bg-green-500' },
			INACTIVE: { label: 'Inactive', variant: 'secondary', color: 'bg-gray-500' },
			DISCONTINUED: { label: 'Discontinued', variant: 'destructive', color: 'bg-red-500' }
		}
		return variants[status] || { label: status, variant: 'secondary', color: 'bg-gray-500' }
	}

	function getAssessmentStatusBadge(status: string) {
		const variants: Record<string, any> = {
			DRAFT: { label: 'Draft', variant: 'outline', color: 'text-gray-500', icon: FileText },
			PUBLISHED: { label: 'Published', variant: 'default', color: 'text-blue-500', icon: CheckCircle },
			SCHEDULED: { label: 'Scheduled', variant: 'secondary', color: 'text-yellow-500', icon: Clock },
			ACTIVE: { label: 'Active', variant: 'default', color: 'text-green-500', icon: Zap },
			ENDED: { label: 'Ended', variant: 'secondary', color: 'text-purple-500', icon: CheckCircle },
			CANCELLED: { label: 'Cancelled', variant: 'destructive', color: 'text-red-500', icon: XCircle }
		}
		return variants[status] || { label: status, variant: 'secondary', color: 'text-gray-500', icon: AlertCircle }
	}

	function getQuestionTypeLabel(type: string) {
		const labels: Record<string, string> = {
			SINGLE_CHOICE: 'Single Choice',
			MULTIPLE_CHOICE: 'Multiple Choice',
			TRUE_FALSE: 'True/False',
			FILL_BLANK: 'Fill Blank',
			MATCHING: 'Matching',
			ESSAY: 'Essay',
			ORDERING: 'Ordering',
		}
		return labels[type] || type
	}

	function getDifficultyColor(difficulty: string) {
		const colors: Record<string, string> = {
			EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
			MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
			HARD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			EXPERT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		}
		return colors[difficulty] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		})
	}

	function formatDateTime(date: Date | string) {
		return new Date(date).toLocaleString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}
</script>

<Topbar 
	title={course.code} 
	description={`${course.title} • ${course.level.name} Level`}
	backHref="/lecturer/courses"
>
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
		<Button href={`/lecturer/courses/${course.id}/edit`} size="sm" variant="outline">
			<Pencil class="mr-2 size-4" />
			Edit Course
		</Button>
		<Button href="/lecturer/courses" size="sm" variant="outline">
			<BookOpen class="mr-2 size-4" />
			All Courses
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<!-- Quick Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="transition-all hover:shadow-md">
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Students</p>
						<p class="text-2xl font-bold">{studentCount}</p>
					</div>
					<div class="rounded-lg bg-primary/10 p-2.5">
						<Users class="size-4.5 text-primary" />
					</div>
				</div>
				<div class="mt-2 flex items-center gap-2">
					<Progress value={Math.min((studentCount / 100) * 100, 100)} class="h-1.5 flex-1" />
					<span class="text-xs text-muted-foreground">{Math.min(Math.round((studentCount / 100) * 100), 100)}%</span>
				</div>
			</CardContent>
		</Card>
		
		<Card class="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Assessments</p>
						<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{assessmentStats.total}</p>
					</div>
					<div class="rounded-lg bg-blue-500/10 p-2.5">
						<ClipboardList class="size-4.5 text-blue-500" />
					</div>
				</div>
				<div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
					<Badge variant="outline" class="text-[10px]">
						<FileText class="size-3 mr-1" />{assessmentStats.draft} Draft
					</Badge>
					<Badge variant="outline" class="text-[10px]">
						<CheckCircle class="size-3 mr-1 text-green-500" />{assessmentStats.published} Published
					</Badge>
					<Badge variant="outline" class="text-[10px]">
						<Clock class="size-3 mr-1 text-purple-500" />{assessmentStats.completed} Completed
					</Badge>
				</div>
			</CardContent>
		</Card>
		
		<Card class="transition-all hover:shadow-md border-purple-200 dark:border-purple-800">
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Questions</p>
						<p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{recentQuestions.length}+</p>
					</div>
					<div class="rounded-lg bg-purple-500/10 p-2.5">
						<Brain class="size-4.5 text-purple-500" />
					</div>
				</div>
				<p class="mt-2 text-xs text-muted-foreground">
					<FileQuestion class="size-3 inline mr-1" />
					{recentQuestions.filter(q => q.isActive).length} active questions
				</p>
			</CardContent>
		</Card>
		
		<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Semester</p>
						<p class="text-sm font-medium text-green-600 dark:text-green-400">
							{currentSemester?.name || 'None'}
						</p>
					</div>
					<div class="rounded-lg bg-green-500/10 p-2.5">
						<Calendar class="size-4.5 text-green-500" />
					</div>
				</div>
				<p class="mt-2 text-xs text-muted-foreground">
					{currentSemester?.isActive ? '✅ Currently active' : '❌ Not active'}
				</p>
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
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
					<Badge variant="outline" class="mt-0.5">{course.type}</Badge>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Status</p>
					<Badge variant={getStatusBadge(course.status).variant} class="mt-0.5">
						{getStatusBadge(course.status).label}
					</Badge>
				</div>
			</div>
			{#if course.description}
				<div>
					<p class="text-sm text-muted-foreground">Description</p>
					<p class="text-sm leading-relaxed">{course.description}</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Tabs -->
	<Tabs defaultValue="assessments" class="space-y-4">
		<TabsList>
			<TabsTrigger value="assessments" class="gap-2">
				<ClipboardList class="size-3.5" />
				Assessments
			</TabsTrigger>
			<TabsTrigger value="questions" class="gap-2">
				<FileQuestion class="size-3.5" />
				Questions
			</TabsTrigger>
			<TabsTrigger value="students" class="gap-2">
				<Users class="size-3.5" />
				Students
			</TabsTrigger>
			<TabsTrigger value="activity" class="gap-2">
				<Clock class="size-3.5" />
				Activity
			</TabsTrigger>
			<TabsTrigger value="analytics" class="gap-2">
				<BarChart3 class="size-3.5" />
				Analytics
			</TabsTrigger>
		</TabsList>

		<!-- ─── Assessments Tab ────────────────────────────────────────────── -->
		<TabsContent value="assessments" class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="text-sm font-medium">All Assessments</h3>
				<div class="flex flex-wrap gap-2">
					<Button href={`/lecturer/assessments/create/practice?course=${course.id}`} size="sm" variant="outline">
						<Plus class="mr-1 size-3.5" />
						Practice
					</Button>
					<Button href={`/lecturer/assessments/create/assignment?course=${course.id}`} size="sm" variant="outline">
						<Plus class="mr-1 size-3.5" />
						Assignment
					</Button>
					<Button href={`/lecturer/assessments/create/test?course=${course.id}`} size="sm" variant="outline">
						<Plus class="mr-1 size-3.5" />
						Test
					</Button>
					<Button href={`/lecturer/assessments/create/exam?course=${course.id}`} size="sm">
						<Plus class="mr-1 size-3.5" />
						Exam
					</Button>
				</div>
			</div>
			
			{#if assessments.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<ClipboardList class="size-10 text-muted-foreground/40" />
						<div>
							<h4 class="text-sm font-medium">No assessments yet</h4>
							<p class="text-sm text-muted-foreground mt-1">
								Create your first assessment for this course
							</p>
						</div>
						<Button href={`/lecturer/assessments/create/test?course=${course.id}`} variant="outline" size="sm">
							<Plus class="mr-1 size-3.5" />
							Create Assessment
						</Button>
					</CardContent>
				</Card>
			{:else}
				<Card>
					<CardContent class="p-0">
						<div class="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Title</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead class="text-center">Questions</TableHead>
										<TableHead>Due Date</TableHead>
										<TableHead class="text-center">Students</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each assessments as a}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="font-medium">{a.title}</TableCell>
											<TableCell>
												<Badge variant="outline">{a.type}</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={getAssessmentStatusBadge(a.status).variant} class="gap-1">
													<svelte:component this={getAssessmentStatusBadge(a.status).icon} class="size-3" />
													{getAssessmentStatusBadge(a.status).label}
												</Badge>
											</TableCell>
											<TableCell class="text-center">{a.questionCount}</TableCell>
											<TableCell>
												{a.dueDate ? formatDate(a.dueDate) : 'N/A'}
											</TableCell>
											<TableCell class="text-center">
												<Badge variant="outline">{a._count?.sessions || 0}</Badge>
											</TableCell>
											<TableCell class="text-right">
												<div class="flex justify-end gap-1">
													<Button href={`/lecturer/assessments/${a.id}`} variant="ghost" size="sm" class="h-8 w-8 p-0">
														<Eye class="size-3.5" />
														<span class="sr-only">View</span>
													</Button>
													{#if a.status === 'DRAFT'}
														<Button href={`/lecturer/assessments/edit/${a.id}`} variant="ghost" size="sm" class="h-8 w-8 p-0">
															<Pencil class="size-3.5" />
															<span class="sr-only">Edit</span>
														</Button>
													{/if}
												</div>
											</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			{/if}
		</TabsContent>

		<!-- ─── Questions Tab ──────────────────────────────────────────────── -->
		<TabsContent value="questions" class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="text-sm font-medium">Recent Questions</h3>
				<div class="flex flex-wrap gap-2">
					<Button href={`/lecturer/question-bank/create?course=${course.id}`} size="sm">
						<Plus class="mr-1 size-3.5" />
						Add Question
					</Button>
					<Button href={`/lecturer/question-bank?course=${course.id}`} size="sm" variant="outline">
						<Eye class="mr-1 size-3.5" />
						View All
					</Button>
				</div>
			</div>
			
			{#if recentQuestions.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<FileQuestion class="size-10 text-muted-foreground/40" />
						<div>
							<h4 class="text-sm font-medium">No questions yet</h4>
							<p class="text-sm text-muted-foreground mt-1">
								Add questions to your question bank for this course
							</p>
						</div>
						<Button href={`/lecturer/question-bank/create?course=${course.id}`} variant="outline" size="sm">
							<Plus class="mr-1 size-3.5" />
							Create Question
						</Button>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
					{#each recentQuestions as q}
						<Card class="transition-all hover:shadow-md">
							<CardContent class="flex items-center justify-between p-4">
								<div class="flex-1 space-y-2 min-w-0">
									<div class="flex items-start justify-between gap-3">
										<p class="text-sm font-medium truncate">{q.body}</p>
										<Badge class={getDifficultyColor(q.difficulty)}>{q.difficulty}</Badge>
									</div>
									<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
										<span>Type: {getQuestionTypeLabel(q.type)}</span>
										<span>Marks: {q.marks}</span>
										<span>{q.isActive ? '✅ Active' : '❌ Inactive'}</span>
										<span>Created: {formatDate(q.createdAt)}</span>
									</div>
								</div>
								<Button href={`/lecturer/question-bank/${q.id}`} variant="ghost" size="sm" class="shrink-0 ml-2">
									<Eye class="size-3.5" />
									<span class="sr-only">View</span>
								</Button>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- ─── Students Tab ────────────────────────────────────────────────── -->
		<TabsContent value="students" class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="text-sm font-medium">Registered Students</h3>
				<span class="text-sm text-muted-foreground">{studentCount} total</span>
			</div>
			
			<!-- Student Filters -->
			<div class="flex flex-wrap gap-3">
				<div class="relative flex-1 min-w-[200px]">
					<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search students..."
						bind:value={searchQuery}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					/>
				</div>
				<select
					bind:value={filterStatus}
					class="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					<option value="all">All Status</option>
					<option value="APPROVED">Approved</option>
					<option value="PENDING">Pending</option>
					<option value="REJECTED">Rejected</option>
					<option value="CANCELLED">Cancelled</option>
				</select>
				<Button variant="outline" size="sm" onclick={() => {
					searchQuery = ''
					filterStatus = 'all'
				}}>
					<XCircle class="mr-1 size-3.5" />
					Clear
				</Button>
			</div>
			
			{#if recentStudents.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<Users class="size-10 text-muted-foreground/40" />
						<div>
							<h4 class="text-sm font-medium">No students registered</h4>
							<p class="text-sm text-muted-foreground mt-1">
								Students will appear here once they register for this course
							</p>
						</div>
					</CardContent>
				</Card>
			{:else if filteredStudents.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<Search class="size-10 text-muted-foreground/40" />
						<div>
							<h4 class="text-sm font-medium">No matching students</h4>
							<p class="text-sm text-muted-foreground mt-1">
								Try adjusting your search or filters
							</p>
						</div>
						<Button variant="outline" size="sm" onclick={() => {
							searchQuery = ''
							filterStatus = 'all'
						}}>
							Clear Filters
						</Button>
					</CardContent>
				</Card>
			{:else}
				<Card>
					<CardContent class="p-0">
						<div class="overflow-x-auto max-h-[500px] overflow-y-auto">
							<Table>
								<TableHeader class="sticky top-0 z-10 bg-background">
									<TableRow>
										<TableHead>Matric Number</TableHead>
										<TableHead>Full Name</TableHead>
										<TableHead>Level</TableHead>
										<TableHead>Programme</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Registered</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each filteredStudents as reg}
										<TableRow class="transition-colors hover:bg-muted/30">
											<TableCell class="font-mono text-sm">{reg.student.matricNumber}</TableCell>
											<TableCell>
												<div class="flex items-center gap-2">
													<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
														{reg.student.firstName?.[0]}{reg.student.lastName?.[0]}
													</div>
													<span>{reg.student.firstName} {reg.student.lastName}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">Level {reg.student.currentLevel?.name || 'N/A'}</Badge>
											</TableCell>
											<TableCell class="text-sm">
												{reg.student.programme?.shortName || 'N/A'}
											</TableCell>
											<TableCell>
												<Badge variant={reg.status === 'APPROVED' ? 'default' : 'secondary'}>
													{reg.status}
												</Badge>
											</TableCell>
											<TableCell class="text-sm text-muted-foreground">
												{formatDate(reg.createdAt)}
											</TableCell>
											<TableCell class="text-right">
												<Button 
													variant="ghost" 
													size="sm" 
													class="h-8 w-8 p-0"
													onclick={() => toggleStudent(reg.studentId)}
												>
													{#if expandedStudent === reg.studentId}
														<ChevronUp class="size-3.5" />
													{:else}
														<ChevronDown class="size-3.5" />
													{/if}
													<span class="sr-only">Toggle Details</span>
												</Button>
											</TableCell>
										</TableRow>
										
										<!-- ─── Expanded Student Row ────────────────────────────────────── -->
										{#if expandedStudent === reg.studentId}
											<TableRow class="bg-muted/20">
												<TableCell colspan="7" class="px-4 py-3">
													<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
														<div>
															<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personal Info</h5>
															<div class="mt-2 space-y-1 text-sm">
																<p><span class="text-muted-foreground">Name:</span> {reg.student.firstName} {reg.student.lastName}</p>
																<p><span class="text-muted-foreground">Matric:</span> {reg.student.matricNumber}</p>
																<p><span class="text-muted-foreground">Email:</span> {reg.student.email}</p>
															</div>
														</div>
														<div>
															<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Academic Info</h5>
															<div class="mt-2 space-y-1 text-sm">
																<p><span class="text-muted-foreground">Level:</span> Level {reg.student.currentLevel?.name || 'N/A'}</p>
																<p><span class="text-muted-foreground">Programme:</span> {reg.student.programme?.name || 'N/A'}</p>
																<p><span class="text-muted-foreground">Department:</span> {reg.student.department?.name || 'N/A'}</p>
															</div>
														</div>
														<div>
															<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registration</h5>
															<div class="mt-2 space-y-1 text-sm">
																<p><span class="text-muted-foreground">Status:</span> {reg.status}</p>
																<p><span class="text-muted-foreground">Registered:</span> {formatDate(reg.createdAt)}</p>
																{#if reg.approvedAt}
																	<p><span class="text-muted-foreground">Approved:</span> {formatDate(reg.approvedAt)}</p>
																{/if}
															</div>
														</div>
													</div>
												</TableCell>
											</TableRow>
										{/if}
									{/each}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
				{#if studentCount > 10}
					<p class="text-center text-sm text-muted-foreground">
						Showing {filteredStudents.length} of {studentCount} students
						{#if filteredStudents.length < studentCount}
							<span class="block mt-1 text-xs">
								<Button href={`/lecturer/courses/${course.id}/students`} variant="link" size="sm" class="text-xs">
									View all students →
								</Button>
							</span>
						{/if}
					</p>
				{/if}
			{/if}
		</TabsContent>

		<!-- ─── Activity Tab ────────────────────────────────────────────────── -->
		<TabsContent value="activity" class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">Recent Activity</h3>
				<Button variant="outline" size="sm">
					<Download class="mr-1 size-3.5" />
					Export Log
				</Button>
			</div>
			
			{#if recentActivity.length === 0}
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<Clock class="size-10 text-muted-foreground/40" />
						<div>
							<h4 class="text-sm font-medium">No recent activity</h4>
							<p class="text-sm text-muted-foreground mt-1">
								Activity will appear here as you interact with this course
							</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				<div className="relative border-l border-border ml-3 space-y-6">
					{#each recentActivity as activity, index}
						<div className="ml-6">
							<div class="absolute -left-2 mt-1.5">
								<div class="flex size-4 items-center justify-center rounded-full bg-muted">
									<div class="size-2 rounded-full bg-primary"></div>
								</div>
							</div>
							<Card class="transition-all hover:shadow-md">
								<CardContent class="p-4">
									<div class="flex flex-wrap items-start justify-between gap-2">
										<div class="space-y-1 flex-1 min-w-0">
											<p class="text-sm font-medium">{activity.action}</p>
											<p class="text-xs text-muted-foreground">
												{activity.staff ? `By ${activity.staff.firstName} ${activity.staff.lastName}` : 'By System'}
												{#if activity.entity}
													<span className="mx-1">·</span>
													<span>{activity.entity}</span>
												{/if}
											</p>
											{#if activity.beforeData || activity.afterData}
												<div class="mt-2 flex flex-wrap gap-2 text-xs">
													{#if activity.beforeData}
														<Badge variant="outline" className="text-[10px]">
															Before: {JSON.stringify(activity.beforeData).slice(0, 50)}
														</Badge>
													{/if}
													{#if activity.afterData}
														<Badge variant="outline" className="text-[10px] text-green-600">
															After: {JSON.stringify(activity.afterData).slice(0, 50)}
														</Badge>
													{/if}
												</div>
											{/if}
										</div>
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											{formatDateTime(activity.createdAt)}
										</span>
									</div>
								</CardContent>
							</Card>
						</div>
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- ─── Analytics Tab ───────────────────────────────────────────────── -->
		<TabsContent value="analytics" class="space-y-4">
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<TrendingUp class="size-4 text-green-500" />
							Assessment Performance
						</CardTitle>
						<CardDescription>Overall assessment metrics</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Completion Rate</span>
								<span className="font-medium">
									{assessmentStats.total > 0 
										? Math.round((assessmentStats.completed / assessmentStats.total) * 100) 
										: 0}%
								</span>
							</div>
							<Progress 
								value={assessmentStats.total > 0 
									? Math.round((assessmentStats.completed / assessmentStats.total) * 100) 
									: 0} 
								className="h-1.5 mt-1" 
							/>
						</div>
						<div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Published vs Draft</span>
								<span className="font-medium">
									{assessmentStats.published} / {assessmentStats.draft}
								</span>
							</div>
							<Progress 
								value={assessmentStats.total > 0 
									? Math.round((assessmentStats.published / assessmentStats.total) * 100) 
									: 0} 
								className="h-1.5 mt-1" 
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Brain class="size-4 text-purple-500" />
							Question Bank Health
						</CardTitle>
						<CardDescription>Question metrics and activity</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Total Questions</span>
								<span className="font-medium">{recentQuestions.length}</span>
							</div>
							<Progress 
								value={Math.min((recentQuestions.length / 50) * 100, 100)} 
								className="h-1.5 mt-1" 
							/>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Active</span>
							<span className="font-medium text-green-600">
								{recentQuestions.filter(q => q.isActive).length}
							</span>
							<span className="text-muted-foreground">Inactive</span>
							<span className="font-medium text-red-600">
								{recentQuestions.filter(q => !q.isActive).length}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Users class="size-4 text-blue-500" />
							Student Engagement
						</CardTitle>
						<CardDescription>Student registration and activity</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Total Students</span>
								<span className="font-medium">{studentCount}</span>
							</div>
							<Progress 
								value={Math.min((studentCount / 100) * 100, 100)} 
								className="h-1.5 mt-1" 
							/>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Active</span>
							<span className="font-medium text-green-600">
								{recentStudents.filter(r => r.status === 'APPROVED').length}
							</span>
							<span className="text-muted-foreground">Pending</span>
							<span className="font-medium text-yellow-600">
								{recentStudents.filter(r => r.status === 'PENDING').length}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Calendar class="size-4 text-green-500" />
							Semester Overview
						</CardTitle>
						<CardDescription>Current academic period</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Current Semester</span>
							<span className="font-medium">{currentSemester?.name || 'None'}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Status</span>
							<Badge variant={currentSemester?.isActive ? 'default' : 'secondary'}>
								{currentSemester?.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
					</CardContent>
				</Card>
			</div>
		</TabsContent>
	</Tabs>
</main>