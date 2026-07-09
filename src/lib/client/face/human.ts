// src/lib/client/face/human.ts
// Lazily-loaded, singleton @vladmandic/human instance for browser use only.
// Models are self-hosted under /static/models/human — no CDN dependency,
// so this keeps working even if the exam venue has no internet access
// beyond the app server itself.
import type Human from '@vladmandic/human'

let humanInstance: Human | null = null
let loadPromise: Promise<Human> | null = null

export async function getHuman(): Promise<Human> {
  if (humanInstance) return humanInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const { default: HumanClass } = await import('@vladmandic/human')

    const human = new HumanClass({
      backend: 'webgl',
      modelBasePath: '/models/human/',
    //modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',

      face: {
        enabled: true,
        detector: { rotation: true, maxDetected: 3 },
        mesh: { enabled: true },
        iris: { enabled: true },
        description: { enabled: true }, // produces the embedding vector
        emotion: { enabled: true },
        antispoof: { enabled: true },
        liveness: { enabled: true },
            },
      body: { enabled: false },
      hand: { enabled: false },
      gesture: { enabled: true },
      filter: { enabled: false },
    })

    await human.load()
    await human.warmup()

    humanInstance = human
    return human
  })()

  return loadPromise
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}