<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Radio from '@lucide/svelte/icons/radio';
	import Settings from '@lucide/svelte/icons/settings';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	const portals = [
		{
			href: '/student',
			label: 'Student portal',
			description: 'Courses, practice, assignments, exams, and results',
			icon: GraduationCap
		},
		{
			href: '/exam-officer',
			label: 'Examination office',
			description: 'Create, schedule, approve, and grade assessments',
			icon: ClipboardList
		},
		{
			href: '/invigilator',
			label: 'Invigilation console',
			description: 'Monitor live candidates, devices, and flagged sessions',
			icon: Radio
		},
		{
			href: '/admin',
			label: 'Administration',
			description: 'Institution-wide oversight, analytics, and reporting',
			icon: Settings
		}
	];
</script>

<svelte:head>
	<title>MOUAU e-Test</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="flex items-center justify-between border-b px-6 py-4 sm:px-10">
		<div class="flex items-center gap-2.5">
			<div class="flex size-8 items-center justify-center rounded-md bg-primary">
				<ShieldCheck class="size-4.5 text-primary-foreground" />
			</div>
			<span class="text-sm font-semibold">MOUAU e-Test</span>
		</div>
		<Button href="/login" variant="outline" size="sm">Sign in</Button>
	</header>

	<main class="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16 sm:px-10">
		<div class="flex max-w-xl flex-col items-center gap-3 text-center">
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
				Michael Okpara University <br /> e-Test
			</h1>
			<p class="text-muted-foreground">
				Secure computer-based testing, invigilation, and results management for the university
				community.
			</p>
		</div>

		<div class="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
			{#each portals as p (p.href)}
				<a href={p.href} class="group block focus-visible:outline-none">
					<Card.Root class="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/50">
						<Card.Header>
							<div class="flex items-start gap-3">
								<div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
									<p.icon class="size-4.5" />
								</div>
								<div class="flex flex-col gap-0.5">
									<Card.Title>{p.label}</Card.Title>
									<Card.Description>{p.description}</Card.Description>
								</div>
							</div>
						</Card.Header>
						<Card.Content>
							<span class="flex items-center gap-1 text-sm font-medium text-primary">
								Enter
								<ArrowRight class="size-3.5 transition-transform group-hover:translate-x-0.5" />
							</span>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>

		<p class="text-xs text-muted-foreground">
			Staff and students should sign in via
			<a href="/login" class="font-medium text-primary hover:underline">the login page</a>.
		</p>
	</main>

	<footer class="border-t px-6 py-4 text-center text-xs text-muted-foreground sm:px-10">
		© {new Date().getFullYear()} Michael Okpara University of Agriculture, Umudike
	</footer>
</div>
