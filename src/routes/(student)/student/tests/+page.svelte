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
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Loader from '@lucide/svelte/icons/loader';
	import BookOpen from '@lucide/svelte/icons/book-open';

	let { data, form } = $props();

	let startingId = $state<string | null>(null);

	function formatDate(d: string | Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function statusBadge(t: (typeof data.tests)[number]) {
		switch (t.displayStatus) {
			case 'CANCELLED':
				return { label: 'Cancelled', variant: 'destructive' as const };
			case 'IN_PROGRESS':
				return { label: 'In progress', variant: 'default' as const };
			case 'UPCOMING':
				return { label: t.startTime ? `Opens ${formatDate(t.startTime)}` : 'Upcoming', variant: 'outline' as const };
			case 'ENDED':
				return { label: 'Ended', variant: 'secondary' as const };
			case 'ATTEMPTS_USED':
				return { label: 'Attempts used', variant: 'outline' as const };
			default:
				return { label: 'Open', variant: 'default' as const };
		}
	}
</script>

<Topbar title="Tests" description={data?.currentSemester ? `Current semester: ${data.currentSemester.name}` : 'No active semester'} />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if !data.currentSemester}
		<div
			class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
			role="alert"
		>
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>
				No active semester found. Please contact your HOD or the registrar.
			</span>
		</div>
	{/if}

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

	{#if data.currentSemester}
	<div class="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-muted-foreground">
				Current semester: <strong>{data.currentSemester.name}</strong>
			</span>
			{#if data.currentSemester.isWithinDateRange}
				<Badge variant="default" class="gap-1">
					<CheckCircle2 class="size-3" />
					Active
				</Badge>
			{:else}
				<Badge variant="secondary" class="gap-1">
					<Clock class="size-3" />
					{new Date(data.currentSemester.startDate) > new Date() ? 'Upcoming' : 'Past'}
				</Badge>
			{/if}
		</div>
	</div>
{/if}

	{#if data.tests.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<ShieldCheck class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No tests available</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{#if !data.currentSemester}
						No active semester.
					{:else if !data.faceEnrolled}
						Complete face enrollment to see available tests.
					{:else}
						Tests from your registered courses will appear here once published.
					{/if}
				</p>
			</div>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.tests as t (t.id)}
				{@const badge = statusBadge(t)}
				<Card class="flex flex-col gap-4 p-5 {t.cancelled ? 'opacity-70' : ''}">
					<div class="flex items-start justify-between gap-2">
						<div>
							{#if t.course}
								<Badge variant="secondary" class="mb-1.5 font-normal">
									<BookOpen class="mr-1 size-3" />
									{t.course.code} • Level {t.course.level}
								</Badge>
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

					{#if t.cancelled}
						<div class="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
							<XCircle class="size-3.5" />
							This test was cancelled by your lecturer.
						</div>
					{:else if t.result?.isReleased}
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

					{#if !t.cancelled}
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
									<Loader class="size-4 animate-spin" />
									Starting…
								{:else if t.inProgressSessionId}
									Resume test
								{:else if !data.faceEnrolled && t.requireFaceVerify}
									Face enrollment required
								{:else if t.displayStatus === 'ENDED'}
									Ended
								{:else if t.displayStatus === 'UPCOMING'}
									Not yet open
								{:else if t.canStart}
									Start test
								{:else}
									Unavailable
								{/if}
							</Button>
						</form>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</main>