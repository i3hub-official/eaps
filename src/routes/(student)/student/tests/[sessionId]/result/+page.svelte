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

	// Results can be withheld by the lecturer until releasedAt is set —
	// show a pending state rather than a score in that case.
	const released = $derived(Boolean(data.result.releasedAt) || data.status !== 'SUBMITTED')
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

			{#if released}
				<p class="text-3xl font-bold">{data.result.percentage}%</p>
				<Badge variant={data.result.passed ? 'default' : 'destructive'}>
					{data.result.passed ? 'Passed' : 'Not passed'} · Pass mark {data.assessment.passMark}%
				</Badge>
				<p class="text-xs text-muted-foreground">
					{data.result.score} / {data.assessment.totalMarks} marks
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