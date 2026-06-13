import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig(() => {
  return {
    plugins: [
      tailwindcss(), 
      sveltekit(), 
      basicSsl(),
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
        '@tensorflow/tfjs-core',
      ],
      exclude: [
        '@tensorflow/tfjs-node',
        '@tensorflow/tfjs-node-gpu',
      ],
      // Add esbuild options to handle Node.js modules
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        plugins: [
          {
            name: 'fix-crypto',
            setup(build) {
              // Replace crypto require with a mock
              build.onResolve({ filter: /^crypto$/ }, () => {
                return { path: 'crypto', external: true };
              });
            },
          },
        ],
      },
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
            '@prisma/client': path.resolve(__dirname, 'node_modules/.prisma/client/index.js'),
      },
    },
  };
});