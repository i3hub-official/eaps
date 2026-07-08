<script lang="ts">
	import { AuthShell } from '$lib/components/auth';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { form } = $props();
	let value = $state('');
</script>

<svelte:head>
	<title>Verify code — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading="Enter verification code" subheading="We sent a 6-digit code to your university email">
	<form method="POST" class="flex flex-col gap-5">
		<input type="hidden" name="code" {value} />
		<InputOTP.Root maxlength={6} bind:value class="justify-center">
			{#snippet children({ cells }: { cells: Array<Record<string, unknown>> })}
				<InputOTP.Group>
					{#each cells as cell (cell)}
						<InputOTP.Slot {cell} />
					{/each}
				</InputOTP.Group>
			{/snippet}
		</InputOTP.Root>
		{#if form?.error}
			<p class="text-center text-sm text-destructive">{form.error}</p>
		{/if}
		<Button type="submit" size="lg" class="w-full">Verify</Button>
	</form>

	<p class="text-center text-xs text-muted-foreground">
		Didn't get a code? <button type="button" class="text-primary hover:underline">Resend</button>
	</p>
</AuthShell>
