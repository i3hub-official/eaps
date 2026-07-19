<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import MathText from '$lib/components/MathText.svelte';

	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import FileSignature from '@lucide/svelte/icons/file-signature';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';

	let {
		instructions = null,
		candidateName = null,
		accepted = $bindable(false),
		submitting = false,
		onContinue,
	}: {
		instructions?: string | null;
		candidateName?: string | null;
		accepted?: boolean;
		submitting?: boolean;
		onContinue: () => void;
	} = $props();

	const rules = [
		'Remain alone and unassisted throughout the examination.',
		'Do not switch tabs, minimize the browser, or exit fullscreen mode.',
		'Do not use another device, external materials, or unauthorized software.',
		'Keep your webcam active whenever identity verification is required.',
		'Every activity may be monitored, logged and reviewed by the University.',
		'Violation of any examination regulation may result in immediate disqualification.',
	];

	const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

	const todayLabel = new Date().toLocaleDateString('en-GB', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});

	// Once the declaration is accepted, the whole sheet (checkbox + submit
	// button included) blurs and loses pointer-events — visually "sealed" by
	// the stamp. Without an auto-advance there'd be no way left to click
	// Submit, so this mirrors the same seal-then-proceed pattern used in
	// FaceEnrollModal (phase='success' → setTimeout → onSuccess()).
	$effect(() => {
		if (!accepted) return;
		const timer = setTimeout(() => onContinue(), 1600);
		return () => clearTimeout(timer);
	});
</script>

