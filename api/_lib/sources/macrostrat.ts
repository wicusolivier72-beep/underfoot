import type { GeologyResult, SourceInfo } from '../../../shared/types.ts'
import type { GeologySource } from '../source.ts'
import { lookupTimescaleName } from '../timescale.ts'
import { cleanStr } from '../text.ts'
import { fetchWithTimeout } from '../http.ts'

const MACROSTRAT_BASE = 'https://macrostrat.org/api/v2'

interface MacrostratMapUnit {
  source_id: number
  name: string
  strat_name: string
  lith: string
  descrip: string
  liths: number[]
  t_age: number | null
  b_age: number | null
  best_int_name: string | null
}

interface MacrostratMapResponse {
  success?: {
    data: MacrostratMapUnit[]
    refs: Record<string, string>
  }
}

async function fetchMapUnits(lat: number, lng: number): Promise<{ units: MacrostratMapUnit[]; refs: Record<string, string> }> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), format: 'json' })
  const res = await fetchWithTimeout(`${MACROSTRAT_BASE}/geologic_units/map?${params.toString()}`)
  if (!res.ok) throw new Error(`Macrostrat responded ${res.status}`)
  const data = (await res.json()) as MacrostratMapResponse
  return { units: data.success?.data ?? [], refs: data.success?.refs ?? {} }
}

// Memoized within a warm serverless instance - Macrostrat's lithology vocabulary is a small,
// stable set, so this avoids re-fetching the same handful of ids on every request.
const lithologyNameCache = new Map<number, string | null>()

async function resolveLithName(lithId: number): Promise<string | null> {
  if (lithologyNameCache.has(lithId)) return lithologyNameCache.get(lithId) ?? null
  try {
    const res = await fetchWithTimeout(`${MACROSTRAT_BASE}/defs/lithologies?lith_id=${lithId}&format=json`, 3000)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = (await res.json()) as { success?: { data?: { name?: string }[] } }
    const name = cleanStr(data.success?.data?.[0]?.name)
    lithologyNameCache.set(lithId, name)
    return name
  } catch {
    lithologyNameCache.set(lithId, null)
    return null
  }
}

/**
 * Macrostrat returns every overlapping polygon at this point across all of its ingested
 * source maps (national, continental, world-scale...). It empirically orders these
 * finest-first, but rather than trust that as a guarantee, prefer whichever entry has a
 * populated strat_name - a proxy for "a real named unit was matched" over a generic
 * lithology-only polygon from a coarser world map - and keep array order as the tiebreak.
 */
function pickBestUnit(units: MacrostratMapUnit[]): MacrostratMapUnit | null {
  if (units.length === 0) return null
  return units.find((u) => cleanStr(u.strat_name)) ?? units[0]
}

type RankSlot = 'supergroup' | 'group' | 'formation'

function guessSlot(name: string): RankSlot {
  const upper = name.toUpperCase()
  if (upper.includes('SUPERGROUP')) return 'supergroup'
  if (upper.includes('GROUP')) return 'group'
  return 'formation'
}

/** "Table Mountain Group of Cape Supergroup" -> unit "Table Mountain Group", parent "Cape Supergroup". */
function splitOfPhrase(name: string): { unit: string; parent: string | null } {
  const match = /^(.*?)\bof\b(.*)$/i.exec(name)
  if (!match) return { unit: name, parent: null }
  return { unit: match[1].trim(), parent: match[2].trim() }
}

const SCALE_PATTERN = /1\s*:\s*[\d,]+(?:\.\d+)?\s*(?:million|m)?/i

function buildSourceInfo(unit: MacrostratMapUnit, refs: Record<string, string>): SourceInfo {
  const citation = refs[String(unit.source_id)] ?? 'Macrostrat aggregated global dataset.'
  const scaleMatch = SCALE_PATTERN.exec(citation)
  return {
    id: `macrostrat-${unit.source_id}`,
    name: 'Macrostrat (global aggregation)',
    scale: scaleMatch ? `~${scaleMatch[0].replace(/\s+/g, '')} (per source citation)` : 'Continental/global-scale estimate',
    resolution: 'low',
    citation: `${citation.trim()} Aggregated and served by Macrostrat (CC-BY 4.0).`,
    url: 'https://macrostrat.org/api/v2/geologic_units/map',
  }
}

async function mapUnit(unit: MacrostratMapUnit, refs: Record<string, string>, lat: number, lng: number): Promise<GeologyResult> {
  const stratName = cleanStr(unit.strat_name)
  const displayName = cleanStr(unit.name)

  const hierarchy: Record<RankSlot, string | null> = { supergroup: null, group: null, formation: null }
  if (stratName) hierarchy[guessSlot(stratName)] = stratName

  if (displayName) {
    const { unit: unitPart, parent } = splitOfPhrase(displayName)
    if (parent && !hierarchy.supergroup) hierarchy.supergroup = parent
    if (!stratName && unitPart) hierarchy[guessSlot(unitPart)] = unitPart
  }

  const resolvedLiths = (await Promise.all((unit.liths ?? []).map(resolveLithName))).filter(
    (s): s is string => s !== null,
  )
  const lithology =
    resolvedLiths.length > 0 ? resolvedLiths : [cleanStr(unit.lith), cleanStr(unit.descrip)].filter((s): s is string => s !== null)

  const bestName = cleanStr(unit.best_int_name)
  const tsEntry = lookupTimescaleName(bestName)

  return {
    supergroup: hierarchy.supergroup,
    group: hierarchy.group,
    formation: hierarchy.formation,
    lithology,
    age: {
      name: bestName,
      rank: tsEntry?.rank ?? null,
      topMa: typeof unit.t_age === 'number' ? unit.t_age : null,
      bottomMa: typeof unit.b_age === 'number' ? unit.b_age : null,
      derived: false,
    },
    source: buildSourceInfo(unit, refs),
    queried: { lat, lng },
  }
}

export const macrostratGlobal: GeologySource = {
  id: 'macrostrat-global',
  coverageCheck: () => true,
  async query(lat, lng) {
    const { units, refs } = await fetchMapUnits(lat, lng)
    const best = pickBestUnit(units)
    if (!best) return null
    return mapUnit(best, refs, lat, lng)
  },
}
