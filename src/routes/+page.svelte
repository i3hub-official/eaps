<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

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
</script>

<svelte:head>
	<title>ASSESS — MOUAU Assessment & Evaluation System</title>
</svelte:head>

<div class="min-h-svh bg-background text-foreground">
	<!-- Header -->
	<header class="border-b border-border">
		<div class="flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
			<div class="flex items-center gap-2.5">
				<div class="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
					M
				</div>
				<span class="text-sm font-semibold tracking-tight">
					ASSESS <span class="font-normal text-muted-foreground">· MOUAU</span>
				</span>
			</div>
			<div class="flex items-center gap-3">
				<ThemeToggle />
				<a href="/login" class="text-sm font-medium text-foreground hover:text-primary">Sign in</a>
			</div>
		</div>
	</header>

	<!-- Hero -->
	<section class="px-6 py-16 md:px-12 md:py-24 lg:px-20">
		<div class="grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center lg:gap-20">
			<div>
				<p class="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
					Michael Okpara University of Agriculture, Umudike
				</p>
				<h1
					class="text-4xl leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
					style="font-family: 'Fraunces', ui-serif, Georgia, serif; font-weight: 560;"
				>
					One platform, three stages of readiness.
				</h1>
				<p class="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
					ASSESS carries a student from practice questions to timed self-tests to
					invigilated examinations — the same courses, the same question bank, increasing
					stakes.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<Button href="/login" size="lg">
						Sign in to continue
						<ArrowRight class="size-4" />
					</Button>
					<Button href="/register" variant="outline" size="lg">
						Register
					</Button>
				</div>
			</div>

			<!-- Signature element: exam script cover sheet motif -->
			<div class="relative md:justify-self-end md:w-full md:max-w-sm">
				<div class="rounded-sm border border-border bg-card p-6 shadow-sm">
					<div class="flex items-center justify-between border-b border-dashed border-border pb-3">
						<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
							Answer Script
						</span>
						<span class="font-mono text-[10px] text-muted-foreground">Serial No. —</span>
					</div>
					<dl class="mt-4 space-y-3">
						<div class="flex items-baseline justify-between border-b border-border/60 pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Candidate Name</dt>
							<dd class="h-3 w-28 border-b border-dotted border-muted-foreground/40"></dd>
						</div>
						<div class="flex items-baseline justify-between border-b border-border/60 pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Matric No.</dt>
							<dd class="h-3 w-28 border-b border-dotted border-muted-foreground/40"></dd>
						</div>
						<div class="flex items-baseline justify-between border-b border-border/60 pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Course Code</dt>
							<dd class="h-3 w-28 border-b border-dotted border-muted-foreground/40"></dd>
						</div>
						<div class="flex items-baseline justify-between pb-1.5">
							<dt class="font-mono text-[10px] uppercase text-muted-foreground">Session</dt>
							<dd class="h-3 w-28 border-b border-dotted border-muted-foreground/40"></dd>
						</div>
					</dl>
					<p class="mt-5 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
						Every session on ASSESS is bound to a verified identity and a fixed time
						window, whether practice, test, or examination.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Three modes -->
	<section class="border-t border-border bg-card">
		<div class="px-6 py-16 md:px-12 lg:px-20">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How assessment works here</h2>
			<div class="mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
				{#each modes as m}
					<div class="bg-card p-6 lg:p-8">
						<div class="flex items-center justify-between">
							<span class="font-mono text-xs text-muted-foreground">{m.n}</span>
							<m.Icon class="size-4 text-primary" />
						</div>
						<h3 class="mt-4 text-base font-semibold">{m.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Access -->
	<section class="px-6 py-16 md:px-12 lg:px-20">
		<div class="grid gap-8 md:grid-cols-2 lg:gap-16">
			<div>
				<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Who this is for</h2>
				<p class="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
					Students, lecturers, invigilators, HODs, and deans each get a portal scoped to
					what they're responsible for — setting papers, granting exam authority,
					invigilating a hall, or sitting a test.
				</p>
			</div>
			<div>
				<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Getting in</h2>
				<p class="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
					Sign in with your university email or matric number. New students register with
					their admission details and are verified against departmental records before
					first access.
				</p>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-border">
		<div class="flex flex-col gap-2 px-6 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-12 lg:px-20">
			<span>ASSESS — Assessment & Evaluation System, Michael Okpara University of Agriculture, Umudike</span>
			<div class="flex gap-4">
				<a href="/login" class="hover:text-primary">Sign in</a>
				<a href="/register" class="hover:text-primary">Register</a>
			</div>
		</div>
	</footer>
</div>