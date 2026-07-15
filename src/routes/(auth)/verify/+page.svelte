<!-- src/routes/(auth)/verify/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let verified = $state(false);
	let confirmError = $state('');
	let confirming = $state(false);

	let resendMessage = $state('');
	let resendError = $state('');
	let resending = $state(false);

	$effect(() => {
		if (!form) return;
		if (form.success) verified = true;
		if (form.error) confirmError = form.error;
		if (form.resendSuccess) {
			resendMessage = form.resendMessage ?? '';
			resendError = '';
		}
		if (form.resendError) {
			resendError = form.resendError;
			resendMessage = '';
		}
	});

	let showConfirm = $derived(data.status === 'ready' && !confirmError && !verified);
	let showProblem = $derived(!verified && (data.status !== 'ready' || !!confirmError));
</script>

<svelte:head>
	<title>Verify your email — EAPS</title>
</svelte:head>

<AuthShell
	heading={verified ? 'Email verified' : showConfirm ? 'Verify your email' : 'Verification link problem'}
	subheading={verified
		? 'Your account is now active'
		: showConfirm
			? 'Click below to confirm this is you'
			: 'This link could not be used'}
>
	{#if verified}
		<div class="flex flex-col items-center gap-6 py-4 text-center">
			<CheckCircle2 class="size-12 text-primary" />
			<p class="text-sm text-muted-foreground">
				Your email has been verified and your account is now active.
			</p>
			<Button href="/login" size="lg" class="h-12 w-full text-base">Continue to Sign In</Button>
		</div>
	{:else if showConfirm}
		<form
			method="POST"
			action="?/confirm"
			use:enhance={() => {
				confirming = true;
				return async ({ update }) => {
					await update();
					confirming = false;
				};
			}}
			class="flex flex-col gap-6"
		>
			<input type="hidden" name="token" value={data.token} />
			<Button type="submit" size="lg" class="h-12 w-full text-base" disabled={confirming}>
				{confirming ? 'Verifying…' : 'Verify my email'}
			</Button>
		</form>
	{:else}
		<div class="flex flex-col gap-6">
			<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{confirmError || data.error || 'This verification link is invalid or has expired.'}</span>
			</div>

			{#if resendMessage}
				<div class="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary" role="alert">
					<CheckCircle2 class="mt-0.5 size-4 shrink-0" />
					<span>{resendMessage}</span>
				</div>
			{/if}
			{#if resendError}
				<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
					<AlertCircle class="mt-0.5 size-4 shrink-0" />
					<span>{resendError}</span>
				</div>
			{/if}

			<form
				method="POST"
				action="?/resend"
				use:enhance={() => {
					resending = true;
					return async ({ update }) => {
						await update();
						resending = false;
					};
				}}
				class="flex flex-col gap-4"
			>
				<div class="flex flex-col gap-3">
					<Label for="resendIdentifier" class="text-sm font-semibold">e-Mail Address</Label>
					<Input
						id="resendIdentifier"
						name="identifier"
						type="text"
						inputmode="email"
						autocapitalize="none"
						placeholder="you@student.mouau.edu.ng"
						required
						class="h-11 text-base"
					/>
				</div>
				<Button type="submit" size="lg" class="h-12 w-full text-base" disabled={resending}>
					{resending ? 'Sending…' : 'Resend verification link'}
				</Button>
			</form>
		</div>
	{/if}
</AuthShell>