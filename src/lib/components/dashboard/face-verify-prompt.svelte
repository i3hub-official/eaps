<!-- src/lib/components/dashboard/face-verify-prompt.svelte -->
<script lang="ts">
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { goto } from '$app/navigation';
	import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte';

	let {
		assessment
	}: {
		assessment: {
			id: string;
			title: string;
			startTime: string | Date;
			course: { code: string; title: string } | null;
		} | null;
	} = $props();

	// FaceVerifyModal has no `open` prop — mounting it starts the camera,
	// unmounting it tears down (its own onDestroy handles cleanup), so we
	// gate it with an {#if} rather than passing a boolean.
	let modalOpen = $state(false);

	function handleSuccess() {
		modalOpen = false;
		if (assessment) goto(`/student/assessment/${assessment.id}`);
	}

	function formatTime(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

{#if assessment}
	<Card class="flex flex-col items-start gap-3 border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-start gap-3">
			<div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
				<ShieldCheck class="size-4.5" />
			</div>
			<div>
				<p class="text-sm font-semibold">
					Verify your face for {assessment.course ? `${assessment.course.code} — ` : ''}{assessment.title}
				</p>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Scheduled for {formatTime(assessment.startTime)}. Verify now to confirm you're ready.
				</p>
			</div>
		</div>
		<Button size="sm" onclick={() => (modalOpen = true)} class="shrink-0">Verify now</Button>
	</Card>

	{#if modalOpen}
		<FaceVerifyModal examId={assessment.id} onSuccess={handleSuccess} onCancel={() => (modalOpen = false)} />
	{/if}
{/if}