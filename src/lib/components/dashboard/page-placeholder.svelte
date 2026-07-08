<script lang="ts">
	import { Card } from '$lib/components/ui/card/index.js';
	import Construction from '@lucide/svelte/icons/construction';

	let { title }: { title: string } = $props();
</script>

<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
	<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
		<Construction class="size-5" />
	</div>
	<div>
		<p class="text-base font-semibold">{title}</p>
		<p class="mt-1 text-sm text-muted-foreground">This screen is scaffolded and ready to be built out next.</p>
	</div>
</Card>
