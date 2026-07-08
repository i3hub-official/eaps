<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
</script>

<svelte:head>
	<title>Signing out — MOUAU e-Test</title>
</svelte:head>

<main class="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
	<div class="absolute right-5 top-5">
		<ThemeToggle />
	</div>

	<div class="flex size-12 items-center justify-center rounded-md bg-primary">
		<ShieldCheck class="size-6 text-primary-foreground" />
	</div>
	<div class="flex flex-col gap-1.5">
		<h1 class="text-xl font-semibold">You've been signed out</h1>
		<p class="text-sm text-muted-foreground">Your session has ended securely.</p>
	</div>
	<Button href="/login" size="lg">Back to sign in</Button>
</main>