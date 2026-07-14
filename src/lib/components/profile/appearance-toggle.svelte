<!-- src/lib/components/profile/appearance-toggle.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	// Mirrors the exact bootstrap logic in app.html's inline <script> —
	// same localStorage key ('theme'), same data-theme attribute, same
	// .dark class toggle — so this stays in sync with the flash-prevention
	// script and doesn't introduce a second, competing theme mechanism.
	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		theme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light';
	});

	function setTheme(next: 'light' | 'dark') {
		theme = next;
		document.documentElement.setAttribute('data-theme', next);
		document.documentElement.classList.toggle('dark', next === 'dark');
		try {
			localStorage.setItem('theme', next);
		} catch {}
	}
</script>

<div class="flex gap-2">
	<Button variant={theme === 'light' ? 'default' : 'outline'} onclick={() => setTheme('light')} class="gap-2">
		<Sun class="size-4" />
		Light
	</Button>
	<Button variant={theme === 'dark' ? 'default' : 'outline'} onclick={() => setTheme('dark')} class="gap-2">
		<Moon class="size-4" />
		Dark
	</Button>
</div>