import type { GeocodeResponse, GeologyResponse } from '../../shared/types'

function roundCoord(n: number, decimals = 4): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

/**
 * MapLibre renders repeated world copies when panned far enough, so a click out there can
 * report a longitude outside +/-180 (e.g. 195 instead of -165) - normalize it back into
 * range rather than letting the API reject it as invalid.
 */
function normalizeLng(lng: number): number {
  return (((lng + 180) % 360) + 360) % 360 - 180
}

/**
 * Rounds before building the URL (not just before caching server-side) so that repeat
 * queries near the same spot produce the exact same request URL - that's what lets the
 * browser's HTTP cache and Vercel's CDN cache actually dedupe them, on top of the API's
 * own in-memory cache.
 */
export async function fetchGeology(lat: number, lng: number): Promise<GeologyResponse> {
  const params = new URLSearchParams({
    lat: String(roundCoord(lat)),
    lng: String(roundCoord(normalizeLng(lng))),
  })
  const res = await fetch(`/api/geology?${params.toString()}`)
  return (await res.json()) as GeologyResponse
}

export async function fetchGeocode(query: string): Promise<GeocodeResponse> {
  const params = new URLSearchParams({ q: query })
  const res = await fetch(`/api/geocode?${params.toString()}`)
  return (await res.json()) as GeocodeResponse
}
