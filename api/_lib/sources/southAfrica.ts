import type { GeologyResult } from '../../../shared/types'
import type { GeologySource } from '../source'
import { MultiHolePolygon } from '../geometry'
import { SOUTH_AFRICA_POLYGONS } from '../data/southAfricaBoundary'
import { lookupTimescaleName } from '../timescale'
import { cleanStr, titleCase } from '../text'
import { fetchWithTimeout } from '../http'

/**
 * Council for Geoscience / Dept. of Water Affairs ArcGIS REST service. Live and queryable
 * with no API key, but as of this writing DPME/CGS/DWA have not published an explicit usage
 * license for this specific endpoint (unlike Macrostrat's clear CC-BY 4.0) — verify terms
 * with Council for Geoscience / DWA before any production or commercial use.
 */
const ARCGIS_BASE = 'https://dpmegis.dpme.gov.za/arcgis/rest/services/Geology/MapServer'

const coveragePolygon = new MultiHolePolygon(SOUTH_AFRICA_POLYGONS)

function coverageCheck(lat: number, lng: number): boolean {
  return coveragePolygon.contains(lng, lat)
}

async function queryLayer(layer: number, lat: number, lng: number): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    f: 'json',
  })
  const res = await fetchWithTimeout(`${ARCGIS_BASE}/${layer}/query?${params.toString()}`)
  if (!res.ok) throw new Error(`CGS/DWA ArcGIS layer ${layer} responded ${res.status}`)
  const data = (await res.json()) as { features?: { attributes: Record<string, unknown> }[] }
  return (data.features ?? []).map((f) => f.attributes)
}

type RankSlot = 'supergroup' | 'group' | 'formation'

/** South African Committee for Stratigraphy rank abbreviations, as seen in STRAT_RANK/STRAT_PAR1. */
const RANK_SLOTS: Record<string, RankSlot> = {
  SPGRP: 'supergroup',
  SGRP: 'supergroup',
  SUPGRP: 'supergroup',
  SUPERGROUP: 'supergroup',
  GRP: 'group',
  GP: 'group',
  GROUP: 'group',
  SBGRP: 'group',
  SUBGROUP: 'group',
  FM: 'formation',
  FORMATION: 'formation',
  MB: 'formation',
  MEMBER: 'formation',
  SUITE: 'formation',
  CPLX: 'formation',
  COMPLEX: 'formation',
  BED: 'formation',
  SEQ: 'formation',
}

function slotForRank(rank: string | null, fallback: RankSlot): RankSlot {
  if (!rank) return fallback
  return RANK_SLOTS[rank.toUpperCase()] ?? fallback
}

/** CHRONO_RAN abbreviations, e.g. "SYS" -> "System", "ERA" -> "Era". */
const CHRONO_RANK_LABELS: Record<string, string> = {
  EON: 'Eon',
  ERA: 'Era',
  SYS: 'System',
  SYSTEM: 'System',
  SERIES: 'Series',
  STAGE: 'Stage',
  EPOCH: 'Epoch',
  PERIOD: 'Period',
}

function chronoRankLabel(rank: string): string {
  return CHRONO_RANK_LABELS[rank.toUpperCase()] ?? titleCase(rank)
}

// --- Layer 5: Council for Geoscience "Geology 1 million" ---
// Verified live field names: STRAT_NAME, STRAT_RANK, STRAT_PAR_ (parent name), STRAT_PAR1
// (parent rank), CHRONO_NAM, CHRONO_RAN, LITHO_1, LITH0_2 (a zero, not a letter O - a quirk
// in the live schema), LITHO_3-5, QUALIFIER. This is the layer that actually carries
// stratigraphic rank + age fields, so it is queried before layer 7 (see mapFields note below).

const CGS_GEOLOGY_1M_SOURCE = {
  id: 'za-cgs-geology-1m',
  name: 'Council for Geoscience — Geology 1:1,000,000',
  scale: '1:1,000,000',
  resolution: 'high' as const,
  citation:
    'Council for Geoscience, Republic of South Africa. National geological map, 1:1,000,000 scale. Served via the Dept. of Planning, Monitoring & Evaluation ArcGIS REST endpoint (dpmegis.dpme.gov.za).',
  url: 'https://dpmegis.dpme.gov.za/arcgis/rest/services/Geology/MapServer/5',
}

