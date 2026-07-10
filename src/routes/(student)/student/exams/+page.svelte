<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Clock from '@lucide/svelte/icons/clock';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ScanFace from '@lucide/svelte/icons/scan-face';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';

	let { data, form } = $props();

	let startingId = $state<string | null>(null);

	function formatDate(d: string | Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function statusBadge(e: (typeof data.exams)[number]) {
		if (e.opensInFuture) return { label: `Opens ${formatDate(e.startTime)}`, variant: 'outline' as const };
		if (e.closed) return { label: 'Closed', variant: 'destructive' as const };
		if (!e.isRegistered) return { label: 'Not registered', variant: 'destructive' as const };
		if (e.attemptsRemaining === 0) return { label: 'Attempts used', variant: 'outline' as const };
		return { label: 'Open', variant: 'default' as const };
	}

	function buttonLabel(e: (typeof data.exams)[number]) {
		if (startingId === e.id) return 'Starting…';
		if (e.inProgressSessionId) return 'Resume exam';
		if (!e.isRegistered) return 'Not registered for course';
		if (!data.faceEnrolled && e.requireFaceVerify) return 'Face enrollment required';
		if (e.canStart) return 'Start exam';
		return 'Unavailable';
	}
</script>

<Topbar title="Exams" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if !data.faceEnrolled}
		<div
			class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
			role="alert"
		>
			<ScanFace class="mt-0.5 size-4 shrink-0" />
			<span>
				Face enrollment is required before you can sit any exam. Enroll your face from your
				profile settings to unlock exams below.
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

	{#if data.exams.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<GraduationCap class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No exams scheduled</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Exams will appear here once published for your registered courses.
				</p>
			</div>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.exams as e (e.id)}
				{@const badge = statusBadge(e)}
				<Card class="flex flex-col gap-4 p-5">
					<div class="flex items-start justify-between gap-2">
						<div>
							{#if e.course}
								<Badge variant="secondary" class="mb-1.5 font-normal">{e.course.code}</Badge>
							{/if}
							<p class="font-semibold leading-snug">{e.title}</p>
						</div>
						<Badge variant={badge.variant} class="whitespace-nowrap">{badge.label}</Badge>
					</div>

					{#if !e.isRegistered}
						<div class="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
							<ShieldAlert class="mt-0.5 size-3.5 shrink-0" />
							<span>You don't have an approved registration for this course.</span>
						</div>
					{/if}

					<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
						<span class="flex items-center gap-1">
							<Clock class="size-3.5" />
							{e.durationMinutes} min
						</span>
						<span>{e.questionCount} question{e.questionCount === 1 ? '' : 's'}</span>
						<span class="flex items-center gap-1">
							<RotateCcw class="size-3.5" />
							{e.attemptsUsed}/{e.maxAttempts} attempts used
						</span>
					</div>

					<div class="flex flex-wrap gap-1.5">
						{#if e.requireFaceVerify}
							<Badge variant="outline" class="gap-1 font-normal">
								<ScanFace class="size-3" />
								Face verification
							</Badge>
						{/if}
						{#if e.requireLiveness}
							<Badge variant="outline" class="font-normal">Liveness check</Badge>
						{/if}
						{#if e.fullscreenRequired}
							<Badge variant="outline" class="font-normal">Fullscreen required</Badge>
						{/if}
						{#if e.offlineEnabled}
							<Badge variant="outline" class="gap-1 font-normal">
								<WifiOff class="size-3" />
								Offline mode
							</Badge>
						{/if}
					</div>

					{#if e.result?.isReleased}
						<div class="rounded-md bg-muted px-3 py-2 text-sm">
							<span class="flex items-center gap-1.5 text-muted-foreground">
								<CheckCircle2 class="size-3.5 text-primary" />
								Last score:
							</span>
							<span class="font-medium">
								{e.result.marksObtained}/{e.result.totalMarks} ({e.result.percentage}%)
							</span>
							{#if e.result.grade}
								<Badge variant="outline" class="ml-2 font-normal">{e.result.grade}</Badge>
							{/if}
						</div>
					{/if}

					<form
						method="POST"
						action="?/start"
						use:enhance={() => {
							startingId = e.id;
							return async ({ update }) => {
								await update();
								startingId = null;
							};
						}}
						class="mt-auto"
					>
						<input type="hidden" name="assessmentId" value={e.id} />
						<Button
							type="submit"
							class="w-full"
							disabled={(!e.canStart && !e.inProgressSessionId) || startingId === e.id}
						>
							{buttonLabel(e)}
						</Button>
					</form>
				</Card>
			{/each}
		</div>
	{/if}
</main>