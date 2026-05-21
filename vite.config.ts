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
    },
  };
});