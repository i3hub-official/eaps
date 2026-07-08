<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Fingerprint from '@lucide/svelte/icons/fingerprint';

	
	let { form } = $props();
</script>

<svelte:head>
	<title>Sign in — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading="Sign in to your account" subheading="Use your university email and password to continue">
	<form method="POST" class="flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<Label for="email">University email</Label>
			<Input id="email" name="email" type="email" placeholder="you@mouau.edu.ng" required />
		</div>
		<div class="flex flex-col gap-1.5">
			<div class="flex items-center justify-between">
				<Label for="password">Password</Label>
				<a href="/forgot" class="text-xs text-primary hover:underline">Forgot password?</a>
			</div>
			<Input id="password" name="password" type="password" placeholder="••••••••" required />
		</div>
		{#if form?.error}
			<p class="text-sm text-destructive">{form.error}</p>
		{/if}
		<Button type="submit" size="lg" class="mt-1 w-full">Sign in</Button>
	</form>

	<div class="flex items-center gap-3">
		<Separator class="flex-1" />
		<span class="text-xs text-muted-foreground">or</span>
		<Separator class="flex-1" />
	</div>

	<Button variant="outline" size="lg" class="w-full">
		<Fingerprint class="size-4" />
		Sign in with passkey
	</Button>

	<p class="text-center text-xs text-muted-foreground">
		This device will be fingerprinted for exam-integrity purposes on first sign-in.
	</p>
	<p class="text-center text-xs text-muted-foreground">
		Don't have an account? <a href="/register" class="text-primary hover:underline">Register</a>
	</p>
</AuthShell>
