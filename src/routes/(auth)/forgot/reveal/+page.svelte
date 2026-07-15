<!-- src/routes/(auth)/forgot/reveal/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Copy from '@lucide/svelte/icons/copy';

	let { data } = $props();

	let copied = $state(false);

	async function copyCode() {
		if (!data.valid) return;
		try {
			await navigator.clipboard.writeText(data.code);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard API unavailable — the code is still visible on screen.
		}
	}
</script>

<svelte:head>
	<title>Your verification code — EAPS</title>
</svelte:head>

<AuthShell
	heading={data.valid ? 'Your verification code' : 'Link problem'}
	subheading={data.valid
		? 'Go back to the tab where you started your password reset and enter this code'
		: 'We could not verify this link'}
>
	{#if data.valid}
		<div class="flex flex-col items-center gap-6 py-2">
			<div class="w-full rounded-lg border border-primary/30 bg-primary/5 px-6 py-8 text-center">
				<p class="font-mono text-4xl font-bold tracking-[0.3em] text-primary">{data.code}</p>
			</div>
			<Button onclick={copyCode} variant="outline" size="lg" class="h-12 w-full text-base">
				{#if copied}
					<CheckCircle2 class="mr-2 size-4" /> Copied
				{:else}
					<Copy class="mr-2 size-4" /> Copy code
				{/if}
			</Button>
			<p class="text-center text-sm text-muted-foreground">
				This code expires a short time after it was requested. If it stops working, go back and
				request a new one.
			</p>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4 py-4 text-center">
			<AlertCircle class="size-10 text-destructive" />
			<p class="text-sm text-muted-foreground">{data.error}</p>
			<Button href="/forgot" size="lg" class="h-12 w-full text-base">Start a new reset</Button>
		</div>
	{/if}
</AuthShell>