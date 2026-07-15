<!-- src/routes/(auth)/logout/+page.svelte -->

<!-- In your navbar/layout -->
<!-- <form method="POST" action="/logout">
	<Button type="submit" variant="ghost" size="sm">
		<LogOut class="size-4" />
		Sign out
	</Button>
</form> -->

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import { enhance } from '$app/forms';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	let isSigningOut = $state(true);
	let signoutForm = $state<HTMLFormElement | null>(null);

	onMount(() => {
		// Auto-submit the signout form when the page loads
		if (signoutForm) {
			signoutForm.requestSubmit();
		}
	});
</script>

<svelte:head>
	<title>Signing out — EAPS</title>
</svelte:head>

<!-- Hidden form that auto-submits to the server action -->
<form
	bind:this={signoutForm}
	method="POST"
	action="/logout"
	use:enhance={() => {
		return async ({ result, update }) => {
			isSigningOut = false;
			if (result.type === 'redirect') {
				await update();
			}
		};
	}}
	class="sr-only"
	aria-hidden="true"
>
	<button type="submit">Sign out</button>
</form>

<main class="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
	<div class="absolute right-5 top-5">
		<ThemeToggle />
	</div>

	{#if isSigningOut}
		<div
			class="flex flex-col items-center gap-4"
			out:fade={{ duration: 400 }}
		>
			<div class="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
			<p class="text-sm text-muted-foreground">Signing you out securely...</p>
		</div>
	{:else}
		<div
			class="flex size-12 items-center justify-center rounded-md bg-primary"
			in:scale={{ duration: 900, delay: 200, start: 0.4, easing: backOut }}
		>
			<ShieldCheck class="size-6 text-primary-foreground" />
		</div>
		<div
			class="flex flex-col gap-1.5"
			in:fly={{ y: 12, duration: 800, delay: 700, easing: quintOut }}
		>
			<h1 class="text-xl font-semibold">You've been signed out</h1>
			<p class="text-sm text-muted-foreground">Your session has ended securely.</p>
		</div>
		<div in:fly={{ y: 12, duration: 800, delay: 1100, easing: quintOut }}>
			<Button href="/login" size="lg">Back to sign in</Button>
		</div>
	{/if}
</main>