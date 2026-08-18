import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { Map, Marker, Source, Layer, NavigationControl, type MapRef, type MapLayerMouseEvent } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoPosition } from '../hooks/useGeolocation'
import { circlePolygon } from '../lib/geo'

export interface MapViewHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void
}

interface MapViewProps {
  userPosition: GeoPosition | null
  queriedPoint: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
}

// CARTO's free, no-API-key vector basemap. Voyager, not Dark Matter or OpenFreeMap's
// "liberty": liberty's pale land + Dark Matter's near-black water/landcover (#2C353C on
// #0e0e0e) both read as flat and washed-out at a country-wide zoom, especially with the
// ocean filling most of the view. Voyager uses genuinely distinct colors per feature type
// (cream roads, blue water, green landcover on off-white) so roads/towns/labels are legible
// immediately rather than only after zooming in.
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { userPosition, queriedPoint, onMapClick },
  ref,
) {
  const mapRef = useRef<MapRef | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 13) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1400 })
    },
  }))

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng)
    },
    [onMapClick],
  )

  const accuracyCircle = useMemo(
    () => (userPosition ? circlePolygon(userPosition.lat, userPosition.lng, userPosition.accuracy) : null),
    [userPosition],
  )

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 24, latitude: -29, zoom: 4.4 }}
      mapStyle={MAP_STYLE}
      onClick={handleClick}
      cursor="crosshair"
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {accuracyCircle && (
        <Source id="accuracy" type="geojson" data={accuracyCircle}>
          <Layer
            id="accuracy-fill"
            type="fill"
            paint={{ 'fill-color': '#c98a4b', 'fill-opacity': 0.12 }}
          />
          <Layer
            id="accuracy-line"
            type="line"
            paint={{ 'line-color': '#c98a4b', 'line-width': 1.5, 'line-opacity': 0.6 }}
          />
        </Source>
      )}

      {userPosition && (
        <Marker longitude={userPosition.lng} latitude={userPosition.lat} anchor="center">
          <span className="relative flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-bg bg-accent" />
          </span>
        </Marker>
      )}

      {queriedPoint && (
        <Marker longitude={queriedPoint.lng} latitude={queriedPoint.lat} anchor="bottom">
          {/* Solid accent fill with a white stroke so the pin reads clearly against any
              basemap color underneath it, from ocean blue to light land to dark UI chrome. */}
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" className="drop-shadow-lg">
            <path
              d="M14 0C6.27 0 0 6.27 0 14c0 9.8 12.5 20.86 13.03 21.32a1.5 1.5 0 0 0 1.94 0C15.5 34.86 28 23.8 28 14 28 6.27 21.73 0 14 0Z"
              fill="#c98a4b"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle cx="14" cy="14" r="5" fill="#ffffff" />
          </svg>
        </Marker>
      )}
    </Map>
  )
})
