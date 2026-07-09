<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';

	let { data, form } = $props();

	let successMessage = $state('');
	let submitting = $state(false);

	// Optimistic local toggle state so the switch responds instantly,
	// reconciled with `data.semester` after the action resolves.
	let enabled = $state(data.semester?.registrationEnabled ?? false);

	$effect(() => {
		if (form?.toggleSuccess) successMessage = form.toggleMessage ?? '';
	});

	function formatDate(d: string | Date | null) {
		if (!d) return 'Not set';
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function formatSemester(type: string | undefined) {
		if (!type) return '';
		return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
	}
</script>

<Topbar title="Registration Control" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data.noActiveSession}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<CalendarClock class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No active semester</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Set a current academic session and semester before managing registration.
				</p>
			</div>
		</Card>
	{:else}
		{#if successMessage}
			<div
				class="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
				role="alert"
			>
				<CheckCircle2 class="mt-0.5 size-4 shrink-0" />
				<span>{successMessage}</span>
			</div>
		{/if}
		{#if form?.toggleError}
			<div
				class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				<span>{form.toggleError}</span>
			</div>
		{/if}

		<Card class="flex flex-col gap-4 p-6">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold">
						{data.session?.name} — {formatSemester(data.semester?.type)} Semester
					</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Scheduled window: {formatDate(data.semester?.regOpenAt ?? null)} → {formatDate(
							data.semester?.regCloseAt ?? null
						)}
					</p>
				</div>
				<Badge variant={enabled ? 'default' : 'outline'} class="gap-1.5 py-1.5">
					{enabled ? 'Open' : 'Closed'}
				</Badge>
			</div>

			<form
				method="POST"
				action="?/toggle"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="flex items-center justify-between rounded-lg border p-4"
			>
				<input type="hidden" name="semesterId" value={data.semester?.id} />
				<input type="hidden" name="enabled" value={(!enabled).toString()} />

				<div>
					<p class="text-sm font-medium">Allow student registration</p>
					<p class="text-sm text-muted-foreground">
						Overrides the scheduled window — turning this off closes registration immediately,
						regardless of dates above.
					</p>
				</div>

				<Switch
					checked={enabled}
					disabled={submitting}
					onCheckedChange={(checked) => {
						enabled = checked;
					}}
					name="_switch_display"
				/>
				<button type="submit" class="sr-only" aria-hidden="true">Save</button>
			</form>
		</Card>
	{/if}
</main>