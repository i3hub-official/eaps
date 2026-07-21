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
	import { fly } from 'svelte/transition';

	const modes = [
		{
			n: '01',
			title: 'Practice',
			desc: 'Build confidence through unlimited self-paced practice. Work on past questions and topic-specific sets with instant feedback — no timer, no pressure, no records.',
			Icon: PenLine,
			tag: 'Learn without limits'
		},
		{
			n: '02',
			title: 'Test',
			desc: 'Simulate real exam conditions with timed, graded assessments. Results are automatically recorded to help you track progress and identify improvement areas.',
			Icon: ClipboardCheck,
			tag: 'Track your progress'
		},
		{
			n: '03',
			title: 'Examination',
			desc: 'Secure, identity-verified, and proctored exams for continuous assessment and final examinations. Full invigilation and time-locked integrity.',
			Icon: ShieldCheck,
			tag: 'Exam-ready integrity'
		}
	];

	let navigatingTo = $state<string | null>(null);

	async function handleNavigation(path: string) {
		if (navigatingTo) return;
		navigatingTo = path;
		try {
			await goto(path);
		} finally {
			navigatingTo = null;
		}
	}
</script>

<svelte:head>
	<title>EAPS — MOUAU | Evaluation, Assessment & Proctoring System</title>
	<meta
		name="description"
		content="Michael Okpara University of Agriculture Umudike's official platform for practice, testing, and secure examinations."
	/>
</svelte:head>

