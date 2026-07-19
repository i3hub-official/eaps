<!-- src/routes/(student)/student/tests/[sessionId]/result/+page.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import XCircle from '@lucide/svelte/icons/x-circle'
	import Clock from '@lucide/svelte/icons/clock'

	let { data } = $props()

	const statusLabel = $derived(
		{ SUBMITTED: 'Submitted', TIMED_OUT: 'Auto-submitted (time expired)', DISQUALIFIED: 'Disqualified' }[
			data.status
		] ?? data.status
	)

	// Results can be withheld by the lecturer until isReleased is set —
	// show a pending state rather than a score in that case. The server
	// already folds "non-SUBMITTED terminal statuses are always visible"
	// into `data.result.released`, so this is just a passthrough.
	const released = $derived(data.result.released)

	function formatDuration(totalSeconds: number): string {
		const h = Math.floor(totalSeconds / 3600)
		const m = Math.floor((totalSeconds % 3600) / 60)
		const s = totalSeconds % 60
		if (h > 0) return `${h}h ${m}m ${s}s`
		if (m > 0) return `${m}m ${s}s`
		return `${s}s`
	}
</script>

<svelte:head>
	<title>Result — {data.assessment.title}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-6">
	<Card class="w-full max-w-md">
		<CardHeader class="items-center text-center">
			{#if data.status === 'DISQUALIFIED'}
				<XCircle class="size-10 text-destructive" />
			{:else if data.status === 'TIMED_OUT'}
				<Clock class="size-10 text-yellow-600" />
			{:else}
				<CheckCircle2 class="size-10 text-primary" />
			{/if}
			<CardTitle>{statusLabel}</CardTitle>
		</CardHeader>
		<CardContent class="flex flex-col items-center gap-3 text-center">
			<div class="text-sm text-muted-foreground">
				{data.assessment.course.code} · {data.assessment.title}
			</div>

			{#if data.timeUsedSeconds !== null}
				<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Clock class="size-3.5" />
					<span>
						Time used: {formatDuration(data.timeUsedSeconds)}
						{#if data.assessment.durationMinutes}
							of {data.assessment.durationMinutes}m allowed
						{/if}
					</span>
				</div>
			{/if}

			{#if released}
				<p class="text-3xl font-bold">{data.result.percentage}%</p>
				<Badge variant={data.result.passed ? 'default' : 'destructive'}>
					{data.result.passed ? 'Passed' : 'Not passed'} · Pass mark {data.assessment.passMark}%
				</Badge>
				<p class="text-xs text-muted-foreground">
					{Math.round(data.result.score)} / {Math.round(data.result.totalMarks)} marks
				</p>
			{:else}
				<p class="text-sm text-muted-foreground">
					Your result will be available once released by your lecturer.
				</p>
			{/if}

			<Button href="/student/tests" class="mt-4 w-full">Back to Tests</Button>
		</CardContent>
	</Card>
</div>