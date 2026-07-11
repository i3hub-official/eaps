<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { LoaderCircle } from '@lucide/svelte/icons';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const modes = [
		{
			n: '01',
			title: 'Practice',
			desc: 'Work through past questions and topic sets at your own pace. Untimed, ungraded, no record kept.',
			Icon: PenLine
		},
		{
			n: '02',
			title: 'Test',
			desc: 'Timed self-assessment under close-to-real conditions. Results are recorded to track your progress.',
			Icon: ClipboardCheck
		},
		{
			n: '03',
			title: 'Examination',
			desc: 'Invigilated, identity-verified, and time-locked. Used for continuous assessment and end-of-semester exams.',
			Icon: ShieldCheck
		}
	];

	let isNavigating = $state(false);

	async function handleNavigation(path: string) {
		if (isNavigating) return;
		isNavigating = true;
		try {
			await goto(path);
		} finally {
			isNavigating = false;
		}
	}
</script>

<svelte:head>
	<title>EAPS — MOUAU - Evaluation Assessment & Proctor System</title>
</svelte:head>

<div class="min-h-svh bg-background text-foreground">
	<!-- Header -->
	<header class="border-b border-border">
		<div class="flex items-center justify-between px-4 py-3 sm:px-6 md:px-12 lg:px-20 md:py-4">
			<div class="flex items-center gap-2.5">
				<div class="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
					E
				</div>
				<span class="text-sm font-semibold tracking-tight">
					EAPS <span class="font-normal text-muted-foreground hidden sm:inline">· MOUAU</span>
				</span>
			</div>
			<div class="flex items-center gap-2 sm:gap-3">
				<ThemeToggle />
				<Button 
					variant="ghost" 
					size="sm" 
					onclick={() => handleNavigation('/login')}
					disabled={isNavigating}
					class="text-sm font-medium"
				>
					{#if isNavigating}
						<LoaderCircle class="mr-2 size-3 animate-spin" />
					{/if}
					Sign in
				</Button>
			</div>
		</div>
	</header>

	<!-- Hero -->
	<section class="px-4 py-12 sm:px-6 md:px-12 md:py-16 lg:px-20 lg:py-24">
		<div class="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center lg:gap-16">
			<div>
				<p class="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:text-xs">
					Michael Okpara University of Agriculture, Umudike
				</p>
				<h1
					class="text-3xl leading-[1.08] tracking-tight sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl"
					style="font-family: 'Fraunces', ui-serif, Georgia, serif; font-weight: 560;"
				>
					One platform, three stages of readiness.
				</h1>
				<p class="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px] lg:text-base">
					EAPS carries a student from practice questions to timed self-tests to
					invigilated examinations — the same courses, the same question bank, increasing
					stakes.
				</p>
				<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
					<Button 
						onclick={() => handleNavigation('/login')} 
						size="lg" 
						class="h-11 w-full text-sm sm:w-auto md:h-12 md:text-base"
						disabled={isNavigating}
					>
						{#if isNavigating}
							<LoaderCircle class="mr-2 size-4 animate-spin" />
							Loading…
						{:else}
							Sign in to continue
							<ArrowRight class="size-4" />
						{/if}
					</Button>
					<Button 
						onclick={() => handleNavigation('/register')} 
						variant="outline" 
						size="lg" 
						class="h-11 w-full text-sm sm:w-auto md:h-12 md:text-base"
						disabled={isNavigating}
					>
						Register
					</Button>
				</div>
			</div>

			<!-- Signature element: exam script cover sheet motif -->
			<div class="relative md:justify-self-end md:w-full md:max-w-sm">
				<div class="rounded-sm border border-border bg-card p-4 shadow-sm sm:p-6">
					<div class="flex items-center justify-between border-b border-dashed border-border pb-2 sm:pb-3">
						<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
							Answer Script
						</span>
						<span class="font-mono text-[10px] text-muted-foreground">Serial No. —</span>
					</div>
					<dl class="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
						<div class="flex items-baseline justify-between border-b border-border/60 pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Candidate Name</dt>
							<dd class="h-3 w-20 border-b border-dotted border-muted-foreground/40 sm:w-28"></dd>
						</div>
						<div class="flex items-baseline justify-between border-b border-border/60 pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Matric No.</dt>
							<dd class="h-3 w-20 border-b border-dotted border-muted-foreground/40 sm:w-28"></dd>
						</div>
						<div class="flex items-baseline justify-between border-b border-border/60 pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Course Code</dt>
							<dd class="h-3 w-20 border-b border-dotted border-muted-foreground/40 sm:w-28"></dd>
						</div>
						<div class="flex items-baseline justify-between pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Session</dt>
							<dd class="h-3 w-20 border-b border-dotted border-muted-foreground/40 sm:w-28"></dd>
						</div>
					</dl>
					<p class="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground sm:mt-5">
						Every session on EAPS is bound to a verified identity and a fixed time
						window, whether practice, test, or examination.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Three modes -->
	<section class="border-t border-border bg-card">
		<div class="px-4 py-12 sm:px-6 md:px-12 md:py-16 lg:px-20">
			<h2 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
				How assessment works here
			</h2>
			<div class="mt-6 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3 sm:mt-8">
				{#each modes as m}
					<div class="bg-card p-4 sm:p-6 lg:p-8">
						<div class="flex items-center justify-between">
							<span class="font-mono text-xs text-muted-foreground">{m.n}</span>
							<m.Icon class="size-4 text-primary" />
						</div>
						<h3 class="mt-3 text-base font-semibold sm:mt-4">{m.title}</h3>
						<p class="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-2">{m.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Access -->
	<section class="px-4 py-12 sm:px-6 md:px-12 md:py-16 lg:px-20">
		<div class="grid gap-6 md:grid-cols-2 lg:gap-12">
			<div>
				<h2 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
					Who this is for
				</h2>
				<p class="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-3">
					Students, lecturers, invigilators, HODs, and deans each get a portal scoped to
					what they're responsible for — setting papers, granting exam authority,
					invigilating a hall, or sitting a test.
				</p>
			</div>
			<div>
				<h2 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
					Getting in
				</h2>
				<p class="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-3">
					Sign in with your university email or matric number. New students register with
					their admission details and are verified against departmental records before
					first access.
				</p>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-border bg-card/50">
		<div class="px-4 py-8 sm:px-6 md:px-12 md:py-10 lg:px-20">
			<div class="flex flex-col items-center gap-4 md:flex-row md:justify-between">
				<!-- Left: Brand & Description -->
				<div class="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
					<div class="flex items-center gap-2">
						<div class="flex size-6 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
							EAPS
						</div>
						<span class="text-xs font-semibold text-foreground">
							MOUAU - Evaluation Assessment & Proctor System
						</span>
					</div>
					<p class="text-[10px] text-muted-foreground/70 sm:text-[11px]">
						Michael Okpara University of Agriculture, Umudike
					</p>
				</div>

				<!-- Center: Built by REAi -->
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<span class="h-px w-4 bg-border sm:w-6"></span>
					<span><span class="font-medium text-foreground">REAi</span></span>
					<span class="h-px w-4 bg-border sm:w-6"></span>
				</div>
			</div>

			<!-- Bottom: Copyright -->
			<div class="mt-4 border-t border-border/50 pt-4 text-center text-[10px] text-muted-foreground/60 md:text-left">
				&copy; {new Date().getFullYear()} EAPS — All rights reserved. MOUAU - Evaluation Assessment & Proctor System
			</div>
		</div>
	</footer>
</div>