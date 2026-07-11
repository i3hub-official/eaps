<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { AlertCircle, Lock, Unlock, Clock } from '@lucide/svelte/icons';

	let { data, form } = $props();

	let togglingId = $state<string | null>(null);
	let savingWindowId = $state<string | null>(null);

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
</script>

<svelte:head>
	<title>Registration Control — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Course Registration Control" description="Open or close course registration for the current session" />

<div class="p-6 space-y-6">
	{#if form?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	{#if data.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{:else}
		<p class="text-sm text-muted-foreground">
			Session: <strong class="text-foreground">{data.session.name}</strong>
		</p>

		<div class="grid gap-6 md:grid-cols-2">
			{#each data.semesters as sem (sem.id)}
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
								use:enhance={() => {
									togglingId = sem.id;
									return async ({ result, update }) => {
										togglingId = null;
										if (result.type === 'success') toast.success(result.data?.message ?? 'Updated');
										if (result.type === 'failure') toast.error(result.data?.error ?? 'Failed to update');
										await update();
									};
								}}
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
							use:enhance={() => {
								savingWindowId = sem.id;
								return async ({ result, update }) => {
									savingWindowId = null;
									if (result.type === 'success') toast.success(result.data?.message ?? 'Window updated');
									if (result.type === 'failure') toast.error(result.data?.error ?? 'Failed to update window');
									await update();
								};
							}}
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
</div>