// src/lib/server/face/duplicate.worker.ts
import { parentPort, workerData } from 'worker_threads'

interface WorkerInput {
  newDescriptor: number[]
  records: { studentId: string; descriptor: number[] }[]
  threshold: number
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

if (parentPort) {
  const { newDescriptor, records, threshold } = workerData as WorkerInput

  let duplicateId: string | null = null

  for (const record of records) {
    const similarity = cosineSimilarity(newDescriptor, record.descriptor)
    if (similarity >= threshold) {
      duplicateId = record.studentId
      break
    }
  }

  parentPort.postMessage({ duplicateId })
}