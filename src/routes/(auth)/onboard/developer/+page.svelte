<!-- src/routes/(auth)/onboard/developer/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import Eye from '@lucide/svelte/icons/eye'
	import EyeOff from '@lucide/svelte/icons/eye-off'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import Loader from '@lucide/svelte/icons/loader'
	import Shield from '@lucide/svelte/icons/shield'
	import type { ActionData } from './$types'

	let { form }: { form: ActionData } = $props()

	let token = $state<string | null>(null)
	let invitation = $state<any>(null)
	let isVerifying = $state(false)
	let error = $state<string | null>(null)
	let isSubmitting = $state(false)
	let showPassword = $state(false)
	let showConfirm = $state(false)

	// Form state
	let formData = $state({
		firstName: '',
		lastName: '',
		phoneNumber: '',
		password: '',
		confirmPassword: '',
	})

	let errors = $state<Record<string, string>>({})

	// Derived states
	let passwordsMatch = $derived(
		formData.password &&
		formData.confirmPassword &&
		formData.password === formData.confirmPassword
	)

	let passwordStrength = $derived.by(() => {
		const pwd = formData.password
		if (!pwd) return { level: 0, label: '', color: 'bg-gray-300' }

		let strength = 0
		if (pwd.length >= 8) strength++
		if (pwd.length >= 12) strength++
		if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++
		if (/[0-9]/.test(pwd)) strength++
		if (/[^A-Za-z0-9]/.test(pwd)) strength++

		return {
			level: Math.min(strength, 5),
			label: ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][Math.min(strength, 5)] || '',
			color:
				strength <= 1
					? 'bg-red-500'
					: strength === 2
						? 'bg-orange-500'
						: strength === 3
							? 'bg-yellow-500'
							: strength === 4
								? 'bg-blue-500'
								: 'bg-green-500',
		}
	})

	let isFormValid = $derived(
		formData.firstName.trim() &&
		formData.lastName.trim() &&
		formData.phoneNumber.trim() &&
		passwordsMatch &&
		passwordStrength.level >= 3 &&
		!isSubmitting
	)

	onMount(() => {
		// Extract token from URL
		const params = new URLSearchParams(window.location.search)
		token = params.get('token')

		if (!token) {
			error = 'No invitation token found. Please check your email for the complete link.'
			return
		}

		// Clear token from URL
		window.history.replaceState(null, '', window.location.pathname)

		// Verify token
		verifyToken()
	})

	async function verifyToken() {
		if (!token) return

		isVerifying = true
		error = null

		try {
			const response = await fetch('/api/developer/invitations/verify', {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ token }),
			})

			if (!response.ok) {
				let errorMessage = `Server returned ${response.status}`
				try {
					const errorData = await response.json()
					errorMessage = errorData.error || errorMessage
				} catch (e) {
					const text = await response.text()
					console.error('Non-JSON response:', text)
					errorMessage = `Server error (${response.status}). Please try again later.`
				}
				throw new Error(errorMessage)
			}

			const result = await response.json()

			if (!result.invitation) {
				throw new Error('No invitation data received')
			}

			invitation = result.invitation
		} catch (err) {
			console.error('Verification error:', err)
			error = err instanceof Error ? err.message : 'An error occurred while verifying your invitation.'
		} finally {
			isVerifying = false
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		// Client-side validation
		errors = {}

		if (!formData.firstName.trim() || formData.firstName.length < 2) {
			errors.firstName = 'First name must be at least 2 characters'
		}
		if (!formData.lastName.trim() || formData.lastName.length < 2) {
			errors.lastName = 'Last name must be at least 2 characters'
		}
		if (!formData.phoneNumber.trim() || formData.phoneNumber.length < 10) {
			errors.phoneNumber = 'Phone number must be at least 10 digits'
		}
		if (!formData.password) {
			errors.password = 'Password is required'
		}
		if (passwordStrength.level < 3) {
			errors.password = 'Password is too weak'
		}
		if (!passwordsMatch) {
			errors.confirmPassword = 'Passwords do not match'
		}

		if (Object.keys(errors).length > 0) {
			return
		}

		isSubmitting = true
	}
