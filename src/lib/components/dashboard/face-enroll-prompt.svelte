<!-- src/lib/components/dashboard/face-enroll-prompt.svelte -->
<script lang="ts">
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ScanFace from '@lucide/svelte/icons/scan-face';
	import { invalidateAll } from '$app/navigation';
	import FaceEnrollModal from '$lib/components/exam/FaceEnrollModal.svelte';

	let { enrolled }: { enrolled: boolean } = $props();

	// FaceEnrollModal has no `open` prop — mounting it starts the camera,
	// unmounting it tears down (its own onDestroy handles cleanup), so we
	// gate it with an {#if} rather than passing a boolean, same as
	// face-verify-prompt.svelte.
	let modalOpen = $state(false);

	// Once enrollment succeeds, re-fetch the dashboard's server data so
	// `enrolled` flips to true from the actual DB state (faceEnrolledAt)
	// rather than relying on local-only state that could drift from reality
	// on a later reload.
	async function handleSuccess() {
		modalOpen = false;
		await invalidateAll();
	}
</script>

{#if !enrolled}
	<Card class="flex flex-col items-start gap-3 border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-start gap-3">
			<div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
				<ScanFace class="size-4.5" />
			</div>
			<div>
				<p class="text-sm font-semibold">Enroll your face to unlock tests and exams</p>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Tests and examinations require identity verification. Enroll now so you're ready before
					your next assessment.
				</p>
			</div>
		</div>
		<Button size="sm" onclick={() => (modalOpen = true)} class="shrink-0">Enroll now</Button>
	</Card>

	{#if modalOpen}
		<FaceEnrollModal onSuccess={handleSuccess} onCancel={() => (modalOpen = false)} />
	{/if}
{/if}