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
	let submitting = $state(false);

	type Step = 'identifier' | 'password';

	let step = $state<Step>(form?.error ? 'password' : 'identifier');
	let identifier = $state(form?.identifier ?? '');
	let password = $state('');
	let identifierInputEl = $state<HTMLInputElement | null>(null);
	let passwordInputEl = $state<HTMLInputElement | null>(null);
	let showPassword = $state(false);

	function maskIdentifier(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return '';

		const [local, domain] = trimmed.split('@');
		if (!domain) return trimmed;
		const visible = local.slice(0, 2);
		const masked = visible + '•'.repeat(Math.max(local.length - 2, 1));
		return `${masked}@${domain}`;
	}

	let maskedIdentifier = $derived(maskIdentifier(identifier));

	function handleInputFocus() {
		errorVisible = false;
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
		step = 'identifier';
		identifier = '';
		password = '';
		showPassword = false;
		errorVisible = true;
		if (form?.error) {
			form.error = '';
		}
		queueMicrotask(() => identifierInputEl?.focus());
	}

	function handleLoginSubmit() {
		submitting = true;
		return async ({ result, update }: { result: { type: string }; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			submitting = false;

			if (result.type === 'failure') {
				password = '';
				errorVisible = true;
				step = 'password';
				queueMicrotask(() => passwordInputEl?.focus());
			}
		};
	}
</script>

<svelte:head>
	<title>Sign in — MOUAU e-Test</title>
</svelte:head>

<AuthShell
	heading="Sign in to your account"
	subheading={step === 'identifier'
		? 'Enter your university email'
		: 'Enter your password to continue'}
	showBack={false}
>
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
				<Label for="identifier" class="text-sm font-semibold">e-Mail Address</Label>
				<Input
					bind:this={identifierInputEl}
					bind:value={identifier}
					id="identifier"
					name="identifier"
					type="email"
					inputmode="email"
					autocapitalize="none"
					autocomplete="username"
					placeholder="you@student.mouau.edu.ng"
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
		<form method="POST" class="flex flex-col gap-6" use:enhance={handleLoginSubmit}>
			<input type="hidden" name="identifier" value={identifier} />

			<div class="flex flex-col gap-5">
				<div class="flex items-center justify-between">
					<Label for="password" class="flex items-center gap-1.5 text-sm font-semibold">
						<button
							type="button"
							onclick={goBack}
							class="inline-flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground"
							aria-label="Change email"
							title="Change email"
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
						autofocus
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

			<Button type="submit" size="lg" class="h-12 w-full text-base" disabled={submitting}>
				{submitting ? 'Signing in…' : 'Sign in'}
			</Button>
		</form>

		<p class="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
			<Fingerprint class="size-3.5 shrink-0" />
			This device will be fingerprinted for exam-integrity purposes on first sign-in.
		</p>
	{/if}
</AuthShell>