export type Ring = readonly (readonly [number, number])[]

/** Ray-casting even-odd test for a single ring. Coordinates are [lng, lat]. */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = yi > lat !== yj > lat
    if (!crosses) continue
    const xIntersect = ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (lng < xIntersect) inside = !inside
  }
  return inside
}

export interface BoundsBox {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

export function ringBounds(ring: Ring): BoundsBox {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return { minLng, maxLng, minLat, maxLat }
}

function inBounds(lng: number, lat: number, b: BoundsBox): boolean {
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat
}

/**
 * A polygon with an outer ring and zero or more hole rings (GeoJSON Polygon convention:
 * rings[0] is the outer boundary, rings[1..] are holes cut out of it).
 * Precomputes the outer ring's bounding box as a cheap rejection test before the exact
 * ray-casting check, since coverage checks run on every query.
 */
export class HolePolygon {
  private readonly outer: Ring
  private readonly holes: Ring[]
  private readonly bounds: BoundsBox

  constructor(rings: Ring[]) {
    if (rings.length === 0) throw new Error('HolePolygon requires at least an outer ring')
    this.outer = rings[0]
    this.holes = rings.slice(1)
    this.bounds = ringBounds(this.outer)
  }

  contains(lng: number, lat: number): boolean {
    if (!inBounds(lng, lat, this.bounds)) return false
    if (!pointInRing(lng, lat, this.outer)) return false
    for (const hole of this.holes) {
      if (pointInRing(lng, lat, hole)) return false
    }
    return true
  }
}

/** A MultiPolygon: a point counts as covered if it falls in any constituent polygon. */
export class MultiHolePolygon {
  private readonly polygons: HolePolygon[]

  constructor(polygons: Ring[][]) {
    this.polygons = polygons.map((rings) => new HolePolygon(rings))
  }

  contains(lng: number, lat: number): boolean {
    return this.polygons.some((p) => p.contains(lng, lat))
  }
}
