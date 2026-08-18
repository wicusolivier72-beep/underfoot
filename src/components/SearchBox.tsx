import { useEffect, useRef, useState } from 'react'
import { fetchGeocode } from '../lib/api'
import type { GeocodeResult } from '../../shared/types'

interface Props {
  onSelect: (result: GeocodeResult) => void
}

export function SearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<number | null>(null)
  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    // Selecting a result sets `query` to its label via setQuery below, which would
    // otherwise re-trigger this effect and re-open the dropdown right after closing it.
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setResults([])
      return
    }
    debounceRef.current = window.setTimeout(() => {
      setLoading(true)
      fetchGeocode(trimmed)
        .then((res) => {
          setResults(res.results)
          setOpen(true)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 400)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search a place…"
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">…</span>}

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface-2 shadow-xl">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                onClick={() => {
                  skipNextSearchRef.current = true
                  onSelect(r)
                  setQuery(r.label)
                  setResults([])
                  setOpen(false)
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
