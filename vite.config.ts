import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(() => {
  return {
    plugins: [
      tailwindcss(), 
      sveltekit(), 
      basicSsl(),
      nodePolyfills({
        include: ['fs', 'path', 'os', 'crypto', 'stream', 'buffer'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      })
    ],

    server: {
      host: '0.0.0.0',
      port: 1209,
      https: true,
      proxy: {
        '/ws': {
          target: 'ws://localhost:3001',
          ws: true,
        },
      },
    },

    optimizeDeps: {
      include: [
        '@vladmandic/human',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-backend-webgl',
        '@tensorflow/tfjs-core'
      ],
      exclude: [
        '@tensorflow/tfjs-node',
        '@tensorflow/tfjs-node-gpu'
      ]
    },

    ssr: {
      noExternal: ['@vladmandic/human'],
      external: [
        'pg', 
        'ws', 
        'crypto', 
        '@tensorflow/tfjs-node', 
        '@tensorflow/tfjs-node-gpu',
        'sharp'
      ],
    },

    define: {
      'process.env': {},
      'global': 'globalThis',
    },

    resolve: {
      alias: {
        '@tensorflow/tfjs-node': '@tensorflow/tfjs',
        '@tensorflow/tfjs-node-gpu': '@tensorflow/tfjs',
      },
      preserveSymlinks: false,
    },

    // REMOVED manualChunks - not needed for your case
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/@vladmandic\/human/, /@tensorflow\/tfjs/],
      },
      rollupOptions: {
        external: ['@tensorflow/tfjs-node', '@tensorflow/tfjs-node-gpu'],
        // Remove manualChunks entirely
      }
    }
  };
});