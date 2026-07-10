// src/lib/client/service-worker.ts

export async function registerServiceWorker() {
	if (typeof window === 'undefined') return null;

	if (!('serviceWorker' in navigator)) return null;

	try {
		const registration = await navigator.serviceWorker.register(
			'/service-worker.js',
			{
				scope: '/'
			}
		);

		await navigator.serviceWorker.ready;

		console.log('✅ Service Worker ready');

		return registration;
	} catch (error) {
		console.error('Service Worker registration failed:', error);
		return null;
	}
}

export async function checkServiceWorkerStatus() {
	if (typeof window === 'undefined') {
		return {
			registered: false,
			cached: false
		};
	}

	if (!('serviceWorker' in navigator)) {
		return {
			registered: false,
			cached: false
		};
	}

	const registration = await navigator.serviceWorker.getRegistration();

	const registered = !!registration;

	let cached = false;

	try {
		const cacheNames = await caches.keys();

		cached = cacheNames.includes('face-models-v3');
	} catch {
		cached = false;
	}

	return {
		registered,
		cached
	};
}