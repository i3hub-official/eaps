// src/lib/stores/faceModels.svelte.ts
import { getHuman } from '$lib/client/face/human.js';
import { browser } from '$app/environment';
import { registerServiceWorker, checkServiceWorkerStatus } from '$lib/client/service-worker';

const CACHE_KEY = 'human_models_loaded';
const TIMESTAMP_KEY = 'human_models_timestamp';
const CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours

type FaceModelsState = {
	loaded: boolean;
	loading: boolean;
	error: string | null;
	serviceWorkerRegistered: boolean;
	modelsCached: boolean;
};

class FaceModelsStore {
	private state = $state<FaceModelsState>({
		loaded: false,
		loading: false,
		error: null,
		serviceWorkerRegistered: false,
		modelsCached: false,
	});

	private loadPromise: Promise<void> | null = null;

	get loaded() {
		return this.state.loaded;
	}

	get loading() {
		return this.state.loading;
	}

	get error() {
		return this.state.error;
	}

	get serviceWorkerRegistered() {
		return this.state.serviceWorkerRegistered;
	}

	get modelsCached() {
		return this.state.modelsCached;
	}

	async load() {
		if (!browser) return;
		if (this.state.loaded) return;
		if (this.loadPromise) return this.loadPromise;

		// Register service worker first
		await registerServiceWorker();

		// Check cache (localStorage)
		const cached = localStorage.getItem(CACHE_KEY);
		const cacheTime = localStorage.getItem(TIMESTAMP_KEY);

		if (cached === 'true' && cacheTime) {
			const elapsed = Date.now() - parseInt(cacheTime);
			if (elapsed < CACHE_DURATION) {
				this.state.loaded = true;
				console.log('✅ Face models loaded from cache');
				return;
			}
		}

		this.state.loading = true;
		this.state.error = null;

		this.loadPromise = (async () => {
			try {
				// Check if service worker has cached the models
				const status = await checkServiceWorkerStatus();
				if (status.cached) {
					this.state.modelsCached = true;
					console.log('✅ Face models found in service worker cache');
				}

				// Load the models
				await getHuman();
				this.state.loaded = true;
				localStorage.setItem(CACHE_KEY, 'true');
				localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
				console.log('✅ Face models loaded and cached for 5 hours');
			} catch (err) {
				this.state.error = err instanceof Error ? err.message : 'Failed to load face models';
				console.error('Failed to load face models:', err);
			} finally {
				this.state.loading = false;
				this.loadPromise = null;
			}
		})();

		return this.loadPromise;
	}


	invalidateCache() {
		localStorage.removeItem(CACHE_KEY);
		localStorage.removeItem(TIMESTAMP_KEY);
		this.state.loaded = false;
		this.state.error = null;
		console.log('🔄 Face models cache invalidated');
	}
}

export const faceModels = new FaceModelsStore();