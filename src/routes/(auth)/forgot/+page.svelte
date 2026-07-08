<!-- src/routes/(auth)/forgot-password/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	let { form } = $props();

	type Step = 'identifier' | 'otp' | 'newPassword' | 'success';

	let step = $state<Step>('identifier');
	let identifier = $state('');
	let otp = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let resendCooldown = $state(0);

	let identifierInputEl = $state<HTMLInputElement | null>(null);
	let passwordInputEl = $state<HTMLInputElement | null>(null);

	let isEmail = $derived(identifier.includes('@'));

	function maskIdentifier(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return '';
		if (isEmail) {
			const [local, domain] = trimmed.split('@');
			if (!domain) return trimmed;
			const visible = local.slice(0, 2);
			return `${visible}${'•'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
		}
		if (trimmed.length <= 6) return trimmed;
		const head = trimmed.slice(0, Math.min(6, trimmed.length - 2));
		const tail = trimmed.slice(-2);
		const maskedLen = Math.max(trimmed.length - head.length - tail.length, 2);
		return `${head}${'•'.repeat(maskedLen)}${tail}`;
	}

	let maskedIdentifier = $derived(maskIdentifier(identifier));

	function startCooldown() {
		resendCooldown = 30;
		const interval = setInterval(() => {
			resendCooldown -= 1;
			if (resendCooldown <= 0) clearInterval(interval);
		}, 1000);
	}

	async function requestOtp(e: Event) {
		e.preventDefault();
		if (!identifier.trim()) return;
		// TODO: call server action to send OTP to identifier
		step = 'otp';
		startCooldown();
	}

	async function verifyOtp(e: Event) {
		e.preventDefault();
		if (otp.trim().length < 8) return;
		// TODO: call server action to verify OTP
		step = 'newPassword';
		queueMicrotask(() => passwordInputEl?.focus());
	}

	async function submitNewPassword(e: Event) {
		e.preventDefault();
		if (!newPassword || newPassword !== confirmPassword) return;
		// TODO: call server action to set new password
		step = 'success';
	}

	function goBackTo(target: Step) {
		step = target;
		queueMicrotask(() => {
			if (target === 'identifier') identifierInputEl?.focus();
		});
	}

	const headings: Record<Step, { heading: string; subheading: string }> = {
		identifier: {
			heading: 'Reset your password',
			subheading: 'Enter your university email or matric number'
		},
		otp: {
			heading: 'Check your inbox',
			subheading: 'Enter the 8-digit code we sent you'
		},
		newPassword: {
			heading: 'Set a new password',
			subheading: 'Choose a password you have not used before'
		},
		success: {
			heading: 'Password updated',
			subheading: 'You can now sign in with your new password'
		}
	};
</script>

<svelte:head>
	<title>Reset password — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading={headings[step].heading} 
subheading={headings[step].subheading}
onBack={
		step === 'otp' ? () => goBackTo('identifier') :
		step === 'newPassword' ? () => (step = 'otp') :
		undefined
	}
	showBack={step === 'otp' || step === 'newPassword'}>
	{#if step === 'identifier'}
		<form class="flex flex-col gap-4" onsubmit={requestOtp}>
			<div class="flex flex-col gap-1.5">
				<Label for="identifier">Email or Matric Number</Label>
				<Input
					bind:this={identifierInputEl}
					bind:value={identifier}
					id="identifier"
					name="identifier"
					type="text"
					inputmode="email"
					autocapitalize="none"
					autocomplete="username"
					required
					autofocus
				/>
			</div>
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit" size="lg" class="mt-1 w-full">Send code</Button>
		</form>

		<p class="text-center text-xs text-muted-foreground">
			Remembered your password? <a href="/login" class="text-primary hover:underline">Sign in</a>
		</p>
	{:else if step === 'otp'}
		<form class="flex flex-col gap-5" onsubmit={verifyOtp}>
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-center gap-1.5">
					<button
						type="button"
						onclick={() => goBackTo('identifier')}
						class="inline-flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground"
						aria-label="Change email or matric number"
						title="Change email or matric number"
					>
						<ArrowLeft class="size-3.5" />
					</button>
					<span class="font-mono text-xs text-muted-foreground">Code sent to {maskedIdentifier}</span>
				</div>
				<InputOTP.Root maxlength={8} bind:value={otp} class="justify-center">
					{#snippet children({ cells }: { cells: Array<Record<string, unknown>> })}
						<InputOTP.Group>
							{#each cells.slice(0, 4) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group>
							{#each cells.slice(4, 8) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
			</div>
			{#if form?.error}
				<p class="text-center text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit" size="lg" class="mt-1 w-full">Verify code</Button>
		</form>

		<p class="text-center text-xs text-muted-foreground">
			{#if resendCooldown > 0}
				Resend code in {resendCooldown}s
			{:else}
				Didn't get a code?
				<button type="button" onclick={requestOtp} class="text-primary hover:underline">
					Resend
				</button>
			{/if}
		</p>
	{:else if step === 'newPassword'}
		<form class="flex flex-col gap-4" onsubmit={submitNewPassword}>
			<div class="flex flex-col gap-1.5">
				<Label for="newPassword">New password</Label>
				<Input
					bind:this={passwordInputEl}
					bind:value={newPassword}
					id="newPassword"
					name="newPassword"
					type="password"
					placeholder="••••••••"
					autocomplete="new-password"
					required
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="confirmPassword">Confirm new password</Label>
				<Input
					bind:value={confirmPassword}
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					placeholder="••••••••"
					autocomplete="new-password"
					required
				/>
			</div>
			{#if newPassword && confirmPassword && newPassword !== confirmPassword}
				<p class="text-sm text-destructive">Passwords do not match.</p>
			{/if}
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit" size="lg" class="mt-1 w-full">Update password</Button>
		</form>
	{:else if step === 'success'}
		<div class="flex flex-col items-center gap-4 py-2 text-center">
			<CheckCircle2 class="size-10 text-primary" />
			<p class="text-sm text-muted-foreground">
				Your password has been changed. Use it the next time you sign in.
			</p>
			<Button href="/login" size="lg" class="w-full">Back to sign in</Button>
		</div>
	{/if}
</AuthShell>