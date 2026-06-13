import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

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

    // Optimize dependencies for better performance
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

    // Ensure Node.js modules aren't bundled into client
    ssr: {
      noExternal: ['@vladmandic/human'],
      external: [
        'pg', 
        'ws', 
        'crypto', 
        '@tensorflow/tfjs-node', 
        '@tensorflow/tfjs-node-gpu',
        'sharp' // Often used with human
      ],
    },

    // Define global variables for TensorFlow.js
    define: {
      'process.env': {},
      'global': 'globalThis',
    },

    // Resolve aliases - pnpm specific
    resolve: {
      alias: {
        // Force browser versions for Node-specific imports
        '@tensorflow/tfjs-node': '@tensorflow/tfjs',
        '@tensorflow/tfjs-node-gpu': '@tensorflow/tfjs',
      },
      // This helps pnpm resolve modules correctly
      preserveSymlinks: false,
    },

    // Build configuration
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/@vladmandic\/human/, /@tensorflow\/tfjs/],
      },
      rollupOptions: {
        external: ['@tensorflow/tfjs-node', '@tensorflow/tfjs-node-gpu'],
        output: {
          // Help with pnpm's module structure
          manualChunks: {
            'tfjs': ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl'],
          }
        }
      }
    }
  };
});