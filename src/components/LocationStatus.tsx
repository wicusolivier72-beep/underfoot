import type { GeoPosition, GeolocationStatus } from '../hooks/useGeolocation'

interface Props {
  status: GeolocationStatus
  position: GeoPosition | null
  errorMessage: string | null
  onRetry: () => void
}

export function LocationStatus({ status, position, errorMessage, onRetry }: Props) {
  if (status === 'locating' && !position) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Finding your location…
      </div>
    )
  }

  if (status === 'denied' || status === 'error' || status === 'unsupported') {
    return (
      <div className="flex items-center justify-between gap-2 text-sm text-ink-muted">
        <span>{errorMessage ?? 'Location unavailable.'}</span>
        {status !== 'unsupported' && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded border border-line px-2 py-1 text-xs text-ink hover:bg-surface-2"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (position) {
    return (
      <p className="text-xs text-ink-muted">
        GPS fix ± <span className="font-display text-ink">{Math.round(position.accuracy)} m</span> accuracy
      </p>
    )
  }

  return null
}
