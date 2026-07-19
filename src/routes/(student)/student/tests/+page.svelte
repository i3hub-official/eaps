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
	import Archive from '@lucide/svelte/icons/archive';
	import Eye from '@lucide/svelte/icons/eye';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

	let { data, form } = $props();

	let startingId = $state<string | null>(null);
	let countdowns = $state<Record<string, string>>({});

	const availableTests = $derived(data.tests.filter((t) => !t.completed));
	const completedTests = $derived(data.tests.filter((t) => t.completed));

	function formatDate(d: string | Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function formatCountdown(startTime: string | Date | null): string {
		if (!startTime) return 'Upcoming';
		const now = new Date();
		const start = new Date(startTime);
		const diffMs = start.getTime() - now.getTime();

		if (diffMs < 0) return 'Starting soon';

		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		if (diffDays > 0) {
			return `Opens in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
		}
		if (diffHours > 0) {
			return `Opens in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
		}
		if (diffMins > 0) {
			return `Opens in ${diffMins} min${diffMins === 1 ? '' : 's'}`;
		}
		return 'Opening now';
	}

	function formatRetakeCountdown(blockedUntil: Date | null): string {
		if (!blockedUntil) return '';
		const now = new Date();
		const diffMs = blockedUntil.getTime() - now.getTime();

		if (diffMs <= 0) return '';

		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

		if (hours > 0) return `${hours}h ${mins}m remaining`;
		if (mins > 0) return `${mins}m ${secs}s remaining`;
		return `${secs}s remaining`;
	}

	function statusBadge(t: (typeof data.tests)[number]) {
		switch (t.displayStatus) {
			case 'CANCELLED':
				return { label: 'Cancelled', variant: 'destructive' as const };
			case 'IN_PROGRESS':
				return { label: 'In progress', variant: 'default' as const };
			case 'UPCOMING':
				return { label: formatCountdown(t.startTime), variant: 'outline' as const };
			case 'ENDED':
				return { label: 'Ended', variant: 'secondary' as const };
			default:
				return { label: 'Open', variant: 'default' as const };
		}
	}

	function completedBadge(t: (typeof data.tests)[number]) {
		switch (t.completedSessionStatus) {
			case 'DISQUALIFIED':
				return { label: 'Disqualified', variant: 'destructive' as const };
			case 'TIMED_OUT':
				return { label: 'Auto-submitted', variant: 'secondary' as const };
			default:
				return { label: 'Completed', variant: 'secondary' as const };
		}
	}

	function resumeBlocked(t: (typeof data.tests)[number]) {
		return t.requireFaceVerify && !data.faceEnrolled;
	}

	// Start countdown timers for retake delays
	import { onMount, onDestroy } from 'svelte';

	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		countdownInterval = setInterval(() => {
			completedTests.forEach((t) => {
				if (t.retakeBlockedUntil) {
					countdowns[t.id] = formatRetakeCountdown(new Date(t.retakeBlockedUntil));
				}
			});
			countdowns = countdowns;
		}, 1000);

		// Initial update
		completedTests.forEach((t) => {
			if (t.retakeBlockedUntil) {
				countdowns[t.id] = formatRetakeCountdown(new Date(t.retakeBlockedUntil));
			}
		});
	});

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
	});
</script>

<svelte:head>
	<title>Tests — EAPS</title>
</svelte:head>

<Topbar title="Tests" description={data?.currentSemester ? `Current semester: ${data.currentSemester.name}` : 'No active semester'} />

