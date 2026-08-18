/** Generates a geo-accurate circle polygon (in meters) for rendering GPS accuracy rings. */
export function circlePolygon(lat: number, lng: number, radiusMeters: number, steps = 64) {
  const latRad = (lat * Math.PI) / 180
  const metersPerDegLat = 111_320
  const metersPerDegLng = 111_320 * Math.cos(latRad)

  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dx = (radiusMeters * Math.cos(angle)) / metersPerDegLng
    const dy = (radiusMeters * Math.sin(angle)) / metersPerDegLat
    coords.push([lng + dx, lat + dy])
  }

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
  }
}
