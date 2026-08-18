/**
 * Standard ICS International Chronostratigraphic Chart boundary ages, used to derive a
 * numeric Ma range for sources (like the CGS/DWA layer) that only give a named interval
 * with no top/bottom age fields of their own. This is a fixed reference table, not
 * something read off any particular map, so results built from it are flagged
 * `derived: true` rather than presented as the source's own numbers.
 */

export interface TimescaleEntry {
  name: string
  rank: string
  topMa: number
  bottomMa: number
}

const RAW_ENTRIES: TimescaleEntry[] = [
  { name: 'Precambrian', rank: 'Supereon', topMa: 538.8, bottomMa: 4600 },
  { name: 'Hadean', rank: 'Eon', topMa: 4000, bottomMa: 4600 },
  { name: 'Archean', rank: 'Eon', topMa: 2500, bottomMa: 4000 },
  { name: 'Eoarchean', rank: 'Era', topMa: 3600, bottomMa: 4000 },
  { name: 'Paleoarchean', rank: 'Era', topMa: 3200, bottomMa: 3600 },
  { name: 'Mesoarchean', rank: 'Era', topMa: 2800, bottomMa: 3200 },
  { name: 'Neoarchean', rank: 'Era', topMa: 2500, bottomMa: 2800 },
  { name: 'Proterozoic', rank: 'Eon', topMa: 538.8, bottomMa: 2500 },
  { name: 'Paleoproterozoic', rank: 'Era', topMa: 1600, bottomMa: 2500 },
  { name: 'Mesoproterozoic', rank: 'Era', topMa: 1000, bottomMa: 1600 },
  { name: 'Neoproterozoic', rank: 'Era', topMa: 538.8, bottomMa: 1000 },
  { name: 'Tonian', rank: 'Period', topMa: 720, bottomMa: 1000 },
  { name: 'Cryogenian', rank: 'Period', topMa: 635, bottomMa: 720 },
  { name: 'Ediacaran', rank: 'Period', topMa: 538.8, bottomMa: 635 },
  { name: 'Phanerozoic', rank: 'Eon', topMa: 0, bottomMa: 538.8 },
  { name: 'Paleozoic', rank: 'Era', topMa: 251.9, bottomMa: 538.8 },
  { name: 'Cambrian', rank: 'Period', topMa: 485.4, bottomMa: 538.8 },
  { name: 'Ordovician', rank: 'Period', topMa: 443.8, bottomMa: 485.4 },
  { name: 'Silurian', rank: 'Period', topMa: 419.2, bottomMa: 443.8 },
  { name: 'Devonian', rank: 'Period', topMa: 358.9, bottomMa: 419.2 },
  { name: 'Carboniferous', rank: 'Period', topMa: 298.9, bottomMa: 358.9 },
  { name: 'Permian', rank: 'Period', topMa: 251.9, bottomMa: 298.9 },
  { name: 'Mesozoic', rank: 'Era', topMa: 66, bottomMa: 251.9 },
  { name: 'Triassic', rank: 'Period', topMa: 201.4, bottomMa: 251.9 },
  { name: 'Jurassic', rank: 'Period', topMa: 145, bottomMa: 201.4 },
  { name: 'Cretaceous', rank: 'Period', topMa: 66, bottomMa: 145 },
  { name: 'Cenozoic', rank: 'Era', topMa: 0, bottomMa: 66 },
  { name: 'Paleogene', rank: 'Period', topMa: 23.03, bottomMa: 66 },
  { name: 'Paleocene', rank: 'Epoch', topMa: 56, bottomMa: 66 },
  { name: 'Eocene', rank: 'Epoch', topMa: 33.9, bottomMa: 56 },
  { name: 'Oligocene', rank: 'Epoch', topMa: 23.03, bottomMa: 33.9 },
  { name: 'Neogene', rank: 'Period', topMa: 2.58, bottomMa: 23.03 },
  { name: 'Miocene', rank: 'Epoch', topMa: 5.333, bottomMa: 23.03 },
  { name: 'Pliocene', rank: 'Epoch', topMa: 2.58, bottomMa: 5.333 },
  { name: 'Quaternary', rank: 'Period', topMa: 0, bottomMa: 2.58 },
  { name: 'Pleistocene', rank: 'Epoch', topMa: 0.0117, bottomMa: 2.58 },
  { name: 'Holocene', rank: 'Epoch', topMa: 0, bottomMa: 0.0117 },
]

/** Normalizes British/American spelling differences (e.g. Palaeozoic -> Paleozoic) and case. */
function normalize(name: string): string {
  return name.trim().toUpperCase().replace(/AE/g, 'E')
}

const LOOKUP = new Map<string, TimescaleEntry>(RAW_ENTRIES.map((e) => [normalize(e.name), e]))

/** Resolves a named chronostratigraphic interval (any rank, either spelling) to its standard Ma range. */
export function lookupTimescaleName(name: string | null | undefined): TimescaleEntry | null {
  if (!name) return null
  return LOOKUP.get(normalize(name)) ?? null
}
