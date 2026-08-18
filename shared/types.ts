/** Shared between the frontend (src/) and the API layer (api/). Keep runtime-free. */

export type SourceResolution = 'high' | 'medium' | 'low'

export interface AgeRange {
  /** Named chronostratigraphic interval as given by the source, e.g. "Cambrian", "Palaeozoic". */
  name: string | null
  /** Rank of the named interval if the source states one, e.g. "Period", "Era". */
  rank: string | null
  /** Older bound in millions of years ago. */
  bottomMa: number | null
  /** Younger bound in millions of years ago. */
  topMa: number | null
  /**
   * True if topMa/bottomMa were looked up from a standard timescale keyed on `name`
   * rather than supplied directly by the source map. Keeps numeric precision from
   * being mistaken for something the cartographer actually measured.
   */
  derived: boolean
}

export interface SourceInfo {
  id: string
  name: string
  /** Human-readable map scale, e.g. "1:500,000" or "~1:10,000,000 (continental estimate)". */
  scale: string
  resolution: SourceResolution
  citation: string
  url?: string
}

export interface GeologyResult {
  supergroup: string | null
  group: string | null
  formation: string | null
  /** One or more lithology components/descriptions, most-specific first. */
  lithology: string[]
  age: AgeRange
  source: SourceInfo
  queried: { lat: number; lng: number }
}

export interface GeologyResponse {
  found: boolean
  result?: GeologyResult
  message?: string
}

export interface GeocodeResult {
  label: string
  lat: number
  lng: number
}

export interface GeocodeResponse {
  results: GeocodeResult[]
}
