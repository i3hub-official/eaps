<!-- src/routes/staff/onboarding/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import Building2 from '@lucide/svelte/icons/building-2'
	import Loader from '@lucide/svelte/icons/loader'

	interface InvitationData {
		id: string
		email: string
		college: string
		department: string
		levels: string[]
	}

	let token = $state<string | null>(null)
	let error = $state<string | null>(null)
	let isVerifying = $state(false)
	let invitation = $state<InvitationData | null>(null)
	let isSubmitting = $state(false)

	onMount(() => {
		// Extract token from URL hash (client-side only, never sent to server in URL)
		const hash = window.location.hash.slice(1) // Remove leading #
		const params = new URLSearchParams(hash)
		token = params.get('token')

		if (!token) {
			error = 'No invitation token found. Please check your email for the complete link.'
			return
		}

		// Clear hash from address bar for security
		// This removes the token from browser history, referrer headers, etc.
		window.history.replaceState(null, '', window.location.pathname)

		// Immediately verify token
		verifyToken()
	})

	async function verifyToken() {
		if (!token) return

		isVerifying = true
		error = null

		try {
			const response = await fetch('/api/staff/invitations/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }), // Token in body, not URL
			})

			const result = await response.json()

			if (!response.ok) {
				error = result.error || 'Invalid or expired invitation'
				return
			}

			invitation = result.invitation
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred while verifying your invitation'
		} finally {
			isVerifying = false
		}
	}

	async function handleProceed() {
		if (!token || !invitation) return

		isSubmitting = true
		error = null

		try {
			// Store token in sessionStorage (cleared when tab closes)
			// This is only temporary — for the profile setup page
			sessionStorage.setItem('staff_onboarding_token', token)
			sessionStorage.setItem('staff_invitation_id', invitation.id)

			// Redirect to profile setup
			await goto('/staff/onboarding/profile')
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
			isSubmitting = false
		}
	}
</script>

<svelte:head>
	<title>Staff Onboarding — MOUAU e-Test</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center">
				<div class="flex size-12 items-center justify-center rounded-lg bg-primary/10">
					<Building2 class="size-6 text-primary" />
				</div>
			</div>
			<h1 class="text-3xl font-bold">Staff Onboarding</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Complete your profile to start using MOUAU e-Test
			</p>
		</div>

		<!-- Loading State -->
		{#if isVerifying}
			<Card>
				<CardContent class="flex flex-col items-center justify-center gap-4 py-12">
					<Loader class="size-8 animate-spin text-primary" />
					<p class="text-sm text-muted-foreground">Verifying your invitation...</p>
				</CardContent>
			</Card>
		{:else if error}
			<!-- Error State -->
			<Card class="border-destructive/50 bg-destructive/5">
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-destructive">
						<AlertCircle class="size-5" />
						Invitation Invalid
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<p class="text-sm text-destructive">{error}</p>
					<div class="space-y-2">
						<p class="text-xs font-medium text-muted-foreground">What to do:</p>
						<ul class="list-inside list-disc space-y-1 text-xs text-muted-foreground">
							<li>Check your email for a fresh invitation link</li>
							<li>Make sure you're using the complete link with the token</li>
							<li>Links expire after 7 days — request a new one if needed</li>
							<li>Contact your department HOD if the problem persists</li>
						</ul>
					</div>
					<Button href="/auth/login" variant="outline" class="w-full">
						Back to Login
					</Button>
				</CardContent>
			</Card>
		{:else if invitation}
			<!-- Invitation Confirmed -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<CheckCircle2 class="size-5 text-green-600" />
						Invitation Verified
					</CardTitle>
					<CardDescription>
						Your invitation is valid. Proceed to complete your profile.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-5">
					<!-- Invitation Details -->
					<div class="space-y-3 rounded-lg bg-muted/50 p-4">
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Email
							</p>
							<p class="mt-1 text-sm font-mono">{invitation.email}</p>
						</div>
						<div class="flex gap-4">
							<div class="flex-1">
								<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									College
								</p>
								<p class="mt-1 text-sm font-medium">{invitation.college}</p>
							</div>
							<div class="flex-1">
								<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Department
								</p>
								<p class="mt-1 text-sm font-medium">{invitation.department}</p>
							</div>
						</div>
						{#if invitation.levels.length > 0}
							<div>
								<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Assigned Levels
								</p>
								<div class="mt-2 flex flex-wrap gap-2">
									{#each invitation.levels as level}
										<Badge variant="secondary" class="font-normal">
											Level {level}
										</Badge>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Security Note -->
					<div
						class="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-400"
					>
						<p class="font-medium mb-1">🔒 Secure Onboarding</p>
						<p>
							Your invitation token has been verified securely. You'll now set your password
							and complete your profile.
						</p>
					</div>

					<!-- Action Button -->
					<Button
						onclick={handleProceed}
						disabled={isSubmitting}
						class="w-full text-base"
						size="lg"
					>
						{#if isSubmitting}
							<Loader class="mr-2 size-4 animate-spin" />
							Proceeding…
						{:else}
							Continue to Profile Setup
						{/if}
					</Button>
				</CardContent>
			</Card>
		{:else}
			<!-- Waiting for verification -->
			<Card>
				<CardContent class="flex flex-col items-center justify-center gap-4 py-12">
					<Loader class="size-8 animate-spin text-primary" />
					<p class="text-sm text-muted-foreground">Loading invitation...</p>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>