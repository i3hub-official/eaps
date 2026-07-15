<!-- src/routes/(lecturer)/lecturer/courses/[id]/edit/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard'
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { 
		AlertCircle, 
		ArrowLeft, 
		Building2, 
		Shield,
		Lock,
		BookOpen,
		Users,
		ClipboardList,
		FileQuestion,
		Calendar,
		CheckCircle,
		Info,
		Mail,
		Phone,
		ExternalLink,
		ChevronRight,
		GraduationCap,
		Building,
		UserCog,
		HelpCircle,
		MessageSquare,
	} from '@lucide/svelte/icons'
	import { page } from '$app/state'

	let { data } = $props()

	// ─── Computed ────────────────────────────────────────────────────────────
	const courseId = data?.courseId || ''
	const courseCode = data?.courseCode || 'Course'
	const courseTitle = data?.courseTitle || ''

	// ─── Handlers ────────────────────────────────────────────────────────────
	function handleContactSupport() {
		// You can replace this with your actual support email
		window.location.href = 'mailto:registrar@mouau.edu.ng?subject=Course%20Modification%20Request'
	}

	function goBackToCourses() {
		window.location.href = '/lecturer/courses'
	}
</script>

<svelte:head>
	<title>Edit Course — EAPS</title>
</svelte:head>

<Topbar 
	title="Edit Course" 
	description={`${courseCode} — ${courseTitle}`}
	backHref="/lecturer/courses"
