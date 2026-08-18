import { useCallback, useEffect, useRef, useState } from 'react'
import { MapView, type MapViewHandle } from './components/MapView'
import { SearchBox } from './components/SearchBox'
import { LocationStatus } from './components/LocationStatus'
import { ResultPanel } from './components/ResultPanel'
import { useGeolocation } from './hooks/useGeolocation'
import { fetchGeology } from './lib/api'
import type { GeocodeResult, GeologyResponse } from '../shared/types'

type GeologyState = { status: 'idle' } | { status: 'loading' } | { status: 'loaded'; response: GeologyResponse }

function App() {
  const geo = useGeolocation()
  const mapViewRef = useRef<MapViewHandle>(null)
  const hasAutoQueriedRef = useRef(false)
  const requestIdRef = useRef(0)

  const [queriedPoint, setQueriedPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [geologyState, setGeologyState] = useState<GeologyState>({ status: 'idle' })

  const queryPoint = useCallback(async (lat: number, lng: number) => {
    setQueriedPoint({ lat, lng })
    setGeologyState({ status: 'loading' })
    const requestId = ++requestIdRef.current
    try {
      const response = await fetchGeology(lat, lng)
      if (requestId === requestIdRef.current) setGeologyState({ status: 'loaded', response })
    } catch {
      if (requestId === requestIdRef.current) {
        setGeologyState({
          status: 'loaded',
          response: { found: false, message: 'Network error - check your connection and try again.' },
        })
      }
    }
  }, [])

  // Center + query once on the first GPS fix only; later watchPosition updates just move
  // the live position dot (see MapView) without yanking the view or re-querying.
  useEffect(() => {
    if (geo.status === 'success' && geo.position && !hasAutoQueriedRef.current) {
      hasAutoQueriedRef.current = true
      mapViewRef.current?.flyTo(geo.position.lat, geo.position.lng, 12)
      void queryPoint(geo.position.lat, geo.position.lng)
    }
  }, [geo.status, geo.position, queryPoint])

  const handleMapClick = useCallback((lat: number, lng: number) => void queryPoint(lat, lng), [queryPoint])

  const handleSearchSelect = useCallback(
    (result: GeocodeResult) => {
      mapViewRef.current?.flyTo(result.lat, result.lng, 12)
      void queryPoint(result.lat, result.lng)
    },
    [queryPoint],
  )

  const handleUseMyLocation = useCallback(() => {
    if (geo.position) {
      mapViewRef.current?.flyTo(geo.position.lat, geo.position.lng, 12)
      void queryPoint(geo.position.lat, geo.position.lng)
    } else {
      geo.requestLocation()
    }
  }, [geo, queryPoint])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <MapView
        ref={mapViewRef}
        userPosition={geo.position}
        queriedPoint={queriedPoint}
        onMapClick={handleMapClick}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[72vh] flex-col overflow-y-auto rounded-t-2xl border-t border-line bg-surface/95 shadow-2xl backdrop-blur-sm md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[400px] md:rounded-2xl md:border">
        <div className="flex flex-col gap-3 p-4">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Underfoot</h1>
            <p className="text-xs text-ink-muted">The geology beneath your feet, sourced and scaled honestly.</p>
          </div>

          <SearchBox onSelect={handleSearchSelect} />

          <div className="flex items-center justify-between gap-2">
            <LocationStatus
              status={geo.status}
              position={geo.position}
              errorMessage={geo.errorMessage}
              onRetry={geo.requestLocation}
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="shrink-0 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"
            >
              Use my location
            </button>
          </div>
        </div>

        <div className="border-t border-line p-4">
          {geologyState.status === 'idle' && (
            <p className="text-sm text-ink-muted">
              Tap anywhere on the map to see the lithology, age, formation, group, and supergroup at that point.
            </p>
          )}

          {geologyState.status === 'loading' && (
            <div className="flex items-center gap-2 py-6 text-sm text-ink-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
              Reading the ground…
            </div>
          )}

          {geologyState.status === 'loaded' && geologyState.response.found && geologyState.response.result && (
            <ResultPanel result={geologyState.response.result} />
          )}

          {geologyState.status === 'loaded' && !geologyState.response.found && (
            <p className="text-sm text-ink-muted">
              {geologyState.response.message ?? 'No mapped geology data was found at this location.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
