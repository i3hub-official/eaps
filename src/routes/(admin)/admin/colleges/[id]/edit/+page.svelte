<script lang="ts">
	import { enhance } from '$app/forms';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { enhanceWithToast } from '$lib/utils/enhanceWithToast.js';
	import { AlertCircle, Save, LoaderCircle } from '@lucide/svelte/icons';

	let { data, form } = $props();

	let isSaving = $state(false);
</script>

<svelte:head>
	<title>Edit {data.college.name} — EAPS</title>
</svelte:head>

<Topbar title={`Edit ${data.college.name}`} description="Update college details" />

<main class="flex flex-1 flex-col gap-6 p-6 max-w-2xl">
	{#if form?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>College Details</CardTitle>
			<CardDescription>Edit information for this college</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				class="space-y-4"
				use:enhance={enhanceWithToast({
					onStart: () => (isSaving = true),
					onEnd: () => (isSaving = false),
					pending: 'Saving college…',
					successFallback: 'College updated.',
					errorFallback: 'Failed to update college.',
				})}
			>
				<div class="space-y-2">
					<Label for="name">College Name</Label>
					<Input id="name" name="name" value={data.college.name} required />
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="shortName">Short Name</Label>
						<Input id="shortName" name="shortName" value={data.college.shortName} required />
					</div>
					<div class="space-y-2">
						<Label for="code">Code</Label>
						<Input id="code" name="code" value={data.college.code} required />
					</div>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" name="email" type="email" value={data.college.email || ''} />
					</div>
					<div class="space-y-2">
						<Label for="phone">Phone</Label>
						<Input id="phone" name="phone" value={data.college.phone || ''} />
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<Button variant="outline" href={`/admin/colleges/${data.college.id}`}>Cancel</Button>
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