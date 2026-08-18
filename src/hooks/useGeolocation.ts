import { useCallback, useEffect, useRef, useState } from 'react'

export interface GeoPosition {
  lat: number
  lng: number
  /** Accuracy radius in meters, as reported by the browser - shown, never hidden. */
  accuracy: number
}

export type GeolocationStatus = 'idle' | 'locating' | 'success' | 'denied' | 'error' | 'unsupported'

export interface UseGeolocationResult {
  status: GeolocationStatus
  position: GeoPosition | null
  errorMessage: string | null
  requestLocation: () => void
}

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle')
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      setErrorMessage('This browser does not support geolocation.')
      return
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    setStatus('locating')
    setErrorMessage(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('success')
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
          setErrorMessage('Location access was denied. Search for a place or tap the map instead.')
        } else {
          setStatus('error')
          setErrorMessage(err.message || 'Could not determine your location.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  }, [])

  useEffect(() => {
    requestLocation()
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [requestLocation])

  return { status, position, errorMessage, requestLocation }
}
