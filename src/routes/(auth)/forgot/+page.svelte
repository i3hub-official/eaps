<!-- src/routes/(auth)/forgot-password/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import { enhance } from '$app/forms';

	let { form } = $props();

	type Step = 'identifier' | 'otp' | 'newPassword' | 'success';

	let step = $state<Step>(form?.step ?? 'identifier');
	let identifier = $state(form?.identifier ?? '');
	let otp = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let resendCooldown = $state(0);
	let errorMessage = $state(form?.error ?? '');
	let successMessage = $state(form?.message ?? '');

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

	async function handleRequestOtp(formData: FormData) {
		// Reset messages
		errorMessage = '';
		successMessage = '';
		
		// After successful request, start cooldown
		if (form?.step === 'otp') {
			startCooldown();
			step = 'otp';
			identifier = form?.identifier ?? identifier;
			successMessage = form?.message ?? '';
		}
	}

	async function handleVerifyOtp(formData: FormData) {
		errorMessage = '';
		successMessage = '';
		
		if (form?.step === 'newPassword') {
			step = 'newPassword';
			// Store user info for password reset
			// These will be passed as hidden fields in the next form
			successMessage = form?.message ?? '';
		}
	}

	async function handleSetPassword(formData: FormData) {
		errorMessage = '';
		successMessage = '';
		
		if (form?.step === 'success') {
			step = 'success';
			successMessage = form?.message ?? '';
		}
	}

	async function handleResendOtp(formData: FormData) {
		errorMessage = '';
		successMessage = '';
		
		if (form?.success) {
			startCooldown();
			successMessage = form?.message ?? '';
		}
	}

	function goBackTo(target: Step) {
		step = target;
		errorMessage = '';
		successMessage = '';
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
			subheading: 'Enter the 6-character code we sent you'
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

<AuthShell 
	heading={headings[step].heading} 
	subheading={headings[step].subheading}
	onBack={
		step === 'otp' ? () => goBackTo('identifier') :
		step === 'newPassword' ? () => goBackTo('otp') :
		undefined
	}
	showBack={step === 'otp' || step === 'newPassword'}
>
	{#if errorMessage}
		<div class="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="mb-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary" role="alert">
			<CheckCircle2 class="mt-0.5 size-4 shrink-0" />
			<span>{successMessage}</span>
		</div>
	{/if}

	{#if step === 'identifier'}
		<form 
			class="flex flex-col gap-6" 
			action="?/requestOtp" 
			method="POST" 
			use:enhance
		>
			<div class="flex flex-col gap-3">
				<Label for="identifier" class="text-sm font-semibold">Email or Matric Number</Label>
				<Input
					bind:this={identifierInputEl}
					bind:value={identifier}
					id="identifier"
					name="identifier"
					type="text"
					inputmode="email"
					autocapitalize="none"
					autocomplete="username"
					placeholder="you@student.mouau.edu.ng or MOUAU/PHY/25/001002"
					required
					autofocus
					class="h-11 text-base"
				/>
			</div>
			<Button type="submit" size="lg" class="h-12 w-full text-base">Send Code</Button>
		</form>

		<p class="text-center text-sm text-muted-foreground">
			Remembered your password? <a href="/login" class="text-primary hover:underline">Sign in</a>
		</p>
	{:else if step === 'otp'}
		<form 
			class="flex flex-col gap-6" 
			action="?/verifyOtp" 
			method="POST" 
			use:enhance
			onsubmit={(e) => {
				// Ensure OTP is at least 6 characters
				if (otp.trim().length < 6) {
					e.preventDefault();
					errorMessage = 'Please enter the complete 6-character verification code.';
				}
			}}
		>
			<input type="hidden" name="identifier" value={identifier} />
			
			<div class="flex flex-col gap-3">
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
				<InputOTP.Root 
					maxlength={6} 
					bind:value={otp} 
					name="otp"
					class="justify-center"
				>
					{#snippet children({ cells }: { cells: Array<Record<string, unknown>> })}
						<InputOTP.Group>
							{#each cells.slice(0, 3) as cell (cell)}
								<InputOTP.Slot {cell} class="h-14 w-14 text-lg" />
							{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group>
							{#each cells.slice(3, 6) as cell (cell)}
								<InputOTP.Slot {cell} class="h-14 w-14 text-lg" />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
				<p class="text-center text-xs text-muted-foreground">Enter the 6-character code from your email</p>
			</div>
			<Button type="submit" size="lg" class="h-12 w-full text-base">Verify Code</Button>
		</form>

		<p class="text-center text-sm text-muted-foreground">
			{#if resendCooldown > 0}
				Resend code in {resendCooldown}s
			{:else}
				Didn't get a code?
				<form action="?/resendOtp" method="POST" class="inline" use:enhance>
					<input type="hidden" name="identifier" value={identifier} />
					<button type="submit" class="text-primary hover:underline">
						Resend
					</button>
				</form>
			{/if}
		</p>
	{:else if step === 'newPassword'}
		<form 
			class="flex flex-col gap-6" 
			action="?/setPassword" 
			method="POST" 
			use:enhance
		>
			<input type="hidden" name="token" value={form?.token ?? ''} />
			<input type="hidden" name="userId" value={form?.userId ?? ''} />
			<input type="hidden" name="userType" value={form?.userType ?? ''} />
			
			<div class="flex flex-col gap-3">
				<Label for="newPassword" class="text-sm font-semibold">New Password</Label>
				<Input
					bind:this={passwordInputEl}
					bind:value={newPassword}
					id="newPassword"
					name="newPassword"
					type="password"
					placeholder="••••••••"
					autocomplete="new-password"
					required
					class="h-11 text-base"
				/>
				<p class="text-xs text-muted-foreground">Minimum 8 characters with uppercase, lowercase, number, and special character</p>
			</div>
			<div class="flex flex-col gap-3">
				<Label for="confirmPassword" class="text-sm font-semibold">Confirm New Password</Label>
				<Input
					bind:value={confirmPassword}
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					placeholder="••••••••"
					autocomplete="new-password"
					required
					class="h-11 text-base"
				/>
				{#if newPassword && confirmPassword && newPassword !== confirmPassword}
					<p class="text-sm text-destructive">Passwords do not match.</p>
				{/if}
			</div>
			<Button 
				type="submit" 
				size="lg" 
				class="h-12 w-full text-base"
				disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
			>
				Update Password
			</Button>
		</form>
	{:else if step === 'success'}
		<div class="flex flex-col items-center gap-6 py-4 text-center">
			<CheckCircle2 class="size-12 text-primary" />
			<div>
				<h3 class="text-lg font-semibold text-foreground">Password Updated!</h3>
				<p class="text-sm text-muted-foreground">
					Your password has been successfully changed. 
					You can now sign in with your new password.
				</p>
			</div>
			<Button href="/login" size="lg" class="h-12 w-full text-base">Back to Sign In</Button>
		</div>
	{/if}
</AuthShell>