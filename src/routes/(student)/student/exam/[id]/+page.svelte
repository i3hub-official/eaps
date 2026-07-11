<!-- Example: src/routes/(student)/student/exam/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import ExamMonitor from '$lib/components/exam/ExamMonitor.svelte';
	import ExamShell from '$lib/components/exam/ExamShell.svelte';

	let { data } = $props();

	const sessionId = data.sessionId; // From load function
	let isFullscreen = $state(false);

	async function enterFullscreen() {
		try {
			// Request fullscreen with hidden navigation UI
			await document.documentElement.requestFullscreen({
				navigationUI: 'hide' as FullscreenNavigationUI,
			});
			isFullscreen = true;
		} catch (err) {
			console.warn('Fullscreen request failed:', err);
			// Still allow exam to proceed without fullscreen
		}
	}

	async function exitFullscreen() {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			}
			isFullscreen = false;
		} catch (err) {
			console.error('Exit fullscreen failed:', err);
		}
	}

	onMount(() => {
		// Disable right-click context menu during exam
		const preventContextMenu = (e: MouseEvent) => e.preventDefault();
		document.addEventListener('contextmenu', preventContextMenu);

		// Try to enter fullscreen on mount
		enterFullscreen();

		return () => {
			document.removeEventListener('contextmenu', preventContextMenu);
			exitFullscreen();
		};
	});
</script>

<!-- ─── Comprehensive Exam Monitor ──────────────────────────────────────── -->
<!-- Handles: Face verification, tab switching, fullscreen, devtools, copy/paste, etc. -->
<ExamMonitor {sessionId} />

<!-- ─── Main Exam Content ──────────────────────────────────────────────── -->
<ExamShell {sessionId} {data} />

<style>
	/* Ensure exam takes full viewport during fullscreen */
	:global(body.exam-mode) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	:global(html.exam-mode) {
		overflow: hidden;
	}
</style>