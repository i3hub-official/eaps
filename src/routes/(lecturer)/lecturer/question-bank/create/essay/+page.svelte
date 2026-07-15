<!-- src/routes/(lecturer)/lecturer/question-bank/create/essay/+page.svelte -->
<script lang="ts">
	import { Topbar, PagePlaceholder } from '$lib/components/dashboard';
		import { Button } from '$lib/components/ui/button/index.js'
	import {
		ArrowLeft,
	} from '@lucide/svelte/icons'
</script>

<svelte:head>
	<title>Create Essay Question — EAPS</title>
</svelte:head>

<Topbar title="Create Essay Question" description="Create a question that requires a written response">
	{#snippet actions()}
		<Button href="/lecturer/question-bank" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back to Question Bank
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<PagePlaceholder title="Essay Question" />
</main>
