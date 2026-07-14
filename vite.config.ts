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
        // Registered manually via a small client component (see
        // InstallPrompt.svelte) rather than the plugin's auto-inject, so
        // SW registration order is explicit rather than dependent on
        // SvelteKit's SSR head injection.
        injectRegister: null,
        registerType: 'autoUpdate',
        strategies: 'generateSW',

        manifest: {
          name: 'Evaluation Assessment & Proctor System',
          short_name: 'WAPS',
          description:
            'Michael Okpara University of Agriculture, Umudike — Examination Management Platform',
          theme_color: '#0f1115',
          background_color: '#0f1115',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },

        workbox: {
          // Only ever precache the static build shell — never a page route.
          // A cached exam or portal page could render fully offline, which
          // directly undermines ExamMonitor's NETWORK_DROP detection and
          // the server's ability to confirm a live session.
          globPatterns: ['client/**/*.{js,css,ico,png,svg,webmanifest}'],
          navigateFallback: null,

          runtimeCaching: [
            {
              // Violations, sessions, face verification — always network.
              urlPattern: /\/api\/.*/,
              handler: 'NetworkOnly',
            },
            {
              // Nothing inside an active portal is ever cache-served.
              urlPattern: /\/(student|admin|exam-officer|invigilator)\/.*/,
              handler: 'NetworkOnly',
            },
            {
              // Human.js's face models are large, static, and safe to cache
              // aggressively — affects model load speed only, not exam
              // integrity. Bump the cache name if the model version changes.
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
          // You already run HTTPS in dev via basicSsl(), so flipping this to
          // true would let you test install prompts locally if you want —
          // left off by default to keep `pnpm dev` free of SW cache surprises
          // while you're actively changing routes/API shapes.
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