<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { form } = $props();
</script>

<svelte:head>
	<title>Reset password — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading="Set a new password" subheading="Choose a strong password you haven't used before">
	<form method="POST" class="flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<Label for="password">New password</Label>
			<Input id="password" name="password" type="password" required />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="confirmPassword">Confirm new password</Label>
			<Input id="confirmPassword" name="confirmPassword" type="password" required />
		</div>
		{#if form?.error}
			<p class="text-sm text-destructive">{form.error}</p>
		{/if}
		<Button type="submit" size="lg" class="mt-1 w-full">Reset password</Button>
	</form>

	<p class="text-center text-xs text-muted-foreground">
		<a href="/login" class="text-primary hover:underline">Back to sign in</a>
	</p>
</AuthShell>
