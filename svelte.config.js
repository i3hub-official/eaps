import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		alias: {
			$jobs: 'src/jobs',  // ← add this
		},
	},

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