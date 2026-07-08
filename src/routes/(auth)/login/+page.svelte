<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Fingerprint from '@lucide/svelte/icons/fingerprint';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { enhance } from '$app/forms';

	let { form } = $props();
	let errorVisible = $state(true);

	type Step = 'identifier' | 'password';

	// If the last submit failed, the server echoed `identifier` back and we
	// land straight on the password step with the error visible — otherwise
	// a failed login silently resets to step 1 with no explanation and the
	// student has to retype everything from scratch.
	let step = $state<Step>(form?.error ? 'password' : 'identifier');
	let identifier = $state(form?.identifier ?? '');
	let password = $state('');
	let identifierInputEl = $state<HTMLInputElement | null>(null);
	let passwordInputEl = $state<HTMLInputElement | null>(null);
	let showPassword = $state(false);

	let isEmail = $derived(identifier.includes('@'));

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

		if (trimmed.length <= 6) return trimmed;
		const head = trimmed.slice(0, Math.min(6, trimmed.length - 2));
		const tail = trimmed.slice(-2);
		const maskedLen = Math.max(trimmed.length - head.length - tail.length, 2);
		return `${head}${'•'.repeat(maskedLen)}${tail}`;
	}

	let maskedIdentifier = $derived(maskIdentifier(identifier));

	function handleInputFocus() {
		errorVisible = false;
		// Clear form errors when user focuses on any input
		if (form?.error) {
			form.error = '';
		}
	}

	function goToPassword(e: Event) {
		e.preventDefault();
		if (!identifier.trim()) return;
		step = 'password';
		errorVisible = true;
		showPassword = false;
		queueMicrotask(() => passwordInputEl?.focus());
	}

	function goBack() {
		// Clear everything when going back
		step = 'identifier';
		identifier = '';
		password = '';
		showPassword = false;
		errorVisible = true;
		// Clear any form errors
		if (form?.error) {
			form.error = '';
		}
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
	<!-- Rendered above both steps so a failed submit is always visible,
	     regardless of which step the error landed us on. -->
	{#if form?.error && errorVisible}
		<div
			class="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	{#if step === 'identifier'}
		<form class="flex flex-col gap-6" onsubmit={goToPassword}>
			<div class="flex flex-col gap-5">
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
					placeholder=""
					required
					autofocus
					class="h-11 text-base"
					onfocus={handleInputFocus}
				/>
			</div>
			<Button type="submit" size="lg" class="h-12 w-full text-base">Continue</Button>
		</form>

		<div class="flex items-center gap-5">
			<Separator class="flex-1" />
			<span class="text-xs text-muted-foreground">or</span>
			<Separator class="flex-1" />
		</div>

		<Button variant="outline" size="lg" class="h-12 w-full text-base">
			<Fingerprint class="size-4" />
			Sign in with passkey
		</Button>

		<p class="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
			<Fingerprint class="size-3.5 shrink-0" />
			This device will be fingerprinted for exam-integrity purposes on first sign-in.
		</p>
		<p class="text-center text-sm text-muted-foreground">
			Don't have an account? <a href="/register" class="text-primary hover:underline">Register</a>
		</p>
	{:else}
		<form method="POST" action="?/login" class="flex flex-col gap-6" use:enhance>
			<input type="hidden" name="identifier" value={identifier} />

			<div class="flex flex-col gap-5">
				<div class="flex items-center justify-between">
					<Label for="password" class="flex items-center gap-1.5 text-sm font-semibold">
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
				<div class="relative">
					<Input
						bind:this={passwordInputEl}
						bind:value={password}
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						placeholder="••••••••"
						autocomplete="current-password"
						required
						class="h-11 pr-12 text-base"
						onfocus={handleInputFocus}
					/>
					<button
						type="button"
						onclick={() => (showPassword = !showPassword)}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
					>
						{#if showPassword}
							<EyeOff class="size-4.5" />
						{:else}
							<Eye class="size-4.5" />
						{/if}
					</button>
				</div>
			</div>

			<Button type="submit" size="lg" class="h-12 w-full text-base">Sign in</Button>
		</form>

		<p class="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
			<Fingerprint class="size-3.5 shrink-0" />
			This device will be fingerprinted for exam-integrity purposes on first sign-in.
		</p>
	{/if}
</AuthShell>