// src/lib/stores/faceModels.svelte.ts
import { getHuman } from '$lib/client/face/human.js';
import { browser } from '$app/environment';

type FaceModelsState = {
    loaded: boolean;
    loading: boolean;
    error: string | null;
    modelsCached: boolean;
};

class FaceModelsStore {
    // Svelte 5 state tracking the true, reactive lifecycle of your model arrays
    private state = $state<FaceModelsState>({
        loaded: false,
        loading: false,
        error: null,
        modelsCached: false,
    });

    private loadPromise: Promise<void> | null = null;

    get loaded() { return this.state.loaded; }
    get loading() { return this.state.loading; }
    get error() { return this.state.error; }
    get modelsCached() { return this.state.modelsCached; }

    async load() {
        if (!browser) return;
        if (this.state.loaded) return;
        if (this.loadPromise) return this.loadPromise;

        this.state.loading = true;
        this.state.error = null;

        this.loadPromise = (async () => {
            try {
                // 1. Verify if the browser's Cache Storage api has downloaded the weight files
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    // Looks for the Workbox pre-cache or the custom dynamic handler partition
                    const hasPwaCache = cacheNames.some(name => 
                        name.includes('workbox-precache') || name.includes('face-descriptor-api-cache')
                    );
                    this.state.modelsCached = hasPwaCache;
                }

                // 2. Initialize, fetch shards, and compile the Human neural graph matrix
                await getHuman();
                
                this.state.loaded = true;
                console.log('✅ Face neural networks fully compiled and ready for biometric tracking.');
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
}

export const faceModels = new FaceModelsStore();