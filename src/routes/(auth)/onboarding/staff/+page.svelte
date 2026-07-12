<!-- src/routes/(auth)/onboarding/staff/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	let { data, form } = $props();

	let firstName = $state('');
	let otherNames = $state('');
	let lastName = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let confirmError = $state('');

	function handleSubmit(e: Event) {
		confirmError = '';
		if (password !== confirmPassword) {
			e.preventDefault();
			confirmError = "Passwords don't match";
			return;
		}
		isSubmitting = true;
	}
</script>

<svelte:head>
	<title>Complete Onboarding — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading="Complete Your Onboarding" subheading="Set up your staff account">
	{#if data.error}
		<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{data.error}</span>
		</div>
	{:else}
		<div class="mb-6 rounded-lg border bg-muted/30 p-4 text-sm">
			<div class="flex justify-between py-1"><span class="text-muted-foreground">Email</span><span class="font-medium">{data.invitation.email}</span></div>
			<div class="flex justify-between py-1"><span class="text-muted-foreground">Role</span><span class="font-medium">{data.invitation.role}</span></div>
			<div class="flex justify-between py-1"><span class="text-muted-foreground">College</span><span class="font-medium">{data.invitation.college}</span></div>
			<div class="flex justify-between py-1"><span class="text-muted-foreground">Department</span><span class="font-medium">{data.invitation.department}</span></div>
			{#if data.invitation.courses.length > 0}
				<div class="pt-2">
					<span class="text-muted-foreground text-xs">Courses</span>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each data.invitation.courses as c}
							<Badge variant="outline" class="text-xs">{c}</Badge>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if form?.error}
			<div class="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{form.error}</span>
			</div>
		{/if}

		<form method="POST" action="?/accept" onsubmit={handleSubmit} class="space-y-4">
			<input type="hidden" name="token" value={data.token} />

			<div class="space-y-2">
				<Label for="firstName">First Name *</Label>
				<Input id="firstName" name="firstName" bind:value={firstName} required />
				{#if form?.errors?.firstName}<p class="text-sm text-destructive">{form.errors.firstName}</p>{/if}
			</div>

			<div class="space-y-2">
				<Label for="lastName">Last Name *</Label>
				<Input id="lastName" name="lastName" bind:value={lastName} required />
				{#if form?.errors?.lastName}<p class="text-sm text-destructive">{form.errors.lastName}</p>{/if}
			</div>

			<div class="space-y-2">
				<Label for="otherNames">Other Names</Label>
				<Input id="otherNames" name="otherNames" bind:value={otherNames} />
			</div>

			<div class="space-y-2">
				<Label for="password">Password *</Label>
				<Input id="password" name="password" type="password" bind:value={password} required />
				{#if form?.errors?.password}<p class="text-sm text-destructive">{form.errors.password}</p>{/if}
			</div>

			<div class="space-y-2">
				<Label for="confirmPassword">Confirm Password *</Label>
				<Input id="confirmPassword" type="password" bind:value={confirmPassword} required />
				{#if confirmError}<p class="text-sm text-destructive">{confirmError}</p>{/if}
			</div>

			<Button type="submit" size="lg" class="h-12 w-full text-base" disabled={isSubmitting}>
				{isSubmitting ? 'Setting up your account…' : 'Complete Onboarding'}
			</Button>
		</form>
	{/if}
</AuthShell>