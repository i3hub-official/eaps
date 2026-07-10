// src/lib/client/face/human.ts
// Lazily-loaded, singleton @vladmandic/human instance for browser use only.
// Models are self-hosted under /static/models/human — no CDN dependency,
// so this keeps working even if the exam venue has no internet access
// beyond the app server itself.
import type Human from '@vladmandic/human'

let humanInstance: Human | null = null
let loadPromise: Promise<Human> | null = null

export async function getHuman(): Promise<Human> {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { default: HumanClass } = await import('@vladmandic/human');
      
      const human = new HumanClass({
        backend: 'webgl',
        modelBasePath: '/models/human/',
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 3 },
          mesh: { enabled: true },
          iris: { enabled: true },
          description: { enabled: true },
          emotion: { enabled: true },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
        filter: { enabled: false },
      });

      await human.load();
      await human.warmup();

      humanInstance = human;
      return human;
    } catch (err) {
      loadPromise = null; // Reset promise to allow retries if loading fails
      throw err;
    }
  })();

  return loadPromise;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }
  
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}