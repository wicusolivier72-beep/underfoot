import type { GeologyResponse } from '../../shared/types.ts'
import type { GeologySource } from './source.ts'
import { southAfricaGeology1M, southAfricaLithology500k } from './sources/southAfrica.ts'
import { macrostratGlobal } from './sources/macrostrat.ts'

/**
 * Priority-ordered list of registered sources. Adding a new regional source later should
 * only ever mean adding one more entry here - no other code changes. Kept in resolution
 * order (finest first); macrostratGlobal's coverageCheck always returns true, so it is the
 * catch-all and must stay last.
 */
const SOURCES: GeologySource[] = [southAfricaGeology1M, southAfricaLithology500k, macrostratGlobal]

export interface RouteResult {
  response: GeologyResponse
  /** True if the reason we came back empty was an upstream failure, not a clean "no data here". */
  upstreamError: boolean
}

export async function routeGeologyQuery(lat: number, lng: number): Promise<RouteResult> {
  let upstreamError = false

  for (const source of SOURCES) {
    if (!source.coverageCheck(lat, lng)) continue
    try {
      const result = await source.query(lat, lng)
      if (result) return { response: { found: true, result }, upstreamError: false }
    } catch (err) {
      upstreamError = true
      console.error(`[geology-router] source "${source.id}" failed:`, err)
    }
  }

  return {
    response: {
      found: false,
      message: upstreamError
        ? 'One or more geology data services could not be reached. Please try again shortly.'
        : 'No mapped geology data was found at this location.',
    },
    upstreamError,
  }
}
