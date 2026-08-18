import type { IncomingMessage, ServerResponse } from 'node:http'
import type { GeocodeResponse, GeocodeResult } from '../shared/types.ts'
import { getUrl, sendJson, fetchWithTimeout } from './lib/http.ts'

const ONE_DAY_S = 60 * 60 * 24

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

/** Proxies OpenStreetMap Nominatim so the browser never has to (CORS, rate limits, User-Agent policy). */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = getUrl(req)
  const q = url.searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    const body: GeocodeResponse = { results: [] }
    sendJson(res, 400, body)
    return
  }

  try {
    const params = new URLSearchParams({ q, format: 'json', limit: '5' })
    const upstream = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params.toString()}`, 5000, {
      headers: { 'User-Agent': 'Geog-Geology-Lookup/1.0 (personal project, low volume)' },
    })
    if (!upstream.ok) throw new Error(`Nominatim responded ${upstream.status}`)
    const data = (await upstream.json()) as NominatimResult[]

    const results: GeocodeResult[] = data
      .map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))

    const body: GeocodeResponse = { results }
    sendJson(res, 200, body, ONE_DAY_S)
  } catch (err) {
    console.error('[api/geocode] error', err)
    const body: GeocodeResponse = { results: [] }
    sendJson(res, 502, body)
  }
}
