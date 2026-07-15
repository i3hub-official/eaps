<!-- src/routes/(lecturer)/lecturer/question-bank/create/true-false/+page.svelte -->
<script lang="ts">
	import { Topbar, PagePlaceholder } from '$lib/components/dashboard';
		import { Button } from '$lib/components/ui/button/index.js'
	import {
		ArrowLeft,
	} from '@lucide/svelte/icons'
</script>

<svelte:head>
	<title>Create True/False Question — EAPS</title>
</svelte:head>

<Topbar title="Create True/False Question" description="Create a question with a true or false answer">
	{#snippet actions()}
		<Button href="/lecturer/question-bank" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back to Question Bank
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<PagePlaceholder title="True/False Question" />
</main>