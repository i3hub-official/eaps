<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import {
		AlertCircle,
		Save,
		RefreshCw,
		Database,
		Users,
		BookOpen,
		Server,
		Lock,
		Unlock,
		Clock,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let settings = $derived(data?.settings || {});
	let permissions = $derived(data?.permissions || { isSuperAdmin: false, canManageRegistration: false });

	let isSaving = $state(false);
	let activeTab = $state(permissions.isSuperAdmin ? 'general' : 'registration');

	let togglingId = $state<string | null>(null);
	let savingWindowId = $state<string | null>(null);
	let togglingSecurityKey = $state<string | null>(null);

	// Bound refs so a click anywhere in the row can submit the right form.
	let twoFactorFormEl: HTMLFormElement;
	let sessionTimeoutFormEl: HTMLFormElement;
	let ipRestrictionFormEl: HTMLFormElement;

	async function handleSave() {
		isSaving = true;
		await new Promise((resolve) => setTimeout(resolve, 1000));
		isSaving = false;
		await invalidateAll();
	}

	function toLocalInputValue(date: string | Date | null) {
		if (!date) return '';
		const d = new Date(date);
		const tzOffsetMs = d.getTimezoneOffset() * 60000;
		return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
	}

	function formatDate(d: string | Date | null) {
		if (!d) return 'Not set';
		return new Date(d).toLocaleString();
	}

	function windowStatus(sem: { registrationEnabled: boolean; regOpenAt: any; regCloseAt: any }) {
		if (!sem.registrationEnabled) return { label: 'Disabled', tone: 'destructive' as const };
		const now = new Date();
		if (sem.regOpenAt && now < new Date(sem.regOpenAt)) return { label: 'Not yet open', tone: 'warning' as const };
		if (sem.regCloseAt && now > new Date(sem.regCloseAt)) return { label: 'Closed', tone: 'muted' as const };
		return { label: 'Open', tone: 'success' as const };
	}

	function toneClass(tone: 'destructive' | 'warning' | 'success' | 'muted') {
		const map = {
			destructive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
			warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
			success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
			muted: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
		};
		return map[tone];
	}

	// Wraps a form's use:enhance lifecycle in a toast.promise so in-flight
	// state shows immediately, per project convention.
	function enhanceWithToast(opts: {
		onStart: () => void;
		onEnd: () => void;
		pending: string;
		successFallback: string;
		errorFallback: string;
	}) {
		return () => {
			opts.onStart();
			let resolveFn: (v: any) => void;
			let rejectFn: (e: any) => void;
			const promise = new Promise((resolve, reject) => {
				resolveFn = resolve;
				rejectFn = reject;
			});

			toast.promise(promise, {
				loading: opts.pending,
				success: (msg: string) => msg,
				error: (msg: string) => msg,
			});

			return async ({ result, update }: any) => {
				opts.onEnd();
				if (result.type === 'success') {
					resolveFn(result.data?.message ?? opts.successFallback);
				} else if (result.type === 'failure') {
					rejectFn(result.data?.error ?? opts.errorFallback);
				} else {
					resolveFn(opts.successFallback);
				}
				await update();
			};
		};
	}
</script>

<svelte:head>
	<title>Settings — EA Proctoring System</title>
</svelte:head>

<Topbar title="Settings" description="System configuration and preferences">
	{#snippet actions()}
		{#if permissions.isSuperAdmin}
			<Button variant="outline" size="sm" onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<RefreshCw class="mr-2 size-4 animate-spin" />
					Saving...
				{:else}
					<Save class="mr-2 size-4" />
					Save Changes
				{/if}
			</Button>
		{/if}
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{:else}
		{#if permissions.isSuperAdmin}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Total Users</CardTitle>
						<Users class="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{settings?.stats?.totalUsers || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Students</CardTitle>
						<Database class="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{settings?.stats?.totalStudents || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Staff</CardTitle>
						<Users class="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{settings?.stats?.totalStaff || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Courses</CardTitle>
						<BookOpen class="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{settings?.stats?.totalCourses || 0}</div>
					</CardContent>
				</Card>
			</div>
		{/if}

		<Tabs bind:value={activeTab} class="space-y-4">
			<TabsList>
				{#if permissions.isSuperAdmin}
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="academic">Academic</TabsTrigger>
				{/if}
				{#if permissions.canManageRegistration}
					<TabsTrigger value="registration">Registration</TabsTrigger>
				{/if}
				{#if permissions.isSuperAdmin}
					<TabsTrigger value="security">Security</TabsTrigger>
					<TabsTrigger value="system">System</TabsTrigger>
				{/if}
			</TabsList>

			{#if permissions.isSuperAdmin}
				<TabsContent value="general">
					<Card>
						<CardHeader>
							<CardTitle>General Settings</CardTitle>
							<CardDescription>Basic system configuration</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-2">
									<Label for="appName">Application Name</Label>
									<Input id="appName" value={settings?.general?.appName || 'EA Proctoring System'} readonly />
								</div>
								<div class="space-y-2">
									<Label for="version">Version</Label>
									<Input id="version" value={settings?.general?.appVersion || '1.0.0'} readonly disabled />
								</div>
								<div class="space-y-2">
									<Label for="environment">Environment</Label>
									<Input id="environment" value={settings?.general?.environment || 'development'} readonly disabled />
								</div>
								<div class="space-y-2">
									<Label for="baseUrl">Base URL</Label>
									<Input id="baseUrl" value={settings?.general?.baseUrl || ''} readonly disabled />
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="academic">
					<Card>
						<CardHeader>
							<CardTitle>Academic Settings</CardTitle>
							<CardDescription>Configure academic structure</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div>
								<h4 class="text-sm font-medium mb-2">Current Semester</h4>
								{#if settings?.academic?.semesters?.length > 0}
									<div class="space-y-2">
										{#each settings.academic.semesters as semester}
											<div class="flex items-center justify-between rounded-lg border p-3">
												<div>
													<p class="font-medium">{semester.type} {semester.session?.name}</p>
													<p class="text-sm text-muted-foreground">
														{new Date(semester.startDate).toLocaleDateString()} - {new Date(semester.endDate).toLocaleDateString()}
													</p>
												</div>
												<Badge variant={semester.isCurrent ? 'default' : 'secondary'}>
													{semester.isCurrent ? 'Current' : 'Past'}
												</Badge>
											</div>
										{/each}
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">No semesters configured</p>
								{/if}
							</div>
							<div>
								<h4 class="text-sm font-medium mb-2">Levels</h4>
								<div class="flex flex-wrap gap-2">
									{#each settings?.academic?.levels || [] as level}
										<Badge variant="outline" class="px-3 py-1">
											Level {level.name}
										</Badge>
									{/each}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			{/if}

			{#if permissions.canManageRegistration}
				<TabsContent value="registration">
					{#if form?.error}
						<Alert variant="destructive" class="mb-4">
							<AlertCircle class="size-4" />
							<AlertDescription>{form.error}</AlertDescription>
						</Alert>
					{/if}

					{#if settings?.registration?.error}
						<Alert variant="destructive">
							<AlertCircle class="size-4" />
							<AlertDescription>{settings.registration.error}</AlertDescription>
						</Alert>
					{:else if settings?.registration}
						<p class="text-sm text-muted-foreground mb-4">
							Session: <strong class="text-foreground">{settings.registration.session.name}</strong>
						</p>

						<div class="grid gap-6 md:grid-cols-2">
							{#each settings.registration.semesters as sem (sem.id)}
								{@const status = windowStatus(sem)}
								<Card>
									<CardHeader>
										<div class="flex items-center justify-between">
											<div>
												<CardTitle class="flex items-center gap-2">
													{sem.type.charAt(0) + sem.type.slice(1).toLowerCase()} Semester
													{#if sem.isCurrent}
														<Badge variant="outline">Current</Badge>
													{/if}
												</CardTitle>
												<CardDescription>
													<span class="inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-xs {toneClass(status.tone)}">
														{status.label}
													</span>
												</CardDescription>
											</div>

											<form
												method="POST"
												action="?/toggle"
												use:enhance={enhanceWithToast({
													onStart: () => (togglingId = sem.id),
													onEnd: () => (togglingId = null),
													pending: sem.registrationEnabled ? 'Disabling registration…' : 'Enabling registration…',
													successFallback: 'Updated',
													errorFallback: 'Failed to update',
												})}
											>
												<input type="hidden" name="semesterId" value={sem.id} />
												<input type="hidden" name="enabled" value={(!sem.registrationEnabled).toString()} />
												<Button
													type="submit"
													variant={sem.registrationEnabled ? 'destructive' : 'default'}
													size="sm"
													disabled={togglingId === sem.id}
												>
													{#if sem.registrationEnabled}
														<Lock class="mr-2 size-4" />
														{togglingId === sem.id ? 'Disabling…' : 'Disable'}
													{:else}
														<Unlock class="mr-2 size-4" />
														{togglingId === sem.id ? 'Enabling…' : 'Enable'}
													{/if}
												</Button>
											</form>
										</div>
									</CardHeader>

									<CardContent>
										<form
											method="POST"
											action="?/updateWindow"
											class="space-y-4"
											use:enhance={enhanceWithToast({
												onStart: () => (savingWindowId = sem.id),
												onEnd: () => (savingWindowId = null),
												pending: 'Saving registration window…',
												successFallback: 'Window updated',
												errorFallback: 'Failed to update window',
											})}
										>
											<input type="hidden" name="semesterId" value={sem.id} />

											<div class="space-y-2">
												<Label for={`open-${sem.id}`}>Opens At</Label>
												<Input
													id={`open-${sem.id}`}
													name="regOpenAt"
													type="datetime-local"
													value={toLocalInputValue(sem.regOpenAt)}
												/>
											</div>

											<div class="space-y-2">
												<Label for={`close-${sem.id}`}>Closes At</Label>
												<Input
													id={`close-${sem.id}`}
													name="regCloseAt"
													type="datetime-local"
													value={toLocalInputValue(sem.regCloseAt)}
												/>
											</div>

											<div class="rounded-lg bg-muted/30 border p-3 text-xs text-muted-foreground flex items-start gap-2">
												<Clock class="size-3.5 mt-0.5 shrink-0" />
												<p>
													Currently: opens {formatDate(sem.regOpenAt)}, closes {formatDate(sem.regCloseAt)}.
													Leave a field blank to remove that boundary (registration stays open/closed indefinitely on that side).
												</p>
											</div>

											<Button type="submit" size="sm" disabled={savingWindowId === sem.id}>
												{savingWindowId === sem.id ? 'Saving…' : 'Save Window'}
											</Button>
										</form>
									</CardContent>
								</Card>
							{/each}
						</div>
					{/if}
				</TabsContent>
			{/if}

			{#if permissions.isSuperAdmin}
				<!-- Security Settings -->
				<TabsContent value="security">
					<Card>
						<CardHeader>
							<CardTitle>Security Settings</CardTitle>
							<CardDescription>Configure system security</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<!-- Two-Factor Authentication -->
							<form
								method="POST"
								action="?/updateSecurity"
								bind:this={twoFactorFormEl}
								use:enhance={enhanceWithToast({
									onStart: () => (togglingSecurityKey = 'twoFactorEnabled'),
									onEnd: () => (togglingSecurityKey = null),
									pending: settings?.security?.twoFactorEnabled ? 'Disabling 2FA…' : 'Enabling 2FA…',
									successFallback: 'Updated',
									errorFallback: 'Failed to update',
								})}
							>
								<input type="hidden" name="key" value="twoFactorEnabled" />
								<input type="hidden" name="enabled" value={(!settings?.security?.twoFactorEnabled).toString()} />
								<div
									role="button"
									tabindex="0"
									aria-pressed={settings?.security?.twoFactorEnabled}
									class="flex w-full items-center justify-between rounded-lg border p-4 text-left cursor-pointer transition-colors hover:bg-muted/50 {togglingSecurityKey === 'twoFactorEnabled' ? 'opacity-60 pointer-events-none' : ''}"
									onclick={() => twoFactorFormEl.requestSubmit()}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											twoFactorFormEl.requestSubmit();
										}
									}}
								>
									<div>
										<h4 class="text-sm font-medium">Two-Factor Authentication</h4>
										<p class="text-sm text-muted-foreground">Require 2FA for all staff accounts</p>
									</div>
									<Switch checked={settings?.security?.twoFactorEnabled ?? false} class="pointer-events-none" />
								</div>
							</form>

							<!-- Session Timeout -->
							<form
								method="POST"
								action="?/updateSecurity"
								bind:this={sessionTimeoutFormEl}
								use:enhance={enhanceWithToast({
									onStart: () => (togglingSecurityKey = 'sessionTimeoutEnabled'),
									onEnd: () => (togglingSecurityKey = null),
									pending: settings?.security?.sessionTimeoutEnabled ? 'Disabling session timeout…' : 'Enabling session timeout…',
									successFallback: 'Updated',
									errorFallback: 'Failed to update',
								})}
							>
								<input type="hidden" name="key" value="sessionTimeoutEnabled" />
								<input type="hidden" name="enabled" value={(!settings?.security?.sessionTimeoutEnabled).toString()} />
								<div
									role="button"
									tabindex="0"
									aria-pressed={settings?.security?.sessionTimeoutEnabled}
									class="flex w-full items-center justify-between rounded-lg border p-4 text-left cursor-pointer transition-colors hover:bg-muted/50 {togglingSecurityKey === 'sessionTimeoutEnabled' ? 'opacity-60 pointer-events-none' : ''}"
									onclick={() => sessionTimeoutFormEl.requestSubmit()}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											sessionTimeoutFormEl.requestSubmit();
										}
									}}
								>
									<div>
										<h4 class="text-sm font-medium">Session Timeout</h4>
										<p class="text-sm text-muted-foreground">Auto-logout inactive sessions</p>
									</div>
									<Switch checked={settings?.security?.sessionTimeoutEnabled ?? true} class="pointer-events-none" />
								</div>
							</form>

							<!-- IP Restriction -->
							<form
								method="POST"
								action="?/updateSecurity"
								bind:this={ipRestrictionFormEl}
								use:enhance={enhanceWithToast({
									onStart: () => (togglingSecurityKey = 'ipRestrictionEnabled'),
									onEnd: () => (togglingSecurityKey = null),
									pending: settings?.security?.ipRestrictionEnabled ? 'Disabling IP restriction…' : 'Enabling IP restriction…',
									successFallback: 'Updated',
									errorFallback: 'Failed to update',
								})}
							>
								<input type="hidden" name="key" value="ipRestrictionEnabled" />
								<input type="hidden" name="enabled" value={(!settings?.security?.ipRestrictionEnabled).toString()} />
								<div
									role="button"
									tabindex="0"
									aria-pressed={settings?.security?.ipRestrictionEnabled}
									class="flex w-full items-center justify-between rounded-lg border p-4 text-left cursor-pointer transition-colors hover:bg-muted/50 {togglingSecurityKey === 'ipRestrictionEnabled' ? 'opacity-60 pointer-events-none' : ''}"
									onclick={() => ipRestrictionFormEl.requestSubmit()}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											ipRestrictionFormEl.requestSubmit();
										}
									}}
								>
									<div>
										<h4 class="text-sm font-medium">IP Restriction</h4>
										<p class="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
									</div>
									<Switch checked={settings?.security?.ipRestrictionEnabled ?? false} class="pointer-events-none" />
								</div>
							</form>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="system">
					<Card>
						<CardHeader>
							<CardTitle>System Settings</CardTitle>
							<CardDescription>System configuration and information</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-2">
									<Label>System Status</Label>
									<Badge variant="default" class="w-full justify-center py-2">
										<Server class="mr-2 size-4" />
										Operational
									</Badge>
								</div>
								<div class="space-y-2">
									<Label>Database Status</Label>
									<Badge variant="default" class="w-full justify-center py-2">
										<Database class="mr-2 size-4" />
										Connected
									</Badge>
								</div>
							</div>
							<div class="rounded-lg bg-muted/50 p-4">
								<h4 class="text-sm font-medium mb-2">System Information</h4>
								<div class="space-y-1 text-sm text-muted-foreground">
									<p>Node.js: {settings?.system?.nodeVersion ?? 'N/A'}</p>
									<p>Platform: {settings?.system?.platform ?? 'N/A'}</p>
									<p>Memory Usage: {settings?.system?.memoryMb != null ? `${settings.system.memoryMb} MB` : 'N/A'}</p>
									<p>
										Uptime:
										{#if settings?.system?.uptimeSeconds != null}
											{Math.floor(settings.system.uptimeSeconds / 3600)}h {Math.floor((settings.system.uptimeSeconds % 3600) / 60)}m
										{:else}
											N/A
										{/if}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			{/if}
		</Tabs>
	{/if}
</main>