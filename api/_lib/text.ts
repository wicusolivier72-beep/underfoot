/**
 * The CGS/DWA ArcGIS attribute tables use a handful of literal placeholder tokens for "no
 * formal unit assigned" - confirmed live: unconsolidated Quaternary surface deposits (sand,
 * calcrete, alluvium) come back with STRAT_NAME/STRAT_PAR_ literally "*", since they don't
 * get formal lithostratigraphic names the way bedrock units do.
 */
const NULL_TOKENS = new Set(['*', '-', '--', 'N/A', 'NA', 'NONE', 'UNKNOWN', 'UNDIFFERENTIATED'])

/** Trims and treats whitespace-only or placeholder "no data" strings as absent. */
export function cleanStr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (trimmed.length === 0) return null
  if (NULL_TOKENS.has(trimmed.toUpperCase())) return null
  return trimmed
}

/** ALL-CAPS source fields (e.g. "TABLE MOUNTAIN") -> "Table Mountain" for display. */
export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
