<script lang="ts">
	import { enhance } from '$app/forms';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import SearchableSelect from '$lib/components/admin/SearchableSelect.svelte';
	import { enhanceWithToast } from '$lib/utils/enhanceWithToast.js';
	import { AlertCircle, Save, LoaderCircle } from '@lucide/svelte/icons';

	let { data, form } = $props();

	let collegeId = $state(data.department.collegeId);
	let isSaving = $state(false);
</script>

<svelte:head>
	<title>Edit {data.department.name} — EAPS</title>
</svelte:head>

<Topbar title={`Edit ${data.department.name}`} description="Update department details" />

<main class="flex flex-1 flex-col gap-6 p-6 max-w-2xl">
	{#if form?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Department Details</CardTitle>
			<CardDescription>Edit information for this department</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				class="space-y-4"
				use:enhance={enhanceWithToast({
					onStart: () => (isSaving = true),
					onEnd: () => (isSaving = false),
					pending: 'Saving department…',
					successFallback: 'Department updated.',
					errorFallback: 'Failed to update department.',
				})}
			>
				<div class="space-y-2">
					<Label for="collegeId">College</Label>
					<SearchableSelect items={data.colleges} bind:value={collegeId} name="collegeId" placeholder="Select college..." />
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="name">Department Name</Label>
						<Input id="name" name="name" value={data.department.name} required />
					</div>
					<div class="space-y-2">
						<Label for="shortName">Short Name</Label>
						<Input id="shortName" name="shortName" value={data.department.shortName} required />
					</div>
					<div class="space-y-2">
						<Label for="code">Code</Label>
						<Input id="code" name="code" value={data.department.code} required />
					</div>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" name="email" type="email" value={data.department.email || ''} />
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="phone">Phone</Label>
						<Input id="phone" name="phone" value={data.department.phone || ''} />
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<Button variant="outline" href={`/admin/departments/${data.department.id}`}>Cancel</Button>
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