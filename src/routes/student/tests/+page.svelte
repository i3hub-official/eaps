<!-- src/routes/student/tests/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Clock from '@lucide/svelte/icons/clock';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ScanFace from '@lucide/svelte/icons/scan-face';

	let { data, form } = $props();

	let startingId = $state<string | null>(null);

	function formatDate(d: string | Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function statusBadge(t: (typeof data.tests)[number]) {
		if (t.opensInFuture) return { label: `Opens ${formatDate(t.startTime)}`, variant: 'outline' as const };
		if (t.closed) return { label: 'Closed', variant: 'destructive' as const };
		if (t.attemptsRemaining === 0) return { label: 'Attempts used', variant: 'outline' as const };
		return { label: 'Open', variant: 'default' as const };
	}
</script>

<Topbar title="Tests" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if !data.faceEnrolled}
		<div
			class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
			role="alert"
		>
			<ScanFace class="mt-0.5 size-4 shrink-0" />
			<span>
				Face enrollment is required before you can take any test. Enroll your face from your
				profile settings to unlock tests below.
			</span>
		</div>
	{/if}

	{#if form?.startError}
		<div
			class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{form.startError}</span>
		</div>
	{/if}

	{#if data.tests.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<ShieldCheck class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No tests scheduled</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Tests from your lecturers will appear here once published.
				</p>
			</div>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.tests as t (t.id)}
				{@const badge = statusBadge(t)}
				<Card class="flex flex-col gap-4 p-5">
					<div class="flex items-start justify-between gap-2">
						<div>
							{#if t.course}
								<Badge variant="secondary" class="mb-1.5 font-normal">{t.course.code}</Badge>
							{/if}
							<p class="font-semibold leading-snug">{t.title}</p>
						</div>
						<Badge variant={badge.variant} class="whitespace-nowrap">{badge.label}</Badge>
					</div>

					<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
						<span class="flex items-center gap-1">
							<Clock class="size-3.5" />
							{t.durationMinutes} min
						</span>
						<span>{t.questionCount} question{t.questionCount === 1 ? '' : 's'}</span>
						<span class="flex items-center gap-1">
							<RotateCcw class="size-3.5" />
							{t.attemptsUsed}/{t.maxAttempts} attempts used
						</span>
					</div>

					<div class="flex flex-wrap gap-1.5">
						{#if t.requireFaceVerify}
							<Badge variant="outline" class="gap-1 font-normal">
								<ScanFace class="size-3" />
								Face verification
							</Badge>
						{/if}
						{#if t.fullscreenRequired}
							<Badge variant="outline" class="font-normal">Fullscreen required</Badge>
						{/if}
					</div>

					{#if t.result?.isReleased}
						<div class="rounded-md bg-muted px-3 py-2 text-sm">
							<span class="flex items-center gap-1.5 text-muted-foreground">
								<CheckCircle2 class="size-3.5 text-primary" />
								Last score:
							</span>
							<span class="font-medium">
								{t.result.marksObtained}/{t.result.totalMarks} ({t.result.percentage}%)
							</span>
							{#if t.result.grade}
								<Badge variant="outline" class="ml-2 font-normal">{t.result.grade}</Badge>
							{/if}
						</div>
					{/if}

					<form
						method="POST"
						action="?/start"
						use:enhance={() => {
							startingId = t.id;
							return async ({ update }) => {
								await update();
								startingId = null;
							};
						}}
						class="mt-auto"
					>
						<input type="hidden" name="assessmentId" value={t.id} />
						<Button
							type="submit"
							class="w-full"
							disabled={(!t.canStart && !t.inProgressSessionId) || startingId === t.id}
						>
							{#if startingId === t.id}
								Starting…
							{:else if t.inProgressSessionId}
								Resume test
							{:else if !data.faceEnrolled && t.requireFaceVerify}
								Face enrollment required
							{:else if t.canStart}
								Start test
							{:else}
								Unavailable
							{/if}
						</Button>
					</form>
				</Card>
			{/each}
		</div>
	{/if}
</main>