// vite.config.ts
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
        injectRegister: null,
        registerType: 'autoUpdate',
        strategies: 'generateSW',

        manifest: {
          id: '/',
          name: 'Evaluation Assessment & Proctor System',
          short_name: 'EAPS',
          description:
            'Michael Okpara University of Agriculture, Umudike — Examination Management Platform',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/icon-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshots/desktop-wide.png',
              sizes: '1280x800',
              type: 'image/png',
              form_factor: 'wide',
              label: 'EAPS dashboard on desktop',
            },
            {
              src: '/screenshots/mobile-narrow.png',
              sizes: '750x1334',
              type: 'image/png',
              label: 'EAPS exam view on mobile',
            },
          ],
        },

        workbox: {
          globPatterns: ['client/**/*.{js,css,ico,png,svg,webmanifest}'],
          navigateFallback: null,

          runtimeCaching: [
            {
              urlPattern: /\/api\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/(student|admin|exam-officer|invigilator)\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/models\/human\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'human-models-v1',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },

        devOptions: {
          enabled: false,
        },
      }),
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