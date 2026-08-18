import type { GeologyResult } from '../../shared/types'

/**
 * One entry in the source router. Adding regional coverage later should only ever mean
 * adding one more object shaped like this to the router's source list — see router.ts.
 */
export interface GeologySource {
  id: string
  /** Cheap pre-check so the router can skip a source with no chance of covering the point. */
  coverageCheck(lat: number, lng: number): boolean
  /** Queries upstream and returns a fully-formed, source-tagged result, or null if nothing was found. */
  query(lat: number, lng: number): Promise<GeologyResult | null>
}