<main class="exam-board flex flex-1 flex-col gap-6 p-6">

	{#if !data.currentSemester}
		<div class="notice notice-amber" role="alert">
			<AlertCircle class="notice-icon" />
			<span>No active semester found. Please contact your HOD or the registrar.</span>
		</div>
	{/if}

	{#if !data.faceEnrolled}
		<div class="notice notice-amber" role="alert">
			<ScanFace class="notice-icon" />
			<span>
				Face enrollment is required before you can take any test. Enroll your face from your
				profile settings to unlock tests below.
			</span>
		</div>
	{/if}

	{#if form?.startError}
		<div class="notice notice-destructive" role="alert">
			<AlertCircle class="notice-icon" />
			<span>{form.startError}</span>
		</div>
	{/if}

	{#if data.currentSemester}
		<div class="session-strip">
			<span class="session-eyebrow">Academic Session</span>
			<div class="session-row">
				<span class="session-name">{data.currentSemester.name}</span>
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
		<Card class="empty-board flex flex-col items-center gap-3 border-dashed p-12 text-center">
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
		<!-- ─── Available Tests ────────────────────────────────────────────── -->
		{#if availableTests.length > 0}
			<div class="flex flex-col gap-4">
				<div class="board-section-label">
					<span>Available Tests</span>
					<div class="board-rule"></div>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each availableTests as t (t.id)}
						{@const badge = statusBadge(t)}
						{@const blocked = resumeBlocked(t)}
						{@const lowAttempts = t.maxAttempts > 0 && t.attemptsRemaining !== null && t.attemptsRemaining <= 2}
						<Card class="ticket flex flex-col gap-4 p-5 {t.cancelled ? 'opacity-70' : ''} {lowAttempts ? 'ring-2 ring-amber-500/30' : ''}">
							<div class="ticket-perf" aria-hidden="true"></div>

							<div class="flex items-start justify-between gap-2">
								<div>
									{#if t.course}
										<Badge variant="secondary" class="mb-1.5 font-normal">
											<BookOpen class="mr-1 size-3" />
											{t.course.code} • Level {t.course.level}
										</Badge>
									{/if}
									<p class="ticket-title">{t.title}</p>
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
									{t.attemptsUsed}/{t.maxAttempts === 0 ? '∞' : t.maxAttempts} attempts
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
								{#if t.paperVariants > 1}
									<Badge variant="outline" class="font-normal">
										Multiple variants
									</Badge>
								{/if}
							</div>

							{#if lowAttempts}
								<div class="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
									<AlertTriangle class="size-3.5 shrink-0" />
									{t.attemptsRemaining} attempt{t.attemptsRemaining === 1 ? '' : 's'} remaining — use carefully!
								</div>
							{/if}

							{#if t.cancelled}
								<div class="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
									<XCircle class="size-3.5" />
									This test was cancelled by your lecturer.
								</div>
							{:else if t.result?.isReleased}
								<div class="rounded-md bg-muted px-3 py-2 text-sm">
									<span class="flex items-center gap-1.5 text-muted-foreground">
										<CheckCircle2 class="size-3.5 text-primary" />
										{t.bestScoreOnly ? 'Best' : 'Last'} score:
									</span>
									<span class="font-medium">
										{t.result.marksObtained}/{t.result.totalMarks} ({t.result.percentage}%)
									</span>
									{#if t.result.grade}
										<Badge variant="outline" class="ml-2 font-normal">{t.result.grade}</Badge>
									{/if}
								</div>
							{/if}

							{#if blocked}
								<div class="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
									<ScanFace class="size-3.5 shrink-0" />
									Face enrollment required to {t.inProgressSessionId ? 'resume' : 'start'} this test.
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
										class="w-full ticket-btn"
										disabled={blocked || (!t.canStart && !t.inProgressSessionId) || startingId === t.id}
									>
										{#if startingId === t.id}
											<Loader class="size-4 animate-spin" />
											Starting…
										{:else if blocked}
											<ScanFace class="mr-1 size-3.5" />
											Face enrollment required
										{:else if t.inProgressSessionId}
											Resume test
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
			</div>
		{/if}

		<!-- ─── Already Taken ──────────────────────────────────────────────── -->
		{#if completedTests.length > 0}
			<div class="flex flex-col gap-4">
				<div class="board-section-label">
					<span class="flex items-center gap-1.5"><Archive class="size-4" /> Already Taken</span>
					<div class="board-rule"></div>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each completedTests as t (t.id)}
						{@const badge = completedBadge(t)}
						{@const countdown = countdowns[t.id]}
						<Card class="ticket ticket-archived flex flex-col gap-4 p-5 opacity-90">
							<div class="ticket-perf" aria-hidden="true"></div>

							<div class="flex items-start justify-between gap-2">
								<div>
									{#if t.course}
										<Badge variant="secondary" class="mb-1.5 font-normal">
											<BookOpen class="mr-1 size-3" />
											{t.course.code} • Level {t.course.level}
										</Badge>
									{/if}
									<p class="ticket-title">{t.title}</p>
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
									{t.attemptsUsed}/{t.maxAttempts === 0 ? '∞' : t.maxAttempts} attempts
								</span>
							</div>

							{#if countdown}
								<div class="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
									<Clock class="size-3.5 shrink-0" />
									Retake available in {countdown}
								</div>
							{/if}

							{#if t.completedSessionStatus === 'DISQUALIFIED'}
								<div class="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
									<XCircle class="size-3.5 text-destructive" />
									This attempt was disqualified. No further attempts remain.
								</div>
							{:else if t.completedSessionStatus === 'TIMED_OUT'}
								<div class="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
									<Clock class="size-3.5" />
									Auto-submitted when time expired. No further attempts remain.
								</div>
							{:else}
								<div class="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
									<CheckCircle2 class="size-3.5 text-primary" />
									You have completed this test{t.attemptsRemaining === null || t.attemptsRemaining > 0 ? '' : '. No further attempts remain'}.
								</div>
							{/if}

							{#if t.result?.isReleased}
								<div class="rounded-md bg-muted px-3 py-2 text-sm">
									<span class="flex items-center gap-1.5 text-muted-foreground">
										<CheckCircle2 class="size-3.5 text-primary" />
										Score:
									</span>
									<span class="font-medium">
										{t.result.marksObtained}/{t.result.totalMarks} ({t.result.percentage}%)
									</span>
									{#if t.result.grade}
										<Badge variant="outline" class="ml-2 font-normal">{t.result.grade}</Badge>
									{/if}
								</div>
							{/if}

							<div class="mt-auto flex gap-2">
								<Button href={`/student/tests/${t.completedSessionId}/result`} variant="outline" class="flex-1">
									View Result
								</Button>
								<Button href={`/student/tests/${t.completedSessionId}/review`} variant="outline" class="flex-1" title="Review your answers">
									<Eye class="mr-1 size-3.5" />
									Review
								</Button>
							</div>
						</Card>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</main>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700&family=Oswald:wght@500;600&display=swap');

	/* ---------- NOTICES ---------- */

	.notice {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		border-left: 4px solid hsl(var(--primary));
		background: hsl(var(--muted) / 0.25);
		padding: 0.85rem 1rem;
		font-size: 0.875rem;
	}

	.notice-amber {
		border-left-color: rgb(217 119 6);
		background: rgb(217 119 6 / 0.08);
		color: rgb(180 96 6);
	}
	:global(.dark) .notice-amber {
		color: rgb(251 191 36);
	}

	.notice-destructive {
		border-left-color: hsl(var(--destructive));
		background: hsl(var(--destructive) / 0.08);
		color: hsl(var(--destructive));
	}

	.notice-icon {
		margin-top: 0.15rem;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	/* ---------- SESSION STRIP ---------- */

	.session-strip {
		border: 1px solid hsl(var(--border));
		border-radius: 0.6rem;
		padding: 0.65rem 1rem 0.75rem;
		background: hsl(var(--muted) / 0.2);
	}

	.session-eyebrow {
		font-family: 'Oswald', sans-serif;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: hsl(var(--muted-foreground));
	}

	.session-row {
		margin-top: 0.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.session-name {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.15rem;
		color: hsl(var(--foreground));
	}

	/* ---------- SECTION LABELS ---------- */

	.board-section-label {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-family: 'Oswald', sans-serif;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: hsl(var(--foreground));
	}

	.board-rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, hsl(var(--primary) / 0.4), transparent);
	}

	/* ---------- TICKET CARDS ---------- */

	:global(.ticket) {
		position: relative;
		border-top: 3px solid hsl(var(--primary) / 0.55);
	}

	:global(.ticket-archived) {
		border-top-color: hsl(var(--border));
	}

	.ticket-perf {
		position: absolute;
		top: 0;
		left: 1.25rem;
		right: 1.25rem;
		height: 0;
		border-top: 1px dashed hsl(var(--border));
		opacity: 0;
	}

	.ticket-title {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.05rem;
		line-height: 1.35;
		color: hsl(var(--foreground));
	}

	:global(.ticket-btn) {
		font-family: 'Oswald', sans-serif;
		font-weight: 600;
		letter-spacing: 0.03em;
	}

	.empty-board {
		background: hsl(var(--muted) / 0.1);
	}
</style>