<script lang="ts">
	import { enhance } from '$app/forms';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import SearchableSelect from '$lib/components/admin/SearchableSelect.svelte';
	import { enhanceWithToast } from '$lib/utils/enhanceWithToast.js';
	import { AlertCircle, Save, LoaderCircle } from '@lucide/svelte/icons';

	let { data, form } = $props();

	let departmentId = $state(data.course.departmentId);
	let levelId = $state(data.course.levelId);
	let type = $state(data.course.type);
	let status = $state(data.course.status);
	let isSaving = $state(false);
</script>

<svelte:head>
	<title>Edit {data.course.code} — EAPS</title>
</svelte:head>

<Topbar title={`Edit ${data.course.code}`} description="Update course details" />

<main class="flex flex-1 flex-col gap-6 p-6 max-w-2xl">
	{#if form?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Course Details</CardTitle>
			<CardDescription>Edit information for this course</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				class="space-y-4"
				use:enhance={enhanceWithToast({
					onStart: () => (isSaving = true),
					onEnd: () => (isSaving = false),
					pending: 'Saving course…',
					successFallback: 'Course updated.',
					errorFallback: 'Failed to update course.',
				})}
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="departmentId">Department</Label>
						<SearchableSelect items={data.departments} bind:value={departmentId} name="departmentId" placeholder="Select department..." />
					</div>
					<div class="space-y-2">
						<Label for="levelId">Level</Label>
						<SearchableSelect items={data.levels} bind:value={levelId} name="levelId" placeholder="Select level..." />
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="code">Course Code</Label>
						<Input id="code" name="code" value={data.course.code} required />
					</div>
					<div class="space-y-2">
						<Label for="creditUnits">Credit Units</Label>
						<Input id="creditUnits" name="creditUnits" type="number" min="1" value={data.course.creditUnits} required />
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="title">Course Title</Label>
						<Input id="title" name="title" value={data.course.title} required />
					</div>

					<div class="space-y-2">
						<Label for="type">Type</Label>
						<Select type="single" bind:value={type} name="type">
							<SelectTrigger class="w-full">
								<span>{type.replace(/_/g, ' ')}</span>
							</SelectTrigger>
							<SelectContent>
								{#each data.courseTypes as t}
									<SelectItem value={t}>{t.replace(/_/g, ' ')}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="space-y-2">
						<Label for="status">Status</Label>
						<Select type="single" bind:value={status} name="status">
							<SelectTrigger class="w-full">
								<span>{status}</span>
							</SelectTrigger>
							<SelectContent>
								{#each data.courseStatuses as s}
									<SelectItem value={s}>{s}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="space-y-2 sm:col-span-2">
						<Label for="description">Description</Label>
						<Textarea id="description" name="description" value={data.course.description || ''} rows={4} />
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<Button variant="outline" href={`/admin/courses/${data.course.id}`}>Cancel</Button>
					<Button type="submit" disabled={isSaving}>
						{#if isSaving}
							<LoaderCircle class="mr-2 size-4 animate-spin" />
							Saving…
						{:else}
							<Save class="mr-2 size-4" />
							Save Changes
						{/if}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</main>