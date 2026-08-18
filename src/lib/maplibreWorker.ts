import { setWorkerUrl } from 'maplibre-gl'

/**
 * maplibre-gl finds its tile-parsing worker by guessing a URL relative to wherever its own
 * module is executing from - that guess only holds when the file sits untouched in
 * node_modules. Once a bundler moves/renames it (Rollup inlines it into one hashed chunk in
 * production; Vite's dev pre-bundler hashes and relocates it too), the guess 404s and no
 * tile ever gets parsed - only the style's flat background layer paints, regardless of
 * which style is loaded.
 *
 * Pointing setWorkerUrl() at a `?url`-imported copy of just the worker file isn't enough
 * either: maplibre-gl-worker.mjs itself has a relative `import ... from
 * "./maplibre-gl-shared.mjs"` baked in, and a `?url` import copies raw bytes without
 * rewriting that, so the worker would still look for a shared.mjs sibling that was never
 * emitted. Instead, public/maplibre/ holds untouched, unhashed copies of both files
 * (see package.json "postinstall") so they stay genuinely co-located exactly like they are
 * in node_modules/maplibre-gl/dist/, and Vite serves public/ verbatim in both dev and prod.
 *
 * Must run before any Map mounts, hence imported for its side effect at the top of
 * MapView.tsx.
 */
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
