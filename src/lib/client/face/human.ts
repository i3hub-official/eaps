// src/lib/client/face/human.ts
import type Human from '@vladmandic/human'

let humanInstance: Human | null = null
let loadPromise: Promise<Human> | null = null

export async function getHuman(): Promise<Human> {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // 1. Defend against SSR execution (Human breaks outside the browser)
      if (typeof window === 'undefined') {
        throw new Error('Human can only be instantiated in browser environments.');
      }

      const { default: HumanClass } = await import('@vladmandic/human');
      
      const human = new HumanClass({
        backend: 'webgl',
        // Points exactly to static/models/human/ matching your PWA rule
        modelBasePath: '/models/human/', 
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 3 },
          mesh: { enabled: true },
          iris: { enabled: true },
          description: { enabled: true },
          // ⚠️ PERFORMANCE TWEAK: Turn off non-essential sub-models if you aren't logging them
          emotion: false, 
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
        filter: { enabled: false },
      });

      // 2. Parallelize network requests for the individual model files
      await human.load();
      
      // 3. Prevent blocking warmup cycles (Warmup compilation happens in background)
      // Passing an explicit canvas size tells WebGL exactly what to allocate ahead of time
      human.warmup({ width: 640, height: 480 }).catch((err) => {
        console.warn('Human non-blocking warmup failed:', err);
      });

      humanInstance = human;
      return human;
    } catch (err) {
      loadPromise = null; // Reset promise to allow retries if network fails
      throw err;
    }
  })();

  return loadPromise;
}

// 4. Highly optimized Math vector routine
export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  const len = a.length;
  if (len !== b.length || len === 0) return 0;
  
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    const valA = a[i];
    const valB = b[i];
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }
  
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}