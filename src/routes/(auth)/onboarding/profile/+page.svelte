<!-- src/routes/onboarding/profile/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import Eye from '@lucide/svelte/icons/eye'
	import EyeOff from '@lucide/svelte/icons/eye-off'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import Loader from '@lucide/svelte/icons/loader'
	import type { ActionData } from './$types'

	let { form, data }: { form: ActionData; data: any } = $props()

	let isSubmitting = $state(false)
	let showPassword = $state(false)
	let showConfirm = $state(false)
	let sessionExpired = $state(false)

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
		// Check if token and invitation ID exist in sessionStorage
		const token = sessionStorage.getItem('staff_onboarding_token')
		const invitationId = sessionStorage.getItem('staff_invitation_id')

		if (!token || !invitationId) {
			sessionExpired = true
		}
	})

	async function handleSubmit(e: SubmitEvent) {
		const form = e.target as HTMLFormElement

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
	<title>Complete Your Profile — Staff Onboarding</title>
</svelte:head>

{#if sessionExpired}
	<!-- Session Expired -->
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card class="w-full max-w-md border-destructive/50 bg-destructive/5">
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-destructive">
					<AlertCircle class="size-5" />
					Session Expired
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-destructive">
					Your onboarding session has expired. This happens if you navigate away or the tab is closed.
				</p>
				<p class="text-sm text-muted-foreground">
					Please check your email for a new invitation link to start over.
				</p>
				<Button href="/auth/login" class="w-full" variant="outline">
					Back to Login
				</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
		<div class="w-full max-w-md">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold">Complete Your Profile</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Set your password and basic information
				</p>
			</div>

			{#if form?.error}
				<Card class="mb-6 border-destructive/50 bg-destructive/5">
					<CardContent class="flex gap-3 pt-6">
						<AlertCircle class="size-5 shrink-0 text-destructive" />
						<div>
							<p class="text-sm font-medium text-destructive">{form.error}</p>
							{#if form.details}
								<p class="mt-1 text-xs text-destructive/80">{form.details}</p>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/if}

			{#if form?.success}
				<!-- Success State -->
				<Card class="border-green-500/30 bg-green-500/5">
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-green-700 dark:text-green-400">
							<CheckCircle2 class="size-5" />
							Profile Complete!
						</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<p class="text-sm text-green-700/90 dark:text-green-400/90">
							Your account has been activated. You can now log in with your credentials.
						</p>
						<Button
							href="/auth/login"
							class="w-full"
							onclick={() => {
								sessionStorage.removeItem('staff_onboarding_token')
								sessionStorage.removeItem('staff_invitation_id')
							}}
						>
							Go to Login
						</Button>
					</CardContent>
				</Card>
			{:else}
				<!-- Setup Form -->
				<Card>
					<CardHeader>
						<CardTitle>Account Setup</CardTitle>
						<CardDescription>Secure password and personal information</CardDescription>
					</CardHeader>
					<CardContent>
						<form method="POST" action="?/setup" use:enhance onsubmit={handleSubmit} class="space-y-5">
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
									required
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
									required
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
									required
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
										required
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
										<p
											class="text-xs font-medium {passwordStrength.color === 'bg-red-500' ||
											passwordStrength.color === 'bg-orange-500'
												? 'text-destructive'
												: 'text-muted-foreground'}"
										>
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
										required
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

							<!-- Hidden token field -->
							<input
								type="hidden"
								name="token"
								value={sessionStorage.getItem('staff_onboarding_token') || ''}
							/>

							<!-- Submit Button -->
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
{/if}