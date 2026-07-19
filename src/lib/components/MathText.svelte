<!-- src/lib/components/MathText.svelte -->
<!--
	Renders a string that may contain LaTeX-style math delimiters, mixed in
	with plain text, formatting the math portions with KaTeX while leaving
	everything else as normal (escaped) text.

	Supported delimiters:
	  $$ ... $$   block/display math
	  \[ ... \]   block/display math
	  $ ... $     inline math
	  \( ... \)   inline math

	Usage:
	  <MathText text={currentQuestion.body} />
	  <MathText text={opt.body} class="text-base font-medium" />

	If a lecturer writes something like "Solve for x: $x^2 + 2x + 1 = 0$",
	the plain-text parts render as-is and the $...$ segment renders as a
	proper equation. If the whole string has no math delimiters, this is a
	no-op passthrough (just HTML-escaped plain text).
-->
<script lang="ts">
	import katex from 'katex'

	let { text = '', class: className = '' }: { text?: string; class?: string } = $props()

	// Order matters: the two-character block delimiters ($$ and \[ \]) must
	// be tried before the single-character ones, otherwise "$$...$$" would
	// get misread as two adjacent empty "$...$" matches.
	const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g

	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
	}

	function renderMath(expr: string, displayMode: boolean): string {
		try {
			return katex.renderToString(expr, {
				throwOnError: false,
				displayMode,
				output: 'html',
			})
		} catch {
			// Malformed LaTeX shouldn't break the whole question — fall back
			// to showing the raw (escaped) source instead of throwing.
			return escapeHtml(expr)
		}
	}

	function toHtml(input: string): string {
		if (!input) return ''
		const parts = input.split(MATH_PATTERN)
		let html = ''

		for (const part of parts) {
			if (!part) continue

			if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
				html += renderMath(part.slice(2, -2), true)
			} else if (part.startsWith('\\[') && part.endsWith('\\]')) {
				html += renderMath(part.slice(2, -2), true)
			} else if (part.startsWith('\\(') && part.endsWith('\\)')) {
				html += renderMath(part.slice(2, -2), false)
			} else if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
				html += renderMath(part.slice(1, -1), false)
			} else {
				// Plain text segment — escape it, and turn newlines into <br>
				// so multi-line question bodies keep wrapping the way they
				// did when rendered as plain text.
				html += escapeHtml(part).replace(/\n/g, '<br>')
			}
		}

		return html
	}

	const rendered = $derived(toHtml(text));
</script>

<span class={className}>{@html rendered}</span>