import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: { adapter: adapter() },

	// CSP headers — tightened for exam security
    csp: {
      directives: {
        'default-src': ['self'],
        'script-src':  ['self', 'cdn.jsdelivr.net'],
        'style-src':   ['self', 'unsafe-inline'],
        'img-src':     ['self', 'data:', 'blob:'],
        'media-src':   ['self', 'blob:'],
        'connect-src': ['self', 'ws://localhost:3001', 'wss://localhost:3001'],
        'frame-src':   ['none'],
        'object-src':  ['none'],
      },
    },
};

export default config;
