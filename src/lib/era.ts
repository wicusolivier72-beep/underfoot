import type { AgeRange } from '../../shared/types'

export type EraKey = 'cenozoic' | 'mesozoic' | 'paleozoic' | 'proterozoic' | 'archean' | 'hadean'

const ERA_BOUNDARIES: { key: EraKey; upToMa: number }[] = [
  { key: 'cenozoic', upToMa: 66 },
  { key: 'mesozoic', upToMa: 251.9 },
  { key: 'paleozoic', upToMa: 538.8 },
  { key: 'proterozoic', upToMa: 2500 },
  { key: 'archean', upToMa: 4000 },
  { key: 'hadean', upToMa: 4600 },
]

/**
 * Buckets an age into one of the six standard eras by numeric midpoint, rather than by
 * matching the source's own interval name - this way it works regardless of whether the
 * source gave us a period ("Cambrian"), an era ("Palaeozoic"), or something non-standard.
 */
export function eraForAge(age: AgeRange): EraKey | null {
  const { topMa, bottomMa } = age
  const mid = topMa !== null && bottomMa !== null ? (topMa + bottomMa) / 2 : (bottomMa ?? topMa)
  if (mid === null || !Number.isFinite(mid)) return null

  for (const { key, upToMa } of ERA_BOUNDARIES) {
    if (mid <= upToMa) return key
  }
  return 'hadean'
}

export const ERA_LABELS: Record<EraKey, string> = {
  cenozoic: 'Cenozoic',
  mesozoic: 'Mesozoic',
  paleozoic: 'Paleozoic',
  proterozoic: 'Proterozoic',
  archean: 'Archean',
  hadean: 'Hadean',
}