</script>

<svelte:head>
	<title>Developer Onboarding — MOUAU e-Test</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center">
				<div class="flex size-12 items-center justify-center rounded-lg bg-primary/10">
					<Shield class="size-6 text-primary" />
				</div>
			</div>
			<h1 class="text-3xl font-bold">Developer Onboarding</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Join the MOUAU e-Test development team
			</p>
		</div>

		{#if isVerifying}
			<!-- ─── Verifying ───────────────────────────────────────────── -->
			<Card>
				<CardContent class="flex flex-col items-center justify-center gap-4 py-12">
					<Loader class="size-8 animate-spin text-primary" />
					<p class="text-sm text-muted-foreground">Verifying your invitation...</p>
				</CardContent>
			</Card>
		{:else if error}
			<!-- ─── Error ─────────────────────────────────────────────────── -->
			<Card class="border-destructive/50 bg-destructive/5">
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-destructive">
						<AlertCircle class="size-5" />
						Invalid Invitation
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<p class="text-sm text-destructive">{error}</p>
					<div class="space-y-2">
						<p class="text-xs font-medium text-muted-foreground">What to do:</p>
						<ul class="list-inside list-disc space-y-1 text-xs text-muted-foreground">
							<li>Check your email for a fresh invitation link</li>
							<li>Make sure you're using the complete link with the token</li>
							<li>Links expire after 7 days — request a new one</li>
							<li>Contact the system administrator if the problem persists</li>
						</ul>
					</div>
					<div class="flex gap-2">
						<Button href="/auth/login" variant="outline" class="flex-1">
							Back to Login
						</Button>
						<Button onclick={() => { error = null; verifyToken(); }} variant="default" class="flex-1">
							Try Again
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else if form?.success}
			<!-- ─── Success ──────────────────────────────────────────────── -->
			<Card class="border-green-500/30 bg-green-500/5">
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-green-700 dark:text-green-400">
						<CheckCircle2 class="size-5" />
						Account Activated!
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<p class="text-sm text-green-700/90 dark:text-green-400/90">
						Your developer account has been activated. You can now log in with your credentials.
					</p>
					<Button href="/auth/login" class="w-full">
						Go to Login
					</Button>
				</CardContent>
			</Card>
		{:else if invitation}
			<!-- ─── Invitation Details ──────────────────────────────────── -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<CheckCircle2 class="size-5 text-green-600" />
						Invitation Verified
					</CardTitle>
					<CardDescription>
						Complete your profile to join the development team
					</CardDescription>
				</CardHeader>
				<CardContent>
					<!-- Invitation Details -->
					<div class="space-y-3 rounded-lg bg-muted/50 p-4 mb-6">
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Email
							</p>
							<p class="mt-1 text-sm font-mono">{invitation.email}</p>
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Role
							</p>
							<Badge class="mt-1">{invitation.role}</Badge>
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Permissions
							</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#if invitation.permissions && invitation.permissions.length > 0}
									{#each invitation.permissions as perm}
										<Badge variant="outline" class="font-normal">
											{perm.replace(/_/g, ' ')}
										</Badge>
									{/each}
								{:else}
									<span class="text-sm text-muted-foreground">No permissions assigned</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Form -->
					<form method="POST" action="?/setup" use:enhance onsubmit={handleSubmit} class="space-y-4">
						{#if form?.error}
							<Alert variant="destructive">
								<AlertCircle class="size-4" />
								<AlertDescription>{form.error}</AlertDescription>
							</Alert>
						{/if}

						<!-- First Name -->
						<div class="space-y-2">
							<Label for="firstName">First Name *</Label>
							<Input
								id="firstName"
								name="firstName"
								type="text"
								placeholder="John"
								bind:value={formData.firstName}
								class={errors.firstName ? 'border-destructive' : ''}
							/>
							{#if errors.firstName}
								<p class="text-xs text-destructive">{errors.firstName}</p>
							{/if}
						</div>

						<!-- Last Name -->
						<div class="space-y-2">
							<Label for="lastName">Last Name *</Label>
							<Input
								id="lastName"
								name="lastName"
								type="text"
								placeholder="Doe"
								bind:value={formData.lastName}
								class={errors.lastName ? 'border-destructive' : ''}
							/>
							{#if errors.lastName}
								<p class="text-xs text-destructive">{errors.lastName}</p>
							{/if}
						</div>

						<!-- Phone Number -->
						<div class="space-y-2">
							<Label for="phoneNumber">Phone Number *</Label>
							<Input
								id="phoneNumber"
								name="phoneNumber"
								type="tel"
								placeholder="+234 901 234 5678"
								bind:value={formData.phoneNumber}
								class={errors.phoneNumber ? 'border-destructive' : ''}
							/>
							{#if errors.phoneNumber}
								<p class="text-xs text-destructive">{errors.phoneNumber}</p>
							{/if}
						</div>

						<!-- Password -->
						<div class="space-y-2">
							<Label for="password">Password *</Label>
							<div class="relative">
								<Input
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter a strong password"
									bind:value={formData.password}
									class={errors.password ? 'border-destructive' : ''}
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{#if showPassword}
										<EyeOff class="size-4" />
									{:else}
										<Eye class="size-4" />
									{/if}
								</button>
							</div>

							{#if formData.password}
								<div class="space-y-1">
									<div class="flex h-2 gap-1 rounded-full bg-muted overflow-hidden">
										{#each Array(5) as _, i}
											<div
												class="flex-1 transition-colors {i < passwordStrength.level
													? passwordStrength.color
													: 'bg-gray-300'}"
											/>
										{/each}
									</div>
									<p class="text-xs font-medium {passwordStrength.color === 'bg-red-500' ||
									passwordStrength.color === 'bg-orange-500'
										? 'text-destructive'
										: 'text-muted-foreground'}">
										Strength: {passwordStrength.label}
									</p>
								</div>
								<p class="text-xs text-muted-foreground">
									Use at least 8 characters with uppercase, lowercase, numbers, and symbols.
								</p>
							{/if}

							{#if errors.password}
								<p class="text-xs text-destructive">{errors.password}</p>
							{/if}
						</div>

						<!-- Confirm Password -->
						<div class="space-y-2">
							<Label for="confirmPassword">Confirm Password *</Label>
							<div class="relative">
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type={showConfirm ? 'text' : 'password'}
									placeholder="Re-enter your password"
									bind:value={formData.confirmPassword}
									class={errors.confirmPassword ? 'border-destructive' : ''}
								/>
								<button
									type="button"
									onclick={() => (showConfirm = !showConfirm)}
									class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={showConfirm ? 'Hide password' : 'Show password'}
								>
									{#if showConfirm}
										<EyeOff class="size-4" />
									{:else}
										<Eye class="size-4" />
									{/if}
								</button>
							</div>
							{#if formData.confirmPassword && !passwordsMatch}
								<p class="text-xs text-destructive">Passwords do not match</p>
							{/if}
							{#if errors.confirmPassword}
								<p class="text-xs text-destructive">{errors.confirmPassword}</p>
							{/if}
						</div>

						<!-- Hidden token -->
						<input type="hidden" name="token" value={token || ''} />

						<!-- Submit -->
						<Button
							type="submit"
							class="w-full text-base"
							size="lg"
							disabled={!isFormValid}
						>
							{#if isSubmitting}
								<Loader class="mr-2 size-4 animate-spin" />
								Creating Account…
							{:else}
								Create Account
							{/if}
						</Button>

						<!-- Terms -->
						<p class="text-center text-xs text-muted-foreground">
							By creating your account, you agree to our
							<a href="#" class="underline hover:text-foreground">Terms of Service</a>
							and
							<a href="#" class="underline hover:text-foreground">Privacy Policy</a>.
						</p>
					</form>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>