<!-- src/routes/(auth)/register/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	let { form } = $props();

	type Step = 'details' | 'otp' | 'password' | 'success';

	let step = $state<Step>('details');

	let fullName = $state('');
	let matricNumber = $state('');
	let email = $state('');
	let otp = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let resendCooldown = $state(0);

	let nameInputEl = $state<HTMLInputElement | null>(null);
	let otpInputEl = $state<HTMLInputElement | null>(null);
	let passwordInputEl = $state<HTMLInputElement | null>(null);

	function maskedEmail(value: string): string {
		const trimmed = value.trim();
		const [local, domain] = trimmed.split('@');
		if (!domain) return trimmed;
		const visible = local.slice(0, 2);
		return `${visible}${'•'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
	}

	function startCooldown() {
		resendCooldown = 30;
		const interval = setInterval(() => {
			resendCooldown -= 1;
			if (resendCooldown <= 0) clearInterval(interval);
		}, 1000);
	}

	function submitDetails(e: Event) {
		e.preventDefault();
		if (!fullName.trim() || !matricNumber.trim() || !email.trim()) return;
		// TODO: call server action to validate matric number against departmental
		// records and send OTP to email
		step = 'otp';
		startCooldown();
		queueMicrotask(() => otpInputEl?.focus());
	}

	function verifyOtp(e: Event) {
		e.preventDefault();
		if (otp.trim().length < 6) return;
		// TODO: call server action to verify OTP
		step = 'password';
		queueMicrotask(() => passwordInputEl?.focus());
	}

	function submitPassword(e: Event) {
		e.preventDefault();
		if (!password || password !== confirmPassword) return;
		// TODO: call server action to create the account
		step = 'success';
	}

	function goBackTo(target: Step) {
		step = target;
		queueMicrotask(() => {
			if (target === 'details') nameInputEl?.focus();
			if (target === 'otp') otpInputEl?.focus();
		});
	}

	const headings: Record<Step, { heading: string; subheading: string }> = {
		details: {
			heading: 'Create your account',
			subheading: 'Register with your matric number and university email'
		},
		otp: {
			heading: 'Verify your email',
			subheading: 'Enter the 6-digit code we sent you'
		},
		password: {
			heading: 'Set a password',
			subheading: 'This will be used to sign in going forward'
		},
		success: {
			heading: 'Account created',
			subheading: 'You can now sign in'
		}
	};
</script>

<svelte:head>
	<title>Register — MOUAU e-Test</title>
</svelte:head>

<AuthShell heading={headings[step].heading} subheading={headings[step].subheading}>
	{#if step === 'details'}
		<form class="flex flex-col gap-4" onsubmit={submitDetails}>
			<div class="flex flex-col gap-1.5">
				<Label for="fullName">Full name</Label>
				<Input
					bind:this={nameInputEl}
					bind:value={fullName}
					id="fullName"
					name="fullName"
					type="text"
					autocomplete="name"
					required
					autofocus
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="matricNumber">Matric number</Label>
				<Input
					bind:value={matricNumber}
					id="matricNumber"
					name="matricNumber"
					type="text"
					autocapitalize="characters"
					required
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="email">University email</Label>
				<Input
					bind:value={email}
					id="email"
					name="email"
					type="email"
					placeholder="you@mouau.edu.ng"
					autocomplete="email"
					required
				/>
			</div>
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit" size="lg" class="mt-1 w-full">Continue</Button>
		</form>

		<p class="text-center text-xs text-muted-foreground">
			Already have an account? <a href="/login" class="text-primary hover:underline">Sign in</a>
		</p>
	{:else if step === 'otp'}
		<form class="flex flex-col gap-4" onsubmit={verifyOtp}>
			<div class="flex flex-col gap-1.5">
				<Label for="otp" class="flex items-center gap-1.5">
					<button
						type="button"
						onclick={() => goBackTo('details')}
						class="inline-flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground"
						aria-label="Change details"
						title="Change details"
					>
						<ArrowLeft class="size-3.5" />
					</button>
					<span class="font-mono text-xs text-muted-foreground">Code sent to {maskedEmail(email)}</span>
				</Label>
				<Input
					bind:this={otpInputEl}
					bind:value={otp}
					id="otp"
					name="otp"
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					maxlength={6}
					autocomplete="one-time-code"
					placeholder="000000"
					class="text-center font-mono text-lg tracking-[0.4em]"
					required
				/>
			</div>
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit" size="lg" class="mt-1 w-full">Verify email</Button>
		</form>

		<p class="text-center text-xs text-muted-foreground">
			{#if resendCooldown > 0}
				Resend code in {resendCooldown}s
			{:else}
				Didn't get a code?
				<button type="button" onclick={submitDetails} class="text-primary hover:underline">
					Resend
				</button>
			{/if}
		</p>
	{:else if step === 'password'}
		<form method="POST" class="flex flex-col gap-4" onsubmit={submitPassword}>
			<input type="hidden" name="fullName" value={fullName} />
			<input type="hidden" name="matricNumber" value={matricNumber} />
			<input type="hidden" name="email" value={email} />

			<div class="flex flex-col gap-1.5">
				<Label for="password">Password</Label>
				<Input
					bind:this={passwordInputEl}
					bind:value={password}
					id="password"
					name="password"
					type="password"
					placeholder="••••••••"
					autocomplete="new-password"
					required
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="confirmPassword">Confirm password</Label>
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
			{#if password && confirmPassword && password !== confirmPassword}
				<p class="text-sm text-destructive">Passwords do not match.</p>
			{/if}
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<Button type="submit" size="lg" class="mt-1 w-full">Create account</Button>
		</form>
	{:else if step === 'success'}
		<div class="flex flex-col items-center gap-4 py-2 text-center">
			<CheckCircle2 class="size-10 text-primary" />
			<p class="text-sm text-muted-foreground">
				Welcome to ASSESS. Your account is ready.
			</p>
			<Button href="/login" size="lg" class="w-full">Sign in</Button>
		</div>
	{/if}
</AuthShell>