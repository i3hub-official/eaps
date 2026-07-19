<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { ThemeToggle } from '$lib/components/ui/theme-toggle/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { PenLine, ClipboardCheck, ShieldCheck, LoaderCircle, ArrowRight } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	const modes = [
		{
			n: '01',
			title: 'Practice',
			desc: 'Work through past questions and topic sets at your own pace. Untimed, ungraded, no record kept.',
			Icon: PenLine,
		},
		{
			n: '02',
			title: 'Test',
			desc: 'Timed self-assessment under close-to-real conditions. Results are recorded to track your progress.',
			Icon: ClipboardCheck,
		},
		{
			n: '03',
			title: 'Examination',
			desc: 'Invigilated, identity-verified, and time-locked. Used for continuous assessment and end-of-semester exams.',
			Icon: ShieldCheck,
		},
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
	<title>EAPS — MOUAU · Evaluation, Assessment &amp; Proctor System</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="root">

	<!-- ─── Header ─────────────────────────────────────────────────────────── -->
	<header class="site-header">
		<div class="site-header-inner">
			<div class="logo">
				<!-- amber accent #1: the logo mark -->
				<div class="logo-mark" aria-hidden="true">E</div>
				<span class="logo-wordmark">
					EAPS
					<span class="logo-sub">· MOUAU</span>
				</span>
			</div>

			<div class="header-actions">
				<ThemeToggle />
				<button
					class="signin-btn"
					onclick={() => handleNavigation('/login')}
					disabled={isNavigating}
				>
					{#if isNavigating}
						<LoaderCircle class="size-3 animate-spin" />
					{/if}
					Sign in
				</button>
			</div>
		</div>
	</header>

	<!-- ─── Hero ───────────────────────────────────────────────────────────── -->
	<section class="hero">
		<div class="hero-inner">

			<div class="hero-copy">
				<p class="hero-eyebrow">
					Michael Okpara University of Agriculture, Umudike
				</p>

				<h1 class="hero-headline">
					One platform,<br />
					<em>three stages</em><br />
					of readiness.
				</h1>

				<p class="hero-body">
					EAPS carries a student from practice questions to timed self-tests to
					invigilated examinations — the same courses, the same question bank,
					increasing stakes.
				</p>

				<div class="hero-ctas">
					<!-- amber accent #2: primary CTA -->
					<button
						class="cta-primary"
						onclick={() => handleNavigation('/login')}
						disabled={isNavigating}
					>
						{#if isNavigating}
							<LoaderCircle class="size-4 animate-spin" />
							Loading…
						{:else}
							Sign in to continue
							<ArrowRight class="size-4" />
						{/if}
					</button>

					<button
						class="cta-secondary"
						onclick={() => handleNavigation('/register')}
						disabled={isNavigating}
					>
						Register
					</button>
				</div>
			</div>

			<!-- Answer script card — amber accent #3: the stamp/serial mark -->
			<div class="script-wrap" aria-hidden="true">
				<div class="script-card">
					<div class="script-noise"></div>

					<div class="script-top">
						<span class="script-label">Answer Script</span>
						<span class="script-serial">EAPS / {new Date().getFullYear()}</span>
					</div>

					<dl class="script-fields">
						{#each ['Candidate Name', 'Matric No.', 'Course Code', 'Department', 'Session'] as field}
							<div class="script-field">
								<dt>{field}</dt>
								<dd></dd>
							</div>
						{/each}
					</dl>

					<div class="script-footer">
						<p>
							Every session is bound to a verified identity and a fixed time
							window — whether practice, test, or examination.
						</p>
						<!-- amber accent #3: stamp -->
						<div class="script-stamp">
							<span class="script-stamp-text">EAPS</span>
							<span class="script-stamp-sub">VERIFIED</span>
						</div>
					</div>
				</div>
				<!-- Shadow stack — stacked paper effect -->
				<div class="script-shadow script-shadow-1" aria-hidden="true"></div>
				<div class="script-shadow script-shadow-2" aria-hidden="true"></div>
			</div>
		</div>
	</section>

	<!-- ─── Three modes ─────────────────────────────────────────────────────── -->
	<section class="modes-section">
		<div class="modes-inner">
			<h2 class="section-label">How assessment works here</h2>

			<div class="modes-grid">
				{#each modes as m, i}
					<div class="mode-card">
						<div class="mode-top">
							<span class="mode-num">{m.n}</span>
							<m.Icon class="mode-icon" />
						</div>
						<h3 class="mode-title">{m.title}</h3>
						<p class="mode-desc">{m.desc}</p>
						<!-- Divider between cards on mobile -->
						{#if i < modes.length - 1}
							<div class="mode-divider" aria-hidden="true"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ─── Who / Getting in ────────────────────────────────────────────────── -->
	<section class="info-section">
		<div class="info-inner">
			<div class="info-block">
				<h2 class="section-label">Who this is for</h2>
				<p class="info-body">
					Students, lecturers, invigilators, HODs, and deans each get a portal
					scoped to what they're responsible for — setting papers, granting exam
					authority, invigilating a hall, or sitting a test.
				</p>
			</div>
			<div class="info-block">
				<h2 class="section-label">Getting in</h2>
				<p class="info-body">
					Sign in with your university email or matric number. New students
					register with their admission details and are verified against
					departmental records before first access.
				</p>
			</div>
		</div>
	</section>

	<!-- ─── Footer ─────────────────────────────────────────────────────────── -->
	<footer class="site-footer">
		<div class="site-footer-inner">
			<div class="footer-brand">
				<div class="logo">
					<div class="logo-mark logo-mark--sm" aria-hidden="true">E</div>
					<span class="logo-wordmark logo-wordmark--sm">
						EAPS · MOUAU
					</span>
				</div>
				<p class="footer-sub">
					Michael Okpara University of Agriculture, Umudike
				</p>
			</div>

			<p class="footer-built">
				Built by <strong>REAi</strong>
			</p>
		</div>

		<div class="footer-copy">
			&copy; {new Date().getFullYear()} EAPS — Evaluation, Assessment &amp; Proctor System.
			All rights reserved.
		</div>
	</footer>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&display=swap');

	/* ─── Tokens ───────────────────────────────────────────────────────────── */
	:root {
		--gold: #f59e0b;
		--gold-dim: rgba(245, 158, 11, 0.15);
		--gold-border: rgba(245, 158, 11, 0.3);
		--ink: #0f172a;
		--ink-mid: #334155;
		--ink-muted: #64748b;
		--ink-faint: #94a3b8;
		--paper: #f8fafc;
		--card-dark: #0f172a;
		--card-dark-2: #1e293b;
	}

	/* ─── Root ─────────────────────────────────────────────────────────────── */
	.root {
		min-height: 100svh;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		display: flex;
		flex-direction: column;
	}

	/* ─── Header ───────────────────────────────────────────────────────────── */
	.site-header {
		border-bottom: 1px solid hsl(var(--border));
		position: sticky;
		top: 0;
		z-index: 40;
		background: hsl(var(--background) / 0.92);
		backdrop-filter: blur(8px);
	}

	.site-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.5rem;
		max-width: 1280px;
		margin: 0 auto;
		width: 100%;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	/* amber accent #1 */
	.logo-mark {
		width: 2rem;
		height: 2rem;
		border-radius: 0.4rem;
		background: var(--gold);
		color: #000;
		font-size: 0.75rem;
		font-weight: 900;
		font-family: 'Playfair Display', Georgia, serif;
		display: flex;
		align-items: center;
		justify-content: center;
		letter-spacing: 0;
		flex-shrink: 0;
	}

	.logo-mark--sm {
		width: 1.4rem;
		height: 1.4rem;
		font-size: 0.6rem;
		border-radius: 0.25rem;
	}

	.logo-wordmark {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: hsl(var(--foreground));
	}

	.logo-wordmark--sm {
		font-size: 0.78rem;
	}

	.logo-sub {
		font-weight: 400;
		color: hsl(var(--muted-foreground));
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.signin-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		background: none;
		border: 1px solid hsl(var(--border));
		border-radius: 0.45rem;
		padding: 0.45rem 1rem;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.signin-btn:hover {
		border-color: var(--gold);
		background: var(--gold-dim);
	}

	.signin-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	/* ─── Hero ─────────────────────────────────────────────────────────────── */
	.hero {
		flex: 1;
		padding: 5rem 1.5rem 4rem;
	}

	.hero-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1.15fr 0.85fr;
		gap: 5rem;
		align-items: center;
	}

	.hero-eyebrow {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: hsl(var(--muted-foreground));
		margin-bottom: 1.25rem;
	}

	.hero-headline {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: clamp(2.8rem, 6vw, 5rem);
		font-weight: 900;
		line-height: 1.04;
		letter-spacing: -0.02em;
		color: hsl(var(--foreground));
		margin: 0 0 1.5rem;
	}

	/* italic "three stages" — the one typographic flourish */
	.hero-headline em {
		font-style: italic;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.hero-body {
		max-width: 440px;
		font-size: 1rem;
		line-height: 1.7;
		color: hsl(var(--muted-foreground));
		margin: 0 0 2rem;
	}

	.hero-ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	/* amber accent #2 */
	.cta-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: #000;
		background: var(--gold);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: opacity 0.15s ease, transform 0.15s ease;
		white-space: nowrap;
	}

	.cta-primary:hover { opacity: 0.9; transform: translateY(-1px); }
	.cta-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

	.cta-secondary {
		display: inline-flex;
		align-items: center;
		padding: 0.75rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		background: none;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.cta-secondary:hover {
		border-color: hsl(var(--foreground) / 0.4);
		background: hsl(var(--muted) / 0.5);
	}

	.cta-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

	/* ─── Answer script card ────────────────────────────────────────────────── */
	.script-wrap {
		position: relative;
		justify-self: end;
		width: 100%;
		max-width: 360px;
	}

	/* Stacked paper shadows */
	.script-shadow {
		position: absolute;
		inset: 0;
		border-radius: 0.6rem;
		border: 1px solid rgba(245, 158, 11, 0.08);
	}

	.script-shadow-1 {
		background: #1a2540;
		transform: rotate(2.5deg) translateY(6px);
		z-index: -1;
	}

	.script-shadow-2 {
		background: #131d35;
		transform: rotate(4.5deg) translateY(10px);
		z-index: -2;
	}

	.script-card {
		position: relative;
		overflow: hidden;
		border-radius: 0.6rem;
		background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
		border: 1px solid rgba(245, 158, 11, 0.18);
		box-shadow:
			0 0 0 1px rgba(255,255,255,0.04) inset,
			0 32px 64px -16px rgba(0,0,0,0.6);
		padding: 1.75rem;
		z-index: 1;
	}

	.script-noise {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.025;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
	}

	.script-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 1rem;
		border-bottom: 1px dashed rgba(245, 158, 11, 0.25);
		margin-bottom: 1.25rem;
	}

	.script-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--gold);
	}

	.script-serial {
		font-family: 'Courier New', monospace;
		font-size: 0.65rem;
		color: #475569;
		letter-spacing: 0.06em;
	}

	.script-fields {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-bottom: 1.5rem;
	}

	.script-field {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		padding-bottom: 0.6rem;
	}

	.script-field:last-child { border-bottom: none; }

	.script-field dt {
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #475569;
		white-space: nowrap;
	}

	.script-field dd {
		flex: 1;
		height: 1px;
		background: rgba(255,255,255,0.08);
		border: none;
		margin: 0 0 0 1rem;
		border-bottom: 1px dotted rgba(255,255,255,0.12);
	}

	.script-footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(255,255,255,0.06);
	}

	.script-footer p {
		font-size: 0.7rem;
		line-height: 1.55;
		color: #475569;
		max-width: 200px;
	}

	/* amber accent #3 — stamp */
	.script-stamp {
		flex-shrink: 0;
		width: 58px;
		height: 58px;
		border-radius: 9999px;
		border: 2px solid var(--gold);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--gold);
		opacity: 0.7;
		transform: rotate(-12deg);
	}

	.script-stamp-text {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.script-stamp-sub {
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	/* ─── Modes section ────────────────────────────────────────────────────── */
	.modes-section {
		border-top: 1px solid hsl(var(--border));
		background: hsl(var(--card));
	}

	.modes-inner {
		max-width: 1280px;
		margin: 0 auto;
		padding: 4rem 1.5rem;
	}

	.section-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: hsl(var(--muted-foreground));
		margin: 0 0 2rem;
	}

	.modes-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.mode-card {
		position: relative;
		padding: 2rem;
		background: hsl(var(--card));
		border-right: 1px solid hsl(var(--border));
		transition: background 0.2s ease;
	}

	.mode-card:last-child { border-right: none; }

	.mode-card:hover { background: hsl(var(--muted) / 0.4); }

	.mode-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.mode-num {
		font-family: 'Courier New', monospace;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: hsl(var(--muted-foreground));
	}

	:global(.mode-icon) {
		width: 1.1rem;
		height: 1.1rem;
		color: hsl(var(--foreground));
		opacity: 0.5;
	}

	.mode-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.35rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin: 0 0 0.6rem;
	}

	.mode-desc {
		font-size: 0.85rem;
		line-height: 1.65;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	/* ─── Info section ─────────────────────────────────────────────────────── */
	.info-section {
		border-top: 1px solid hsl(var(--border));
	}

	.info-inner {
		max-width: 1280px;
		margin: 0 auto;
		padding: 4rem 1.5rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
	}

	.info-body {
		font-size: 0.9rem;
		line-height: 1.75;
		color: hsl(var(--muted-foreground));
		margin: 0.75rem 0 0;
	}

	/* ─── Footer ───────────────────────────────────────────────────────────── */
	.site-footer {
		border-top: 1px solid hsl(var(--border));
		background: hsl(var(--card) / 0.5);
		padding: 2.5rem 1.5rem 1.5rem;
	}

	.site-footer-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.footer-sub {
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground) / 0.6);
		margin: 0;
	}

	.footer-built {
		font-size: 0.78rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.footer-built strong {
		color: hsl(var(--foreground));
		font-weight: 700;
	}

	.footer-copy {
		max-width: 1280px;
		margin: 0 auto;
		padding-top: 1rem;
		border-top: 1px solid hsl(var(--border) / 0.5);
		font-size: 0.68rem;
		color: hsl(var(--muted-foreground) / 0.55);
	}

	/* ─── Responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 1024px) {
		.hero-inner {
			grid-template-columns: 1fr;
			gap: 3rem;
		}

		.script-wrap {
			justify-self: start;
			max-width: 400px;
		}
	}

	@media (max-width: 768px) {
		.hero { padding: 3.5rem 1.25rem 3rem; }

		.modes-grid {
			grid-template-columns: 1fr;
		}

		.mode-card {
			border-right: none;
			border-bottom: 1px solid hsl(var(--border));
		}

		.mode-card:last-child { border-bottom: none; }

		.info-inner {
			grid-template-columns: 1fr;
			gap: 2.5rem;
			padding: 3rem 1.25rem;
		}

		.modes-inner { padding: 3rem 1.25rem; }

		.site-footer-inner { flex-direction: column; align-items: flex-start; }
	}

	@media (max-width: 480px) {
		.hero-headline { font-size: 2.5rem; }
		.script-wrap { max-width: 100%; }
		.hero-ctas { flex-direction: column; }
		.cta-primary, .cta-secondary { width: 100%; justify-content: center; }
	}

	@media (prefers-reduced-motion: reduce) {
		.cta-primary { transition: none; }
		.cta-primary:hover { transform: none; }
	}
</style>