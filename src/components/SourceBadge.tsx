import type { SourceInfo } from '../../shared/types'
import { ConfidenceGauge } from './ConfidenceGauge'

export function SourceBadge({ source }: { source: SourceInfo }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">Source</p>
          <p className="font-display text-sm font-medium text-ink">{source.name}</p>
        </div>
        <p className="whitespace-nowrap font-display text-sm font-semibold text-accent">{source.scale}</p>
      </div>

      <div className="mt-2.5">
        <ConfidenceGauge resolution={source.resolution} />
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">{source.citation}</p>

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-xs text-accent hover:underline"
        >
          View source endpoint ↗
        </a>
      )}
    </div>
  )
}
