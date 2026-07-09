<!-- src/lib/components/dashboard/courses/add-course-dialog.svelte -->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import Plus from '@lucide/svelte/icons/plus';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	type CourseOption = {
		id: string;
		code: string;
		title: string;
		creditUnits: number;
		type: string;
	};

	let {
		availableCourses,
		disabled = false,
		errorMessage = ''
	}: {
		availableCourses: CourseOption[];
		disabled?: boolean;
		errorMessage?: string;
	} = $props();

	let open = $state(false);
	let submitting = $state(false);
	let selected = $state<Set<string>>(new Set());

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	let selectedCount = $derived(selected.size);
	let selectedCreditUnits = $derived(
		availableCourses.filter((c) => selected.has(c.id)).reduce((sum, c) => sum + c.creditUnits, 0)
	);

	function resetSelection() {
		selected = new Set();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} size="sm" {disabled}>
				<Plus class="size-4" />
				Add Courses
			</Button>
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Courses</Dialog.Title>
			<Dialog.Description>
				Select from the courses offered for your department and level this semester.
			</Dialog.Description>
		</Dialog.Header>

		{#if errorMessage}
			<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if availableCourses.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">
				There are no more courses available for you to register this semester.
			</p>
		{:else}
			<form
				method="POST"
				action="?/register"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
						open = false;
						resetSelection();
					};
				}}
				class="flex flex-col gap-4"
			>
				<div class="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-lg border p-1">
					{#each availableCourses as course (course.id)}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-md p-3 text-sm hover:bg-muted"
						>
							<Checkbox
								checked={selected.has(course.id)}
								onCheckedChange={() => toggle(course.id)}
								name="courseIds"
								value={course.id}
								class="mt-0.5"
							/>
							<span class="flex flex-1 flex-col gap-0.5">
								<span class="flex items-center gap-2 font-medium">
									{course.code}
									<Badge variant="secondary" class="font-normal">{course.creditUnits} units</Badge>
								</span>
								<span class="text-muted-foreground">{course.title}</span>
							</span>
						</label>
					{/each}
				</div>

				<div class="flex items-center justify-between text-sm text-muted-foreground">
					<span>{selectedCount} course{selectedCount === 1 ? '' : 's'} selected</span>
					<span>{selectedCreditUnits} credit unit{selectedCreditUnits === 1 ? '' : 's'}</span>
				</div>

				<Dialog.Footer>
					<Button type="button" variant="ghost" onclick={() => (open = false)}>Cancel</Button>
					<Button type="submit" disabled={selectedCount === 0 || submitting}>
						{submitting ? 'Registering…' : `Register ${selectedCount || ''} Course${selectedCount === 1 ? '' : 's'}`}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>