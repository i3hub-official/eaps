<!-- src/lib/components/profile/profile-view.svelte -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import ScanFace from '@lucide/svelte/icons/scan-face';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import { toast } from 'svelte-sonner';
	import type { ProfileData } from '$lib/server/profile.js';
	import FaceEnrollModal from '$lib/components/exam/FaceEnrollModal.svelte';

	let { profile }: { profile: ProfileData } = $props();

	let phone = $state(profile.phone ?? '');
	let gender = $state(profile.gender ?? '');
	let savingPhone = $state(false);
	let savingGender = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let savingPassword = $state(false);

	let showFaceEnroll = $state(false);

	async function savePhone() {
		savingPhone = true;
		await toast
			.promise(
				fetch('/api/profile/phone', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ phone }),
				}).then((res) => {
					if (!res.ok) throw new Error('Failed to update phone number.');
				}),
				{
					loading: 'Saving…',
					success: 'Phone number updated.',
					error: (e) => (e instanceof Error ? e.message : 'Something went wrong.'),
				},
			)
			.unwrap()
			.finally(() => (savingPhone = false));
	}

	async function saveGender() {
		savingGender = true;
		await toast
			.promise(
				fetch('/api/profile/gender', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ gender }),
				}).then((res) => {
					if (!res.ok) throw new Error('Failed to update.');
				}),
				{ loading: 'Saving…', success: 'Updated.', error: 'Something went wrong.' },
			)
			.unwrap()
			.finally(() => (savingGender = false));
	}

	async function savePassword() {
		if (newPassword !== confirmPassword) {
			toast.error('New password and confirmation do not match.');
			return;
		}
		savingPassword = true;
		await toast
			.promise(
				fetch('/api/profile/password', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ currentPassword, newPassword }),
				}).then(async (res) => {
					if (!res.ok) {
						const body = await res.json().catch(() => ({}));
						throw new Error(body.message || 'Failed to change password.');
					}
				}),
				{
					loading: 'Updating password…',
					success: 'Password changed.',
					error: (e) => (e instanceof Error ? e.message : 'Something went wrong.'),
				},
			)
			.unwrap()
			.finally(() => {
				savingPassword = false;
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			});
	}
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
	{#if profile.mustChangePassword}
		<Alert.Root variant="destructive">
			<AlertTriangle class="size-4" />
			<Alert.Title>Password change required</Alert.Title>
			<Alert.Description>
				Your account was set up with a temporary password. Please set a new one below before
				continuing.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Identity header -->
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:text-left">
			<div
				class="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-lg font-semibold text-primary-foreground"
			>
				{profile.initials}
			</div>
			<div class="flex flex-col gap-1.5">
				<h2 class="text-xl font-semibold">{profile.fullName}</h2>
				<p class="text-sm text-muted-foreground">
					{profile.identifierLabel}: <span class="font-mono">{profile.identifier}</span>
				</p>
				<div class="flex flex-wrap justify-center gap-1.5 sm:justify-start">
					{#if profile.kind === 'staff'}
						{#if profile.primaryRoleLabel}
							<Badge>{profile.primaryRoleLabel}</Badge>
						{/if}
						{#each profile.capabilityRoles.filter((r) => r !== profile.primaryRoleLabel) as role (role)}
							<Badge variant="secondary">{role}</Badge>
						{/each}
					{:else}
						<Badge variant="secondary">Student</Badge>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Academic context — students only -->
	{#if profile.kind === 'student'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Academic details</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4 sm:grid-cols-2">
				<div class="grid gap-1.5">
					<Label>College</Label>
					<Input value={profile.college ?? '—'} disabled />
				</div>
				<div class="grid gap-1.5">
					<Label>Department</Label>
					<Input value={profile.department ?? '—'} disabled />
				</div>
				<div class="grid gap-1.5">
					<Label>Programme</Label>
					<Input value={profile.programme ?? '—'} disabled />
				</div>
				<div class="grid gap-1.5">
					<Label>Current level</Label>
					<Input value={profile.currentLevel ?? '—'} disabled />
				</div>
			</Card.Content>
		</Card.Root>
	{:else if profile.college || profile.department}
		<Card.Root>
			<Card.Header>
				<Card.Title>Assignment</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4 sm:grid-cols-2">
				{#if profile.college}
					<div class="grid gap-1.5">
						<Label>College</Label>
						<Input value={profile.college} disabled />
					</div>
				{/if}
				{#if profile.department}
					<div class="grid gap-1.5">
						<Label>Department</Label>
						<Input value={profile.department} disabled />
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Contact information -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Contact information</Card.Title>
			<Card.Description>
				Your institutional email can't be changed here — contact the registry if it needs
				updating.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="grid gap-1.5">
				<Label>Email</Label>
				<Input value={profile.email} disabled />
			</div>
			<div class="grid gap-1.5">
				<Label for="phone">Phone number</Label>
				<Input id="phone" bind:value={phone} placeholder="e.g. 080XXXXXXXX" />
			</div>
			<div class="grid gap-1.5">
				<Label for="gender">Gender</Label>
				<Select.Root type="single" bind:value={gender}>
					<Select.Trigger id="gender">{gender || 'Select…'}</Select.Trigger>
					<Select.Content>
						<Select.Item value="MALE">Male</Select.Item>
						<Select.Item value="FEMALE">Female</Select.Item>
						<Select.Item value="OTHER">Other</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
		<Card.Footer class="flex gap-2">
			<Button onclick={savePhone} disabled={savingPhone}>Save phone</Button>
			<Button variant="outline" onclick={saveGender} disabled={savingGender}>Save gender</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Face verification — students only -->
	{#if profile.kind === 'student'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Face verification</Card.Title>
				<Card.Description>Required before you can start a proctored exam.</Card.Description>
			</Card.Header>
			<Card.Content class="flex items-center justify-between gap-4">
				{#if profile.faceEnrolledAt}
					<div class="flex items-center gap-2 text-sm text-primary">
						<CheckCircle2 class="size-4" />
						Enrolled — you can re-enroll if your appearance has changed significantly.
					</div>
				{:else}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<ScanFace class="size-4" />
						Not yet enrolled.
					</div>
				{/if}
				<Button variant="outline" onclick={() => (showFaceEnroll = true)}>
					{profile.faceEnrolledAt ? 'Re-enroll' : 'Enroll now'}
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Security -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Security</Card.Title>
			<Card.Description>Change your password.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="grid gap-1.5">
				<Label for="current-password">Current password</Label>
				<Input id="current-password" type="password" bind:value={currentPassword} />
			</div>
			<Separator />
			<div class="grid gap-1.5">
				<Label for="new-password">New password</Label>
				<Input id="new-password" type="password" bind:value={newPassword} />
			</div>
			<div class="grid gap-1.5">
				<Label for="confirm-password">Confirm new password</Label>
				<Input id="confirm-password" type="password" bind:value={confirmPassword} />
			</div>
		</Card.Content>
		<Card.Footer>
			<Button onclick={savePassword} disabled={savingPassword}>Update password</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Appearance -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Appearance</Card.Title>
			<Card.Description>Choose light or dark mode.</Card.Description>
		</Card.Header>
		<Card.Content>
			<ThemeToggle />
		</Card.Content>
	</Card.Root>
</div>

{#if showFaceEnroll}
	<FaceEnrollModal
		onSuccess={() => (showFaceEnroll = false)}
		onCancel={() => (showFaceEnroll = false)}
	/>
{/if}