<div class="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
	<article class="sheet">
		<div class="sheet-grain" aria-hidden="true"></div>

		{#if accepted}
			<div class="stamp-layer" aria-hidden="true">
				<div class="stamp">
					<svg class="stamp-arc" viewBox="0 0 200 200">
						<path id="stampArcTop" d="M22,104 A78,78 0 0 1 178,104" fill="none" />
						<text class="stamp-arc-text">
							<textPath
								href="#stampArcTop"
								xlink:href="#stampArcTop"
								startOffset="50%"
								text-anchor="middle"
							>MICHAEL OKPARA UNIVERSITY OF AGRICULTURE</textPath>
						</text>
						<path id="stampArcBottom" d="M178,112 A78,78 0 0 1 22,112" fill="none" />
						<text class="stamp-arc-text">
							<textPath
								href="#stampArcBottom"
								xlink:href="#stampArcBottom"
								startOffset="50%"
								text-anchor="middle"
							>EXAMINATION &amp; ASSESSMENT SYSTEM</textPath>
						</text>
					</svg>

					<div class="stamp-ring stamp-ring-outer"></div>
					<div class="stamp-ring stamp-ring-inner"></div>

					<div class="stamp-core">
						<div class="stamp-line">DECLARATION</div>
						<div class="stamp-line stamp-line-lg">ACCEPTED</div>
						<div class="stamp-rule"></div>
						<div class="stamp-fine">MOUAU &bull; EAPS</div>
						<div class="stamp-fine">{todayLabel}</div>
					</div>
				</div>

				<p class="stamp-caption">
					{submitting ? 'Saving your declaration…' : 'Preparing your examination…'}
				</p>
			</div>
		{/if}

		<div class="sheet-content" class:blurred={accepted} aria-hidden={accepted} inert={accepted}>

			<!-- ─── Letterhead ─────────────────────────────────────────────── -->
			<header class="letterhead">
				<div class="seal">
					<div class="seal-ticks"></div>
					<div class="seal-ring">
						<GraduationCap class="seal-icon" />
					</div>
				</div>

				<p class="eyebrow">Michael Okpara University of Agriculture, Umudike</p>
				<h1 class="doc-title">Examination Declaration</h1>
				<p class="doc-subtitle">Evaluation, Assessment &amp; Proctor System — Candidate Regulations</p>

				<div class="letterhead-meta">
					<span>Form No. EAPS/DEC&#8209;1</span>
					<span class="meta-dot">&bull;</span>
					<span>{todayLabel}</span>
				</div>

				<div class="rule-double"></div>
			</header>

			<!-- ─── Regulations ────────────────────────────────────────────── -->
			<section class="regs">
				<h2 class="section-label">Examination Regulations</h2>

				<ol class="regs-list">
					{#each rules as rule, i}
						<li class="reg-item">
							<span class="reg-num">{ROMAN[i] ?? i + 1}</span>
							<span>{rule}</span>
						</li>
					{/each}
				</ol>

				{#if instructions}
					<div class="extra-instructions">
						<h3>Additional Lecturer Instructions</h3>
						<div class="mt-2 text-muted-foreground">
							<MathText text={instructions} />
						</div>
					</div>
				{/if}
			</section>

			<!-- ─── Candidate Declaration ──────────────────────────────────── -->
			<section class="declaration">
				<h2 class="section-label">Candidate Declaration</h2>

				<p class="declaration-text">
					I,
					<span class="name-blank">{candidateName ?? '……………………………………………………………'}</span>,
					being a duly registered candidate of Michael Okpara University of
					Agriculture, Umudike, do solemnly and sincerely declare that I have
					carefully read, understood and accepted every examination regulation
					stated above. I undertake to comply with all University examination
					policies and understand that any breach of these regulations may
					result in disciplinary action, cancellation of this examination, or
					any other penalty deemed appropriate by the University.
				</p>

				<div class="signature-block">
					<div class="signature-label">
						<FileSignature class="size-4" />
						<span>Candidate's Digital Signature</span>
					</div>

					<div class="sig-line">
						{#if candidateName}
							<span class="sig-script">{candidateName}</span>
						{:else}
							<span class="sig-placeholder">awaiting candidate name</span>
						{/if}
					</div>

					<div class="sig-caption">
						<span>Signed electronically</span>
						<span>{todayLabel}</span>
					</div>
				</div>
			</section>

			<!-- ─── Agreement ──────────────────────────────────────────────── -->
			<label class="agreement">
				<Checkbox
					checked={accepted}
					onCheckedChange={(v) => (accepted = !!v)}
				/>

				<div>
					<div class="agreement-title">
						<ShieldCheck class="size-4" />
						I certify that I have read and accept this declaration
					</div>

					<p class="agreement-text">
						By checking this box, I electronically sign this declaration and
						agree to abide by all examination regulations.
					</p>
				</div>
			</label>

			<Button
				class="submit-btn h-12 w-full text-base"
				onclick={onContinue}
				disabled={!accepted || submitting}
			>
				{submitting ? 'Saving Declaration...' : 'Proceed to Examination'}
			</Button>
		</div>
	</article>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Oswald:wght@500;600;700&family=Dancing+Script:wght@500;600;700&display=swap');

	/* ---------- SHEET ---------- */

	.sheet {
		position: relative;
		overflow: hidden;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--card));
		box-shadow:
			0 1px 0 hsl(var(--border)),
			0 -6px 0 -3px hsl(var(--card)),
			0 -6px 0 -4px hsl(var(--border)),
			0 -11px 0 -8px hsl(var(--card)),
			0 -11px 0 -9px hsl(var(--border)),
			0 24px 48px -12px hsl(var(--foreground) / 0.25);
	}

	.sheet-grain {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.05;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
	}

	.sheet-content {
		position: relative;
		padding: 2.5rem 2.75rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		transition: filter 0.35s ease;
	}

	.sheet-content.blurred {
		filter: blur(3px);
		pointer-events: none;
		user-select: none;
	}

	/* ---------- LETTERHEAD ---------- */

	.letterhead {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.seal {
		position: relative;
		width: 88px;
		height: 88px;
		margin-bottom: 0.85rem;
	}

	.seal-ticks {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		background: repeating-conic-gradient(
			hsl(var(--primary) / 0.55) 0deg 1.4deg,
			transparent 1.4deg 12deg
		);
		-webkit-mask: radial-gradient(circle, transparent 61%, black 63%, black 71%, transparent 73%);
		mask: radial-gradient(circle, transparent 61%, black 63%, black 71%, transparent 73%);
	}

	.seal-ring {
		position: absolute;
		inset: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		border: 2px solid hsl(var(--primary));
		box-shadow: inset 0 0 0 3px hsl(var(--card)), inset 0 0 0 4px hsl(var(--primary) / 0.35);
		background: hsl(var(--primary) / 0.06);
	}

	:global(.seal-icon) {
		width: 1.9rem;
		height: 1.9rem;
		color: hsl(var(--primary));
	}

	.eyebrow {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 600;
		font-size: 0.95rem;
		letter-spacing: 0.06em;
		color: hsl(var(--muted-foreground));
	}

	.doc-title {
		margin-top: 0.35rem;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 2.4rem;
		line-height: 1.1;
		color: hsl(var(--foreground));
	}

	.doc-subtitle {
		margin-top: 0.4rem;
		font-size: 0.85rem;
		letter-spacing: 0.03em;
		color: hsl(var(--muted-foreground));
	}

	.letterhead-meta {
		margin-top: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Oswald', sans-serif;
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: hsl(var(--muted-foreground));
	}

	.meta-dot {
		opacity: 0.5;
	}

	.rule-double {
		width: 100%;
		margin-top: 1.5rem;
		border-top: 2px solid hsl(var(--primary));
		border-bottom: 1px solid hsl(var(--primary) / 0.35);
		padding-top: 3px;
	}

	/* ---------- SECTION LABEL ---------- */

	.section-label {
		font-family: 'Oswald', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: hsl(var(--foreground));
		margin-bottom: 1rem;
	}

	/* ---------- REGULATIONS ---------- */

	.regs-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		border: 1px solid hsl(var(--border));
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem;
		background: hsl(var(--muted) / 0.2);
	}

	.reg-item {
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
		font-size: 0.93rem;
		line-height: 1.65;
	}

	.reg-num {
		flex-shrink: 0;
		min-width: 1.75rem;
		text-align: center;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 0.85rem;
		color: hsl(var(--primary));
		border: 1px solid hsl(var(--primary) / 0.35);
		border-radius: 0.35rem;
		background: hsl(var(--primary) / 0.08);
		padding: 0.1rem 0;
	}

	.extra-instructions {
		margin-top: 1.25rem;
		padding-top: 1.1rem;
		border-top: 1px dashed hsl(var(--border));
	}

	.extra-instructions h3 {
		font-size: 0.85rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	/* ---------- DECLARATION + SIGNATURE ---------- */

	.declaration-text {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.05rem;
		line-height: 1.85;
		color: hsl(var(--foreground));
		text-align: justify;
	}

	.name-blank {
		font-weight: 700;
		border-bottom: 1px solid hsl(var(--border));
		padding: 0 0.15rem;
	}

	.signature-block {
		margin-top: 1.5rem;
		border: 1px solid hsl(var(--border));
		border-left: 4px solid hsl(var(--primary));
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem 1rem;
		background: hsl(var(--muted) / 0.15);
	}

	.signature-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: hsl(var(--muted-foreground));
	}

	.sig-line {
		margin-top: 1.1rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid hsl(var(--border));
		min-height: 2.6rem;
		display: flex;
		align-items: flex-end;
	}

	.sig-script {
		font-family: 'Dancing Script', cursive;
		font-size: 2rem;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.sig-placeholder {
		font-size: 0.85rem;
		font-style: italic;
		color: hsl(var(--muted-foreground) / 0.7);
	}

	.sig-caption {
		margin-top: 0.5rem;
		display: flex;
		justify-content: space-between;
		font-size: 0.72rem;
		letter-spacing: 0.03em;
		color: hsl(var(--muted-foreground));
	}

	/* ---------- AGREEMENT ---------- */

	.agreement {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.1rem 1.25rem;
		border: 1px solid hsl(var(--border));
		border-top: 2px solid hsl(var(--primary) / 0.4);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: 0.2s ease;
	}

	.agreement:hover {
		border-color: hsl(var(--primary) / 0.5);
		background: hsl(var(--primary) / 0.04);
	}

	.agreement-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.agreement-title :global(svg) {
		color: hsl(var(--primary));
		flex-shrink: 0;
	}

	.agreement-text {
		margin-top: 0.3rem;
		font-size: 0.8rem;
		line-height: 1.6;
		color: hsl(var(--muted-foreground));
	}

	:global(.submit-btn) {
		font-family: 'Oswald', sans-serif;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* ---------- RED ACCEPTANCE STAMP ---------- */

	.stamp-layer {
		position: absolute;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: hsl(var(--background) / 0.5);
		backdrop-filter: blur(2px);
		animation: overlayFade 220ms ease;
	}

	.stamp {
		position: relative;
		width: 220px;
		height: 220px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #a3231f;
		mix-blend-mode: multiply;
		animation: stampHit 0.6s cubic-bezier(0.22, 1.4, 0.36, 1) forwards;
	}

	.stamp-ring {
		position: absolute;
		border-radius: 9999px;
		border: 3px solid currentColor;
	}

	.stamp-ring-outer {
		inset: 0;
		opacity: 0.9;
	}

	.stamp-ring-inner {
		inset: 14px;
		border-width: 1.5px;
		opacity: 0.7;
	}

	.stamp-arc {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.stamp-arc-text {
		font-family: 'Oswald', sans-serif;
		font-weight: 600;
		font-size: 8.4px;
		letter-spacing: 0.14em;
		fill: currentColor;
	}

	.stamp-core {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.stamp-line {
		font-family: 'Oswald', sans-serif;
		font-weight: 600;
		font-size: 1rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.stamp-line-lg {
		font-size: 1.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		margin-top: 0.1rem;
	}

	.stamp-rule {
		width: 60%;
		height: 2px;
		margin: 0.5rem 0;
		background: currentColor;
		opacity: 0.6;
	}

	.stamp-fine {
		font-family: 'Oswald', sans-serif;
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		opacity: 0.85;
	}

	.stamp-caption {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	@keyframes stampHit {
		0% {
			opacity: 0;
			transform: scale(0.4) rotate(-26deg);
		}
		65% {
			opacity: 1;
			transform: scale(1.08) rotate(-7deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotate(-9deg);
		}
	}

	@keyframes overlayFade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* ---------- RESPONSIVE ---------- */

	@media (max-width: 640px) {
		.sheet-content {
			padding: 1.75rem 1.5rem 2rem;
			gap: 1.5rem;
		}

		.doc-title {
			font-size: 1.8rem;
		}

		.stamp {
			width: 170px;
			height: 170px;
		}

		.stamp-line-lg {
			font-size: 1.3rem;
		}

		.regs-list,
		.signature-block {
			padding: 1rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stamp,
		.stamp-layer,
		.sheet-content {
			animation: none;
			transition: none;
		}

		.stamp {
			transform: rotate(-9deg);
		}
	}
</style>