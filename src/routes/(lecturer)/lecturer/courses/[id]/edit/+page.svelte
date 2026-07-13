<!-- src/routes/(lecturer)/lecturer/courses/[id]/edit/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { 
		AlertCircle, 
		ArrowLeft, 
		Building2, 
		Shield,
		Lock
	} from '@lucide/svelte/icons'

	let { data } = $props()
</script>

<Topbar 
	title="Edit Course" 
	description="Course management"
/>

<main class="flex flex-1 flex-col items-center justify-center gap-6 p-6">
	<Card class="max-w-2xl w-full border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
		<CardHeader class="text-center">
			<div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-500/10">
				<Shield class="size-8 text-amber-500" />
			</div>
			<CardTitle class="text-2xl font-bold text-amber-700 dark:text-amber-400">
				Course Management Access Restricted
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-6">
			<div class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
				<Lock class="mt-0.5 size-4 shrink-0 text-amber-500" />
				<div>
					<p class="font-medium text-amber-700 dark:text-amber-400">
						Course details can only be edited by management
					</p>
					<p class="mt-1 text-amber-600/80 dark:text-amber-400/80">
						Course information including title, code, credit units, and other core details 
						are managed by the registrar's office to maintain data integrity.
					</p>
				</div>
			</div>

			<div class="space-y-4">
				<h4 class="text-sm font-medium text-muted-foreground">What you can do:</h4>
				<ul class="space-y-2 text-sm">
					<li class="flex items-start gap-2 text-muted-foreground">
						<span class="mt-0.5 text-primary">✓</span>
						<span>Create and manage assessments for this course</span>
					</li>
					<li class="flex items-start gap-2 text-muted-foreground">
						<span class="mt-0.5 text-primary">✓</span>
						<span>Build and maintain your question bank</span>
					</li>
					<li class="flex items-start gap-2 text-muted-foreground">
						<span class="mt-0.5 text-primary">✓</span>
						<span>Grade student submissions and release results</span>
					</li>
					<li class="flex items-start gap-2 text-muted-foreground">
						<span class="mt-0.5 text-primary">✓</span>
						<span>View student registrations and course analytics</span>
					</li>
				</ul>
			</div>

			<div class="flex flex-col gap-3 rounded-lg bg-muted/50 p-4">
				<p class="text-sm font-medium">Contact Management For Changes:</p>
				<div class="space-y-1 text-sm text-muted-foreground">
					<p class="flex items-center gap-2">
						<Building2 class="size-3.5" />
						<span>Registrar's Office</span>
					</p>
					<p class="text-xs text-muted-foreground/70">
						Course modifications require approval from the Head of Department and the Registrar's office.
					</p>
				</div>
			</div>

			<div class="flex gap-3">
				<Button href={`/lecturer/courses/${data?.courseId || ''}`} variant="outline" class="flex-1">
					<ArrowLeft class="mr-2 size-4" />
					Back to Course
				</Button>
				<Button href="/lecturer/courses" variant="outline" class="flex-1">
					View All Courses
				</Button>
			</div>
		</CardContent>
	</Card>
</main>