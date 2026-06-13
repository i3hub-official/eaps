import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
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
    'a11y_label_has_associated_control', 'a11y_invalid_attribute',
  ]);
  if (suppress.has(warning.code)) return;
  handler(warning);
},
  kit: {
    adapter: adapter(),
    alias: {
      $jobs: 'src/jobs',
      $prisma: 'node_modules/.prisma/client/index.js',
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