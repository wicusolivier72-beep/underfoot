import type { IncomingMessage, ServerResponse } from 'node:http'
import type { GeologyResponse } from '../shared/types'
import { routeGeologyQuery } from './_lib/router'
import { cacheKey, getCached, setCached, roundCoord } from './_lib/cache'
import { getUrl, sendJson } from './_lib/http'

const SEVEN_DAYS_S = 60 * 60 * 24 * 7
const ONE_HOUR_S = 60 * 60
const SEVEN_DAYS_MS = SEVEN_DAYS_S * 1000
const ONE_HOUR_MS = ONE_HOUR_S * 1000

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = getUrl(req)
  const latParam = url.searchParams.get('lat')
  const lngParam = url.searchParams.get('lng')
  // Number(null) is 0, not NaN, so a missing param must be rejected before conversion or
  // it silently becomes a "valid" equator/prime-meridian coordinate.
  const lat = latParam !== null ? Number(latParam) : NaN
  const lng = lngParam !== null ? Number(lngParam) : NaN

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const body: GeologyResponse = {
      found: false,
      message: 'lat and lng query parameters are required and must be valid coordinates.',
    }
    sendJson(res, 400, body)
    return
  }

  // Round before caching AND before querying upstream: geology polygons are orders of
  // magnitude coarser than the ~11m this throws away, and it lets the CDN-level HTTP cache
  // (keyed on the request URL, see the frontend's rounding in lib/api.ts) and this instance's
  // in-memory cache both treat nearby repeat queries as the same point.
  const roundedLat = roundCoord(lat)
  const roundedLng = roundCoord(lng)
  const key = cacheKey(roundedLat, roundedLng)

  const cached = getCached(key)
  if (cached) {
    sendJson(res, 200, cached, cached.found ? SEVEN_DAYS_S : ONE_HOUR_S)
    return
  }

  try {
    const { response, upstreamError } = await routeGeologyQuery(roundedLat, roundedLng)
    if (upstreamError) {
      // Don't cache failures - let the next request retry against upstream fresh.
      sendJson(res, 503, response)
      return
    }
    setCached(key, response, response.found ? SEVEN_DAYS_MS : ONE_HOUR_MS)
    sendJson(res, 200, response, response.found ? SEVEN_DAYS_S : ONE_HOUR_S)
  } catch (err) {
    console.error('[api/geology] unexpected error', err)
    const body: GeologyResponse = { found: false, message: 'Unexpected error looking up geology data.' }
    sendJson(res, 500, body)
  }
}
