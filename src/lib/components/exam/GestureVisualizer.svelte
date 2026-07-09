<!-- src/lib/components/exam/GestureVisualizer.svelte -->
<script lang="ts">
	type GestureIcon = 'left' | 'right' | 'blink' | 'nod' | 'mouth';

	let {
		icon,
		active = false,
		size = 'md',
	}: {
		icon: GestureIcon;
		active?: boolean;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const iconPaths: Record<GestureIcon, string> = {
		left:  'M15 18l-6-6 6-6',
		right: 'M9 18l6-6-6-6',
		blink: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
		nod:   'M12 5v14M5 12l7-7 7 7',
		mouth: 'M8 14s1.5 2 4 2 4-2 4-2',
	};
</script>

<div class="gv-badge {size}" class:active>
	<svg
		class="gv-icon"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#if icon === 'blink'}
			<path d={iconPaths[icon]} />
			<circle cx="12" cy="12" r="3" />
		{:else if icon === 'mouth'}
			<circle cx="12" cy="12" r="10" />
			<path d={iconPaths[icon]} />
		{:else}
			<path d={iconPaths[icon]} />
		{/if}
	</svg>
</div>

<style>
	/* ── Theme tokens (shared naming convention with FaceEnrollmentModal) ───── */
	:global(:root),
	:global([data-theme='light']) {
		--gv-border-idle: rgba(0, 0, 0, 0.12);
		--gv-bg-idle:     #ffffff;
		--gv-text-idle:   #64748b;

		--gv-border-active: #00c9a7;
		--gv-bg-active:     rgba(0, 201, 167, 0.1);
		--gv-text-active:   #059669;
	}

	:global([data-theme='dark']),
	:global(.dark) {
		--gv-border-idle: rgba(255, 255, 255, 0.14);
		--gv-bg-idle:     rgba(255, 255, 255, 0.04);
		--gv-text-idle:   rgba(255, 255, 255, 0.45);

		--gv-border-active: #00c9a7;
		--gv-bg-active:     rgba(0, 201, 167, 0.15);
		--gv-text-active:   #00c9a7;
	}

	/* ── Badge ────────────────────────────────────────────────────────────── */
	.gv-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 2px solid var(--gv-border-idle);
		background: var(--gv-bg-idle);
		color: var(--gv-text-idle);
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.gv-badge.active {
		border-color: var(--gv-border-active);
		background: var(--gv-bg-active);
		color: var(--gv-text-active);
		box-shadow: 0 0 0 4px rgba(0, 201, 167, 0.08);
	}

	.gv-icon {
		stroke: currentColor;
	}

	/* ── Sizes ────────────────────────────────────────────────────────────── */
	.gv-badge.sm { width: 2rem; height: 2rem; }
	.gv-badge.sm .gv-icon { width: 1rem; height: 1rem; }

	.gv-badge.md { width: 3rem; height: 3rem; }
	.gv-badge.md .gv-icon { width: 1.5rem; height: 1.5rem; }

	.gv-badge.lg { width: 4rem; height: 4rem; }
	.gv-badge.lg .gv-icon { width: 2rem; height: 2rem; }

	@media (prefers-reduced-motion: reduce) {
		.gv-badge { transition: none; }
	}
</style>