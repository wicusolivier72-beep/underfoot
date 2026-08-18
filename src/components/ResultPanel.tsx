import type { GeologyResult } from '../../shared/types'
import { SourceBadge } from './SourceBadge'
import { eraForAge } from '../lib/era'

function HierarchyRow({ label, value, indent }: { label: string; value: string | null; indent: number }) {
  return (
    <div className="flex items-baseline gap-2" style={{ paddingLeft: `${indent * 14}px` }}>
      <span className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-ink-muted">{label}</span>
      <span className={value ? 'font-medium text-ink' : 'italic text-ink-muted'}>
        {value ?? 'Not given by this source'}
      </span>
    </div>
  )
}

export function ResultPanel({ result }: { result: GeologyResult }) {
  const era = eraForAge(result.age)
  const eraColor = era ? `var(--color-era-${era})` : 'var(--color-line)'
  const hasAgeRange = result.age.topMa !== null && result.age.bottomMa !== null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 border-l-2 border-line pl-3">
        <HierarchyRow label="Supergroup" value={result.supergroup} indent={0} />
        <HierarchyRow label="Group" value={result.group} indent={1} />
        <HierarchyRow label="Formation" value={result.formation} indent={2} />
      </div>

      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-muted">Lithology</p>
        {result.lithology.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {result.lithology.map((l) => (
              <span key={l} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink">
                {l}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-ink-muted">Not given by this source</p>
        )}
      </div>

      <div className="rounded-lg border-l-2 bg-surface-2/60 p-3" style={{ borderColor: eraColor }}>
        <p className="text-[11px] uppercase tracking-wide text-ink-muted">Age</p>
        <p className="mt-1 font-display text-lg font-semibold text-ink">
          {result.age.name ?? 'Unknown'}
          {result.age.rank && <span className="ml-1.5 text-xs font-normal text-ink-muted">({result.age.rank})</span>}
        </p>
        {hasAgeRange ? (
          <p className="mt-0.5 font-display text-sm text-ink-muted">
            {result.age.bottomMa!.toLocaleString()}–{result.age.topMa!.toLocaleString()} Ma
            {result.age.derived && (
              <span className="ml-1.5 text-[11px]">(derived from the standard timescale, not the source map)</span>
            )}
          </p>
        ) : (
          <p className="mt-0.5 text-sm italic text-ink-muted">No numeric age given by this source</p>
        )}
      </div>

      <SourceBadge source={result.source} />
    </div>
  )
}
