import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

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
        '@prisma/client',
        '.prisma/client'
      ],
    },

    ssr: {
      noExternal: ['@vladmandic/human'],
      external: [
        'pg', 
        'ws', 
        'crypto',
        '@tensorflow/tfjs-node', 
        '@tensorflow/tfjs-node-gpu',
        'sharp',
        '@prisma/client',
        '.prisma/client'
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
    },

    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/@vladmandic\/human/, /@tensorflow\/tfjs/],
        exclude: [/@prisma\/client/, /\.prisma\/client/],
      },
      rollupOptions: {
        external: [
          '@tensorflow/tfjs-node', 
          '@tensorflow/tfjs-node-gpu',
          '@prisma/client',
          '.prisma/client'
        ],
      },
    },
  };
});