function mapLayer5(attrs: Record<string, unknown>, lat: number, lng: number): GeologyResult | null {
  const name = cleanStr(attrs.STRAT_NAME)
  if (!name) return null

  const rank = cleanStr(attrs.STRAT_RANK)
  const parentName = cleanStr(attrs.STRAT_PAR_)
  const parentRank = cleanStr(attrs.STRAT_PAR1)

  const hierarchy: Record<RankSlot, string | null> = { supergroup: null, group: null, formation: null }
  hierarchy[slotForRank(rank, 'formation')] = titleCase(name)
  if (parentName) hierarchy[slotForRank(parentRank, 'group')] = titleCase(parentName)

  const lithology = [attrs.LITHO_1, attrs.LITH0_2, attrs.LITHO_3, attrs.LITHO_4, attrs.LITHO_5, attrs.QUALIFIER]
    .map(cleanStr)
    .filter((s): s is string => s !== null)
    .map(titleCase)

  const chronoName = cleanStr(attrs.CHRONO_NAM)
  const chronoRank = cleanStr(attrs.CHRONO_RAN)
  const tsEntry = lookupTimescaleName(chronoName)

  return {
    supergroup: hierarchy.supergroup,
    group: hierarchy.group,
    formation: hierarchy.formation,
    lithology,
    age: {
      name: chronoName ? titleCase(chronoName) : null,
      rank: chronoRank ? chronoRankLabel(chronoRank) : (tsEntry?.rank ?? null),
      topMa: tsEntry?.topMa ?? null,
      bottomMa: tsEntry?.bottomMa ?? null,
      derived: tsEntry !== null,
    },
    source: CGS_GEOLOGY_1M_SOURCE,
    queried: { lat, lng },
  }
}

export const southAfricaGeology1M: GeologySource = {
  id: CGS_GEOLOGY_1M_SOURCE.id,
  coverageCheck,
  async query(lat, lng) {
    const features = await queryLayer(5, lat, lng)
    for (const attrs of features) {
      const mapped = mapLayer5(attrs, lat, lng)
      if (mapped) return mapped
    }
    return null
  },
}

// --- Layer 7: DWA "Lithology 1:500,000" ---
// Verified live fields: UNIT_S_ (a single unit name, e.g. "TABLE MOUNTAIN GROUP"), LITHOLOGY
// (a free-text description), ROCK_TYPE. No stratigraphic rank/parent fields and no age
// fields at all - this is a hydrogeology-oriented simplification, not a finer-grained
// stratigraphic map. It is queried as a fallback for lithology/unit-name only, after layer 5.

const DWA_LITHOLOGY_500K_SOURCE = {
  id: 'za-dwa-lithology-500k',
  name: 'Dept. of Water Affairs — Lithology 1:500,000',
  scale: '1:500,000',
  resolution: 'high' as const,
  citation:
    'Department of Water Affairs, Republic of South Africa. Simplified lithology / hydrogeology map, 1:500,000 scale. Served via the Dept. of Planning, Monitoring & Evaluation ArcGIS REST endpoint (dpmegis.dpme.gov.za).',
  url: 'https://dpmegis.dpme.gov.za/arcgis/rest/services/Geology/MapServer/7',
}

function guessSlotFromName(name: string): RankSlot {
  const upper = name.toUpperCase()
  if (upper.includes('SUPERGROUP')) return 'supergroup'
  if (upper.includes('GROUP')) return 'group'
  return 'formation'
}

function mapLayer7(attrs: Record<string, unknown>, lat: number, lng: number): GeologyResult | null {
  const unitName = cleanStr(attrs.UNIT_S_)
  const lithologyText = cleanStr(attrs.LITHOLOGY)
  const rockType = cleanStr(attrs.ROCK_TYPE)
  if (!unitName && !lithologyText && !rockType) return null

  const hierarchy: Record<RankSlot, string | null> = { supergroup: null, group: null, formation: null }
  if (unitName) hierarchy[guessSlotFromName(unitName)] = titleCase(unitName)

  // LITHOLOGY/ROCK_TYPE are already natural-case descriptive sentences in this layer, unlike
  // layer 5's ALL-CAPS single-word codes, so they are cleaned but not title-cased.
  const lithology = [lithologyText, rockType].filter((s): s is string => s !== null)

  return {
    supergroup: hierarchy.supergroup,
    group: hierarchy.group,
    formation: hierarchy.formation,
    lithology,
    age: { name: null, rank: null, topMa: null, bottomMa: null, derived: false },
    source: DWA_LITHOLOGY_500K_SOURCE,
    queried: { lat, lng },
  }
}

export const southAfricaLithology500k: GeologySource = {
  id: DWA_LITHOLOGY_500K_SOURCE.id,
  coverageCheck,
  async query(lat, lng) {
    const features = await queryLayer(7, lat, lng)
    for (const attrs of features) {
      const mapped = mapLayer7(attrs, lat, lng)
      if (mapped) return mapped
    }
    return null
  },
}
