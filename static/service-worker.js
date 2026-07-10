// static/service-worker.js

const CACHE_NAME = 'face-models-v3';

self.addEventListener('install', (event) => {
	self.skipWaiting();

	event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();

			await Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			);

			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	if (!url.pathname.startsWith('/models/human/')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			const cached = await cache.match(event.request);
			if (cached) return cached;

			try {
				const response = await fetch(event.request);

				if (response.ok && response.type === 'basic') {
					await cache.put(event.request, response.clone());
				}

				return response;
			} catch {
				return new Response('Offline', {
					status: 503,
					statusText: 'Offline'
				});
			}
		})()
	);
});