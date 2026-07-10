<!-- src/routes/(lecturer)/lecturer/courses/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import Search from '@lucide/svelte/icons/search';
	import BookOpen from '@lucide/svelte/icons/book-open';

	let { data } = $props();

	let query = $state('');

	let filteredCourses = $derived(
		data.courses.filter((c) => {
			if (!query.trim()) return true;
			const q = query.toLowerCase();
			return (
				c.code.toLowerCase().includes(q) ||
				c.title.toLowerCase().includes(q) ||
				c.department.toLowerCase().includes(q)
			);
		})
	);
</script>

<Topbar title="My Courses" description="All courses you're currently teaching" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div class="flex items-center justify-between gap-4">
		<div class="relative w-full max-w-sm">
			<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={query} placeholder="Search by code, title, or department…" class="pl-9" />
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Courses ({filteredCourses.length})</Card.Title>
			<Card.Description>Course offerings tied to your lecturer account this session</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if filteredCourses.length === 0}
				<div class="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
					<BookOpen class="size-8" />
					{#if data.courses.length === 0}
						<p>You're not assigned to any course offerings yet.</p>
					{:else}
						<p>No courses match "{query}".</p>
					{/if}
				</div>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Code</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Department</TableHead>
							<TableHead>Level</TableHead>
							<TableHead>Units</TableHead>
							<TableHead>Semester</TableHead>
							<TableHead>Students</TableHead>
							<TableHead>Assessments</TableHead>
							<TableHead>Status</TableHead>
							<TableHead class="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredCourses as course (course.id)}
							<TableRow>
								<TableCell class="font-medium">{course.code}</TableCell>
								<TableCell>{course.title}</TableCell>
								<TableCell>{course.department}</TableCell>
								<TableCell>{course.level}</TableCell>
								<TableCell>{course.creditUnits}</TableCell>
								<TableCell class="text-sm text-muted-foreground">{course.semesterLabel}</TableCell>
								<TableCell>{course.studentCount}</TableCell>
								<TableCell>{course.assessmentCount}</TableCell>
								<TableCell>
									<Badge variant={course.status === 'ACTIVE' ? 'default' : 'secondary'}>
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
			{/if}
		</Card.Content>
	</Card.Root>
</main>