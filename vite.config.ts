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

    // Optimize dependencies for better performance
    optimizeDeps: {
      include: [
        '@vladmandic/human',
        '@tensorflow/tfjs-backend-webgl',
        '@tensorflow/tfjs-core'
      ],
      exclude: [
        '@tensorflow/tfjs-node',
        '@tensorflow/tfjs-node-gpu'
      ]
    },

    // Ensure pg and ws aren't bundled into client
    ssr: {
      noExternal: ['@vladmandic/human'],
      external: ['pg', 'ws', 'crypto'],
    },

    // Define global variables for TensorFlow.js
    define: {
      'process.env': {},
      'global': 'globalThis',
    },

    // Resolve aliases if needed
    resolve: {
      alias: {
        // Ensure browser-specific versions are used
        '@tensorflow/tfjs-node': '@tensorflow/tfjs',
        '@tensorflow/tfjs-node-gpu': '@tensorflow/tfjs',
      }
    }
  };
});