<div class="min-h-svh bg-background text-foreground">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md"
	>
		<div
			class="flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 lg:px-20"
		>
			<div class="flex items-center gap-3">
				<div
					class="flex size-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm"
				>
					E
				</div>
				<div>
					<span class="text-xl font-semibold tracking-tighter">EAPS</span>
					<span class="hidden text-sm font-normal text-muted-foreground sm:inline">
						• MOUAU
					</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<ThemeToggle />
				<Button
					variant="ghost"
					size="sm"
					onclick={() => handleNavigation('/login')}
					class="font-medium"
					disabled={!!navigatingTo}
				>
					Sign in
				</Button>
			</div>
		</div>
	</header>

	<!-- Hero -->
	<section
		class="relative overflow-hidden px-4 py-16 sm:px-6 md:px-12 lg:px-20 lg:py-24"
	>
		<div class="mx-auto max-w-screen-2xl">
			<div class="grid gap-12 md:grid-cols-2 md:items-center lg:gap-20">
				<div class="space-y-6">
					<div
						class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs tracking-widest text-muted-foreground"
					>
						MICHAEL OKPARA UNIVERSITY OF AGRICULTURE, UMUDIKE
					</div>

					<h1
						class="text-balance text-4xl font-bold leading-[1.05] tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
						style="font-family: 'Fraunces', ui-serif, Georgia, serif;"
					>
						One platform.<br />Three stages.<br />
						<span class="text-primary">Total readiness.</span>
					</h1>

					<p class="max-w-lg text-lg leading-relaxed text-muted-foreground">
						EAPS seamlessly progresses students from unlimited practice to timed
						self-tests and finally to secure, invigilated examinations — all within
						the same trusted question bank.
					</p>

					<div class="flex flex-col gap-4 pt-4 sm:flex-row">
						<Button
							onclick={() => handleNavigation('/login')}
							size="lg"
							class="h-14 text-base font-semibold shadow-lg transition-shadow hover:shadow-xl"
							disabled={!!navigatingTo}
						>
							{#if navigatingTo === '/login'}
								<LoaderCircle class="mr-3 size-5 animate-spin" />
								Signing in...
							{:else}
								Sign in to continue
								<ArrowRight class="ml-3 size-5" />
							{/if}
						</Button>

						<Button
							onclick={() => handleNavigation('/register')}
							variant="outline"
							size="lg"
							class="h-14 text-base"
							disabled={!!navigatingTo}
						>
							{#if navigatingTo === '/register'}
								<LoaderCircle class="mr-3 size-5 animate-spin" />
								Processing...
							{:else}
								Create account
							{/if}
						</Button>
					</div>

					<!-- Social Proof -->
					<div class="flex items-center gap-6 pt-2">
						<div class="flex -space-x-2">
							<div
								class="size-8 rounded-full border-2 border-background bg-primary/20"
							></div>
							<div
								class="size-8 rounded-full border-2 border-background bg-primary/30"
							></div>
							<div
								class="size-8 rounded-full border-2 border-background bg-primary/40"
							></div>
							<div
								class="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium"
							>
								+2k
							</div>
						</div>
						<span class="text-xs text-muted-foreground"
							>Students already enrolled</span
						>
					</div>

					<p class="flex items-center gap-2 text-xs text-muted-foreground">
						<span class="inline-block h-px w-8 bg-border"></span>
						Secured by e2e identity verification
					</p>
				</div>

				<!-- Exam Script Motif -->
				<div class="relative flex justify-center md:justify-end">
					<div
						class="w-full max-w-95 rounded-2xl border border-border bg-card p-8 shadow-xl transition-all hover:-rotate-1"
					>
						<div
							class="flex items-center justify-between border-b border-dashed border-border pb-4"
						>
							<div
								class="font-mono text-xs uppercase tracking-[0.125em] text-muted-foreground"
							>
								Official Answer Booklet
							</div>
							<div class="font-mono text-[10px] text-muted-foreground">
								SN: TYF4R26-27/••••
							</div>
						</div>

						<div class="mt-6 space-y-5">
							<div class="flex items-baseline justify-between">
								<span
									class="font-mono text-xs uppercase tracking-widest text-muted-foreground"
									>Candidate</span
								>
								<div
									class="mx-3 h-px flex-1 border-b border-dotted border-border"
								></div>
								<span class="text-sm font-medium">________________</span>
							</div>
							<div class="flex items-baseline justify-between">
								<span
									class="font-mono text-xs uppercase tracking-widest text-muted-foreground"
									>Matric No.</span
								>
								<div
									class="mx-3 h-px flex-1 border-b border-dotted border-border"
								></div>
								<span class="text-sm font-medium">________________</span>
							</div>
							<div class="flex items-baseline justify-between">
								<span
									class="font-mono text-xs uppercase tracking-widest text-muted-foreground"
									>Course</span
								>
								<div
									class="mx-3 h-px flex-1 border-b border-dotted border-border"
								></div>
								<span class="text-sm font-medium">________________</span>
							</div>
							<div class="flex items-baseline justify-between">
								<span
									class="font-mono text-xs uppercase tracking-widest text-muted-foreground"
									>Session</span
								>
								<div
									class="mx-3 h-px flex-1 border-b border-dotted border-border"
								></div>
								<span class="text-sm font-medium">2026/2027</span>
							</div>
						</div>

						<div
							class="mt-8 border-t border-border pt-6 text-center text-[10px] leading-relaxed text-muted-foreground"
						>
							Every activity on EAPS is tied to your verified identity and the
							official examination calendar.
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Three Modes -->
	<section class="border-t border-border bg-card py-16">
		<div class="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-12 lg:px-20">
			<div class="mb-12 text-center">
				<span
					class="inline-block rounded-full bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
				>
					How EAPS Works
				</span>
			</div>

			<div class="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
				{#each modes as m, i (m.n)}
					<div
						in:fly={{ duration: 600, delay: i * 100, y: 20 }}
						class="group flex flex-col bg-card p-10 transition-all duration-300 hover:bg-muted/60"
					>
						<div class="mb-8 flex items-center justify-between">
							<div
								class="font-mono text-4xl font-bold text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/50"
							>
								{m.n}
							</div>
							<m.Icon
								class="size-8 text-primary/70 transition-colors group-hover:text-primary"
							/>
						</div>

						<h3
							class="mb-4 text-3xl font-bold tracking-tight"
							style="font-family: 'Fraunces', ui-serif, Georgia, serif;"
						>
							{m.title}
						</h3>

						<p class="flex-1 text-[15px] leading-relaxed text-muted-foreground">
							{m.desc}
						</p>

						<div class="mt-8 border-t border-border pt-8">
							<span
								class="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"
							>
								<span class="h-px w-4 bg-border"></span>
								{m.tag}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- For Whom / Access -->
	<section class="bg-background px-4 py-20 sm:px-6 md:px-12 lg:px-20">
		<div class="mx-auto max-w-screen-2xl">
			<!-- Section header -->
			<div class="mb-12 text-center">
				<span
					class="inline-block rounded-full bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
				>
					Built for everyone
				</span>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<!-- Card 1: Students -->
				<div
					class="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/20 hover:shadow-lg"
				>
					<div class="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					</div>
					<h3 class="mb-2 text-xl font-bold">Students</h3>
					<p class="text-sm leading-relaxed text-muted-foreground">
						Practice, test, and sit for examinations with a seamless progression from
						learning to assessment.
					</p>
				</div>

				<!-- Card 2: Lecturers & Staff -->
				<div
					class="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/20 hover:shadow-lg"
				>
					<div class="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<h3 class="mb-2 text-xl font-bold">Lecturers & Staff</h3>
					<p class="text-sm leading-relaxed text-muted-foreground">
						Design question banks, review submissions, invigilate sessions, and manage
						academic records across departments.
					</p>
				</div>

				<!-- Card 3: Administrators -->
				<div
					class="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/20 hover:shadow-lg"
				>
					<div class="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
						</svg>
					</div>
					<h3 class="mb-2 text-xl font-bold">Administrators</h3>
					<p class="text-sm leading-relaxed text-muted-foreground">
						Oversee academic integrity, generate reports, and maintain system-wide
						oversight of all assessment activities.
					</p>
				</div>
			</div>

			<!-- Access row -->
			<div class="mt-12 rounded-2xl border border-border bg-card/50 p-8 text-center">
				<div class="flex flex-col items-center gap-4 md:flex-row md:justify-between md:text-left">
					<div>
						<h3 class="text-lg font-semibold">Simple & secure access</h3>
						<p class="text-sm text-muted-foreground">
							Sign in with your MOUAU email or matriculation number. New students are
							verified against official admission records before gaining full access.
						</p>
					</div>
					<Button
						onclick={() => handleNavigation('/register')}
						variant="outline"
						class="shrink-0"
						disabled={!!navigatingTo}
					>
						Get started
						<ArrowRight class="ml-2 size-4" />
					</Button>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-border bg-card">
		<div
			class="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 md:px-12 lg:px-20"
		>
			<div
				class="flex flex-col items-center gap-8 md:flex-row md:items-end md:justify-between"
			>
				<div class="text-center md:text-left">
					<div class="mb-3 flex items-center justify-center gap-3 md:justify-start">
						<div
							class="flex size-8 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground"
						>
							E
						</div>
						<div class="font-semibold">EAPS — MOUAU</div>
					</div>
					<p class="text-sm text-muted-foreground">
						Michael Okpara University of Agriculture, Umudike
					</p>
				</div>

				<div class="flex items-center gap-3 text-sm text-muted-foreground">
					<span>Powered by</span>
					<span class="font-medium text-foreground">R3Ai</span>
				</div>
			</div>

			<div
				class="mt-12 border-t border-border pt-8 text-center text-xs text-muted-foreground/70"
			>
				© {new Date().getFullYear()} Evaluation Assessment &amp; Proctor System. All
				rights reserved.
			</div>
		</div>
	</footer>
</div>