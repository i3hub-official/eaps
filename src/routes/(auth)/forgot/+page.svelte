<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { form } = $props();
</script>

<svelte:head>
	<title>Forgot password — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading="Forgot your password?" subheading="We'll email you a link to reset it">
	<form method="POST" class="flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<Label for="email">University email</Label>
			<Input id="email" name="email" type="email" placeholder="you@mouau.edu.ng" required />
		</div>
		{#if form?.success}
			<p class="text-sm text-emerald-600">Check your email for a reset link.</p>
		{/if}
		{#if form?.error}
			<p class="text-sm text-destructive">{form.error}</p>
		{/if}
		<Button type="submit" size="lg" class="mt-1 w-full">Send reset link</Button>
	</form>

	<p class="text-center text-xs text-muted-foreground">
		Remembered it after all? <a href="/login" class="text-primary hover:underline">Back to sign in</a>
	</p>
</AuthShell>
