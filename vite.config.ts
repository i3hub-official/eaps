import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(() => {
 
  return {
    plugins: [tailwindcss(), sveltekit(), basicSsl()],

    server: {
      host: '0.0.0.0',
      port: 1209,
      https: true,
       // Proxy WebSocket connections in dev
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
    },

  // Ensure pg and ws aren't bundled into client
  ssr: {
    noExternal: [],
    external: ['pg', 'ws', 'crypto'],
  },
  };

});