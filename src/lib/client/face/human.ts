// src/lib/client/face/human.ts
import type Human from '@vladmandic/human'

let humanInstance: Human | null = null
let loadPromise: Promise<Human> | null = null

export async function getHuman(): Promise<Human> {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Human can only be instantiated in browser environments.');
      }

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
        gesture: { enabled: true },
        filter: { enabled: false },
      });

      await human.load();

      // human.models is a namespace (load/list/loaded/reset/stats/validate),
      // not a plain object — use .loaded() to check actual loaded model names.
      // NOTE: some models load lazily on first detect() rather than eagerly
      // here, so this check right after .load() is informational only —
      // see checkModelsLoaded() below for the authoritative post-detect check.
      const loadedModels = human.models.loaded();
      // console.log('[Human] Loaded models after .load():', loadedModels);
      // console.log('[Human] Model stats:', human.models.stats());

      human.warmup({ width: 640, height: 480 }).catch((err) => {
        console.warn('Human non-blocking warmup failed:', err);
      });

      humanInstance = human;
      return human;
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Call this once after your first successful human.detect() in the
 * detection loop. Some models (notably antispoof/liveness) can load lazily
 * on first use rather than eagerly during human.load(), so this is the
 * authoritative point to confirm everything required is actually present.
 */
export function checkModelsLoaded(human: Human): { loaded: string[]; missing: string[] } {
  const required = ['blazeface', 'facemesh', 'faceres', 'iris', 'antispoof', 'liveness'];
  const loaded = human.models.loaded();
  const missing = required.filter((m) => !loaded.includes(m));

  if (missing.length > 0) {
    console.error(
      '[Human] Still missing after first detect():', missing,
      '\nCheck Network tab for failed requests to /models/human/* (404s or CSP blocks).'
    );
  } else {
    // console.log('[Human] All required models confirmed loaded:', loaded);
  }

  return { loaded, missing };
}

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

export function setDetectionProfile(human: Human, profile: 'full' | 'liveness-lite') {
  human.config.face.description!.enabled = true; // see note below re: sustained identity check
  human.config.face.emotion!.enabled = false;      // confirmed unused (ExamMonitor's own analyzeExpression is a no-op)
  if (profile === 'full') {
    human.config.face.description!.enabled = true;
  } else {
    // Keep description enabled but the caller should only read/act on the
    // embedding periodically (see sustainedIdentityCheck in the modal),
    // not disable it — a fully-disabled description means no mid-session
    // face-swap detection at all, which reopens the impersonation gap.
    human.config.face.description!.enabled = true;
  }
}