<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Fingerprint from '@lucide/svelte/icons/fingerprint';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { form } = $props();

	type Step = 'identifier' | 'password';

	let step = $state<Step>('identifier');
	let identifier = $state('');
	let password = $state('');
	let identifierInputEl = $state<HTMLInputElement | null>(null);
	let passwordInputEl = $state<HTMLInputElement | null>(null);

	let isEmail = $derived(identifier.includes('@'));

	// Partially mask the email or matric number for display as the
	// label above the password field — enough to confirm identity,
	// not enough to leak the full value to a shoulder-surfer.
	function maskIdentifier(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return '';

		if (isEmail) {
			const [local, domain] = trimmed.split('@');
			if (!domain) return trimmed;
			const visible = local.slice(0, 2);
			const masked = visible + '•'.repeat(Math.max(local.length - 2, 1));
			return `${masked}@${domain}`;
		}

		// Matric number — keep the leading year/prefix and a short tail,
		// mask the middle block. e.g. MOUAU/PHY/25/123456 -> MOUAU/PHY/25/1••••56
		if (trimmed.length <= 6) return trimmed;
		const head = trimmed.slice(0, Math.min(6, trimmed.length - 2));
		const tail = trimmed.slice(-2);
		const maskedLen = Math.max(trimmed.length - head.length - tail.length, 2);
		return `${head}${'•'.repeat(maskedLen)}${tail}`;
	}

	let maskedIdentifier = $derived(maskIdentifier(identifier));

	function goToPassword(e: Event) {
		e.preventDefault();
		if (!identifier.trim()) return;
		step = 'password';
		// focus password field once it mounts
		queueMicrotask(() => passwordInputEl?.focus());
	}

	function goBack() {
		step = 'identifier';
		password = '';
		queueMicrotask(() => identifierInputEl?.focus());
	}
</script>

<svelte:head>
	<title>Sign in — MOUAU e-Test</title>
</svelte:head>

<AuthShell
	heading="Sign in to your account"
	subheading={step === 'identifier'
		? 'Enter your university email or matric number'
		: 'Enter your password to continue'}
			showBack={false}

>
	{#if step === 'identifier'}
		<form class="flex flex-col gap-4" onsubmit={goToPassword}>
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
					placeholder=""
					required
					autofocus
				/>
			</div>
			<Button type="submit" size="lg" class="mt-1 w-full">Continue</Button>
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
	{:else}
		<form method="POST" class="flex flex-col gap-4">
			<input type="hidden" name="identifier" value={identifier} />

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<Label for="password" class="flex items-center gap-1.5">
						<button
							type="button"
							onclick={goBack}
							class="inline-flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground"
							aria-label="Change email or matric number"
							title="Change email or matric number"
						>
							<ArrowLeft class="size-3.5" />
						</button>
						<span class="font-mono text-xs text-muted-foreground">{maskedIdentifier}</span>
					</Label>
					<a href="/forgot" class="text-xs text-primary hover:underline">Forgot password?</a>
				</div>
				<Input
					bind:this={passwordInputEl}
					bind:value={password}
					id="password"
					name="password"
					type="password"
					placeholder="••••••••"
					autocomplete="current-password"
					required
				/>
			</div>

			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<Button type="submit" size="lg" class="mt-1 w-full">Sign in</Button>
		</form>

		<p class="text-center text-xs text-muted-foreground">
			This device will be fingerprinted for exam-integrity purposes on first sign-in.
		</p>
	{/if}
</AuthShell>