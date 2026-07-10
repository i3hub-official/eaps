import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig(() => {
  return {
    plugins: [
      tailwindcss(), 
      sveltekit(), 
      basicSsl(),
      SvelteKitPWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline', // Let Vite inject the service worker script automatically
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globDirectory: 'static',
          globPatternsPatterns: ['models/human/**/*'],
          maximumFileSizeToCacheInBytes: 60 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/face/descriptor'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'face-descriptor-api-cache',
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 2 }
              }
            }
          ]
        },
        manifest: {
          name: 'Evaluation Assessment & Proctor System',
          short_name: 'EvalProctor',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#3b82f6',
          icons: [
            { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ],

    server: {
      host: '0.0.0.0',
      port: 1209,
      https: true,
      proxy: {
        '/ws': {
          target: 'ws://localhost:2605',
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