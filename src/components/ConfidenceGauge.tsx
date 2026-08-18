import type { SourceResolution } from '../../shared/types'

const TIER_FILL: Record<SourceResolution, number> = { high: 3, medium: 2, low: 1 }

const TIER_LABEL: Record<SourceResolution, string> = {
  high: 'Detailed local survey',
  medium: 'Regional survey',
  low: 'Continental-scale estimate',
}

/**
 * The app's signature element: a map's resolution isn't a single number, so this reduces
 * the source's tier to a quick visual read (like a signal-strength indicator) that sits next
 * to the actual scale ratio rather than replacing it - see SourceBadge.
 */
export function ConfidenceGauge({ resolution }: { resolution: SourceResolution }) {
  const filled = TIER_FILL[resolution]
  return (
    <div className="flex items-center gap-2" title={TIER_LABEL[resolution]}>
      <div className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((tick) => (
          <span
            key={tick}
            className="w-1.5 rounded-sm bg-line"
            style={{
              height: `${6 + tick * 4}px`,
              backgroundColor: tick <= filled ? 'var(--color-accent)' : undefined,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-ink-muted">{TIER_LABEL[resolution]}</span>
    </div>
  )
}
