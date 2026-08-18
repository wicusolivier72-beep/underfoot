import type { GeologyResponse } from '../../shared/types.ts'

interface CacheEntry {
  value: GeologyResponse
  expiresAt: number
}

// In-memory, per warm serverless/edge instance. The durable cache layer is the HTTP
// Cache-Control header set in api/geology.ts, which lets Vercel's CDN (and the browser)
// dedupe requests for the same rounded coordinate across instances and cold starts; this
// map is just a free extra hit for requests that land on an already-warm instance.
const store = new Map<string, CacheEntry>()

export function roundCoord(n: number, decimals = 4): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

export function cacheKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`
}

export function getCached(key: string): GeologyResponse | null {
  const entry = store.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    store.delete(key)
    return null
  }
  return entry.value
}

export function setCached(key: string, value: GeologyResponse, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}