>
	{#snippet actions()}
		<Button href="/lecturer/courses" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			All Courses
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col items-center justify-center gap-6 p-6">
	<Card class="max-w-3xl w-full border-amber-500/30 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/10">
		<CardHeader class="text-center">
			<div class="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-amber-500/10 ring-4 ring-amber-500/20">
				<Shield class="size-10 text-amber-500" />
			</div>
			<CardTitle class="text-2xl font-bold text-amber-700 dark:text-amber-400">
				Course Management Access Restricted
			</CardTitle>
			<CardDescription class="text-base">
				Course details can only be edited by authorized administrative personnel
			</CardDescription>
		</CardHeader>
		
		<CardContent class="space-y-6">
			<!-- ─── Info Alert ────────────────────────────────────────────────── -->
			<div class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
				<Lock class="mt-0.5 size-4 shrink-0 text-amber-500" />
				<div>
					<p class="font-medium text-amber-700 dark:text-amber-400">
						Course information is managed by the Registrar's Office
					</p>
					<p class="mt-1 text-amber-600/80 dark:text-amber-400/80">
						Course titles, codes, credit units, and other core details are maintained centrally 
						to ensure data integrity across the institution.
					</p>
				</div>
			</div>

			<!-- ─── Course Info Card ─────────────────────────────────────────── -->
			<div class="rounded-lg border bg-background/50 p-4">
				<h4 class="text-sm font-medium flex items-center gap-2 mb-3">
					<BookOpen class="size-4 text-muted-foreground" />
					Current Course Details
				</h4>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<p class="text-xs text-muted-foreground">Course Code</p>
						<p class="font-mono font-medium text-sm">{courseCode}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Course Title</p>
						<p class="font-medium text-sm">{courseTitle}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Department</p>
						<p class="text-sm">{data?.courseDepartment || 'N/A'}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Level</p>
						<p class="text-sm">{data?.courseLevel || 'N/A'}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Credit Units</p>
						<p class="text-sm font-medium">{data?.creditUnits || 'N/A'}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Status</p>
						<Badge variant="default" class="mt-0.5">
							<CheckCircle class="size-3 mr-1" />
							Active
						</Badge>
					</div>
				</div>
			</div>

			<!-- ─── Course Statistics ────────────────────────────────────────── -->
			<div class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-lg border bg-background/50 p-3 text-center">
					<Users class="size-4 mx-auto text-blue-500 mb-1" />
					<p class="text-lg font-bold">{data?.studentCount || 0}</p>
					<p class="text-xs text-muted-foreground">Students</p>
				</div>
				<div class="rounded-lg border bg-background/50 p-3 text-center">
					<ClipboardList class="size-4 mx-auto text-purple-500 mb-1" />
					<p class="text-lg font-bold">{data?.assessmentCount || 0}</p>
					<p class="text-xs text-muted-foreground">Assessments</p>
				</div>
				<div class="rounded-lg border bg-background/50 p-3 text-center">
					<FileQuestion class="size-4 mx-auto text-green-500 mb-1" />
					<p class="text-lg font-bold">{data?.questionCount || 0}</p>
					<p class="text-xs text-muted-foreground">Questions</p>
				</div>
			</div>

			<!-- ─── What You Can Do ──────────────────────────────────────────── -->
			<div class="space-y-3">
				<h4 class="text-sm font-medium flex items-center gap-2">
					<CheckCircle class="size-4 text-green-500" />
					What you can do with this course:
				</h4>
				<div class="grid gap-2 sm:grid-cols-2">
					<a href={`/lecturer/assessments/create/test?course=${courseId}`} class="flex items-start gap-2 rounded-lg bg-green-50/50 dark:bg-green-950/10 p-3 border border-green-200/50 dark:border-green-800/30 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors cursor-pointer">
						<ClipboardList class="mt-0.5 size-4 text-green-600 dark:text-green-400 shrink-0" />
						<div>
							<p class="text-sm font-medium">Create Assessments</p>
							<p class="text-xs text-muted-foreground">Tests, exams, assignments, and practice</p>
						</div>
					</a>
					<a href={`/lecturer/question-bank?course=${courseId}`} class="flex items-start gap-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 p-3 border border-blue-200/50 dark:border-blue-800/30 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer">
						<FileQuestion class="mt-0.5 size-4 text-blue-600 dark:text-blue-400 shrink-0" />
						<div>
							<p class="text-sm font-medium">Build Question Bank</p>
							<p class="text-xs text-muted-foreground">Add and manage questions</p>
						</div>
					</a>
					<a href={`/lecturer/grade?course=${courseId}`} class="flex items-start gap-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/10 p-3 border border-purple-200/50 dark:border-purple-800/30 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors cursor-pointer">
						<Users class="mt-0.5 size-4 text-purple-600 dark:text-purple-400 shrink-0" />
						<div>
							<p class="text-sm font-medium">Grade Submissions</p>
							<p class="text-xs text-muted-foreground">Review and grade student work</p>
						</div>
					</a>
					<a href={`/lecturer/courses/${courseId}`} class="flex items-start gap-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 p-3 border border-emerald-200/50 dark:border-emerald-800/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer">
						<Calendar class="mt-0.5 size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<div>
							<p class="text-sm font-medium">View Analytics</p>
							<p class="text-xs text-muted-foreground">Track student progress and engagement</p>
						</div>
					</a>
				</div>
			</div>

			<!-- ─── Contact Information ─────────────────────────────────────── -->
			<div class="rounded-lg bg-muted/50 p-4 space-y-3">
				<h4 class="text-sm font-medium flex items-center gap-2">
					<Building2 class="size-4 text-muted-foreground" />
					Need to modify course information?
				</h4>
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1">
						<p class="text-sm font-medium">Registrar's Office</p>
						<p class="text-sm text-muted-foreground flex items-center gap-2">
							<Building class="size-3.5" />
							<span>{data?.managementContact?.office || 'Administrative Block, Room 201'}</span>
						</p>
						<p class="text-sm text-muted-foreground flex items-center gap-2">
							<Phone class="size-3.5" />
							<span>{data?.managementContact?.phone || '+234 800 123 4567'}</span>
						</p>
						<p class="text-sm text-muted-foreground flex items-center gap-2">
							<Mail class="size-3.5" />
							<a href="mailto:{data?.managementContact?.email || 'registrar@mouau.edu.ng'}" class="text-primary hover:underline">
								{data?.managementContact?.email || 'registrar@mouau.edu.ng'}
							</a>
						</p>
					</div>
					<div class="space-y-2">
						<p class="text-sm font-medium">Required Approvals</p>
						<div class="space-y-1 text-sm text-muted-foreground">
							<p class="flex items-center gap-2">
								<UserCog class="size-3.5" />
								<span>Head of Department</span>
							</p>
							<p class="flex items-center gap-2">
								<GraduationCap class="size-3.5" />
								<span>Dean of Faculty</span>
							</p>
							<p class="flex items-center gap-2">
								<Building2 class="size-3.5" />
								<span>Registrar's Office</span>
							</p>
						</div>
					</div>
				</div>
				<div class="mt-2 flex flex-wrap gap-2">
					<Button variant="outline" size="sm" onclick={handleContactSupport}>
						<Mail class="mr-2 size-3.5" />
						Contact Registrar
					</Button>
					<Button variant="outline" size="sm" href="/lecturer/support">
						<HelpCircle class="mr-2 size-3.5" />
						Get Help
					</Button>
				</div>
			</div>

			<!-- ─── Actions ───────────────────────────────────────────────────── -->
			<div class="flex flex-wrap gap-3">
				<Button href="/lecturer/courses" variant="outline" class="flex-1 min-w-[120px]">
					<ArrowLeft class="mr-2 size-4" />
					Back to Courses
				</Button>
				<Button href={`/lecturer/courses/${courseId}`} variant="outline" class="flex-1 min-w-[120px]">
					<BookOpen class="mr-2 size-4" />
					View Course
				</Button>
				<Button href={`/lecturer/assessments/create/test?course=${courseId}`} variant="default" class="flex-1 min-w-[120px]">
					<ClipboardList class="mr-2 size-4" />
					Create Assessment
				</Button>
			</div>

			<!-- ─── Helpful Tip ───────────────────────────────────────────────── -->
			<div class="rounded-lg border border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-800/30 p-3">
				<div class="flex items-start gap-2">
					<Info class="size-4 text-blue-500 shrink-0 mt-0.5" />
					<div>
						<p class="text-sm font-medium text-blue-700 dark:text-blue-400">
							Need to request a change?
						</p>
						<p class="text-sm text-muted-foreground">
							Submit a course modification request through the HOD portal. 
							<a href="/lecturer/help/course-modification" class="text-primary hover:underline inline-flex items-center gap-1">
								Learn more
								<ExternalLink class="size-3" />
							</a>
						</p>
					</div>
				</div>
			</div>

			<!-- ─── Support Chat ───────────────────────────────────────────────── -->
			<div class="text-center">
				<Button variant="ghost" size="sm" class="text-muted-foreground" href="/lecturer/support">
					<MessageSquare class="mr-2 size-3.5" />
					Need more help? Contact Support
					<ChevronRight class="ml-1 size-3.5" />
				</Button>
			</div>
		</CardContent>
	</Card>
</main>