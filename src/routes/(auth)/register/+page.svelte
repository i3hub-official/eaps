<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { form } = $props();
</script>

<svelte:head>
	<title>Register — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading="Create your account" subheading="Registration is verified against the student and staff records office">
	<form method="POST" class="flex flex-col gap-4">
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1.5">
				<Label for="firstName">First name</Label>
				<Input id="firstName" name="firstName" required />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="lastName">Last name</Label>
				<Input id="lastName" name="lastName" required />
			</div>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="matric">Matric / staff number</Label>
			<Input id="matric" name="matric" placeholder="e.g. 2021/CSC/045" required />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="email">University email</Label>
			<Input id="email" name="email" type="email" placeholder="you@mouau.edu.ng" required />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="password">Password</Label>
			<Input id="password" name="password" type="password" required />
		</div>
		{#if form?.error}
			<p class="text-sm text-destructive">{form.error}</p>
		{/if}
		<Button type="submit" size="lg" class="mt-1 w-full">Create account</Button>
	</form>

	<p class="text-center text-xs text-muted-foreground">
		Already have an account? <a href="/login" class="text-primary hover:underline">Sign in</a>
	</p>
</AuthShell>
