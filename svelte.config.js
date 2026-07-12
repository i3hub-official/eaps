import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isProd = process.env.NODE_ENV === 'production';

// ── CSP policy ──────────────────────────────────────────────────────────────
// script-src: 'self' + SvelteKit's auto-injected nonce for its own hydration
//   scripts. cdn.jsdelivr.net kept from your original config — TF.js's WASM
//   backend (@tensorflow/tfjs-backend-wasm, if it's in your dependency tree
//   via @vladmandic/human) defaults to fetching its .wasm binaries from
//   jsdelivr unless setWasmPaths() points it at /models locally. If you've
//   already pinned wasm paths to self-hosted files, this can be dropped.
// worker-src: needed for the PWA service worker, src/lib/server/face/duplicate.worker.ts,
//   and any Web Workers TF.js spins up internally (often via blob: URLs).
// connect-src: 'self' for your own /api routes, api.mouau.edu.ng for student
//   data, and the invigilator websocket. Replace the wss:// placeholder below
//   with your real production WebSocket host once you have it — 'self'
//   does NOT cover ws:// upgrades to a different host.
// manifest-src: for the PWA webmanifest.
// frame-ancestors: 'none' — this is a proctored exam app, it should never be
//   embeddable in another site's iframe (this also supersedes X-Frame-Options).
const cspPolicy = {
	'default-src': ['self'],
	'script-src': ['self', 'cdn.jsdelivr.net'],
	'style-src': ['self', 'unsafe-inline'],
	'img-src': ['self', 'data:', 'blob:'],
	'media-src': ['self', 'blob:'],
	'font-src': ['self'],
	'worker-src': ['self', 'blob:'],
	'manifest-src': ['self'],
	'connect-src': [
		'self',
		'https://api.mouau.edu.ng',
		'cdn.jsdelivr.net',
		'ws://localhost:2605',
		'wss://localhost:2605'
		// TODO: add your production websocket host, e.g. 'wss://ws.yourdomain.com'
	],
	'frame-src': ['none'],
	'frame-ancestors': ['none'],
	'object-src': ['none'],
	'base-uri': ['self'],
	'form-action': ['self']
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	onwarn: (warning, handler) => {
		const suppress = new Set([
			'css_unused_selector',
			'state_referenced_locally',
			'a11y_click_events_have_key_events',
			'a11y_no_static_element_interactions',
			'a11y_interactive_supports_focus',
			'svelte_component_deprecated',
			'non_reactive_update',
			'a11y_autofocus',
			'a11y_label_has_associated_control',
			'a11y_invalid_attribute'
		]);
		if (suppress.has(warning.code)) return;
		handler(warning);
	},
	kit: {
		adapter: adapter(),
		alias: {
			$jobs: 'src/jobs',
			$prisma: 'node_modules/.prisma/client/index.js'
		},
		csp: {
			// SvelteKit auto-generates a nonce and injects it into script-src for
			// its own inline hydration scripts. 'auto' uses nonces for SSR'd
			// pages and hashes for prerendered ones.
			mode: 'auto',
			// Enforced only in production builds.
			directives: isProd ? cspPolicy : {},
			// Report-only (never blocks) in dev, so you can see violations in
			// the console/network tab while you iterate without breaking
			// TF.js/face-model loading locally.
			reportOnly: isProd ? {} : cspPolicy
		}
	}
};

export default config;