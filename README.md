# Underfoot

Point it at your GPS position (or search/tap anywhere on the map) and it shows the
lithology, age, formation, group, and supergroup at that point — with a source badge on
every result naming which map it came from, its scale, and its citation, so a
continent-scale estimate is never shown with the same confidence as a detailed local
survey.

## Stack

- React + TypeScript + Vite, Tailwind CSS v4, MapLibre GL JS via `@vis.gl/react-maplibre`
  (no API key; base tiles are CARTO's free Voyager vector style, OSM-derived).
- `api/` - one set of Vercel serverless functions (`geology.ts`, `geocode.ts`) that proxy
  the upstream geology APIs (avoids browser CORS), cache responses, and run the
  source-routing logic. No database, no auth.
- `npm run dev` serves both the frontend and `/api/*` from a single Vite dev server (see
  `apiDevMiddleware` in `vite.config.ts`) - no separate backend process or Vercel CLI
  needed locally.

### maplibre-gl's worker files

maplibre-gl parses vector tiles in a Web Worker that it locates at runtime by guessing a
path relative to its own module - a guess that only holds if the file is untouched in
`node_modules`. Both Vite's dev pre-bundler and Rollup's production build relocate/rename
it, breaking that guess (only the style's flat background layer renders, no tiles, no
console error). Fixed by keeping real, unhashed copies of `maplibre-gl-worker.mjs` and its
`maplibre-gl-shared.mjs` sibling in `public/maplibre/` (Vite serves `public/` verbatim in
both dev and prod, so the two stay correctly co-located) and pointing `setWorkerUrl()` at
them explicitly (`src/lib/maplibreWorker.ts`). `npm install` re-syncs those copies via the
`postinstall` script (`scripts/sync-maplibre-worker.mjs`) so upgrading `maplibre-gl` can't
silently leave them on a stale version.

## Running locally

```bash
npm install
npm run dev
```

Geolocation requires HTTPS in most browsers, so over plain `http://localhost` you'll
generally need to fall back to the search box or tapping the map - that's expected, not a
bug.

## Source router

`api/_lib/router.ts` holds a priority-ordered list of `GeologySource` entries
(`api/_lib/source.ts`). For a given point, each source's `coverageCheck` is tried in order;
the first one whose `query` returns a feature wins. Adding a new regional source later is a
config-only change: implement one more `GeologySource` and add it to the list - no other
code changes required.

Currently registered, in order:

1. **Council for Geoscience — Geology 1:1,000,000** (`api/_lib/sources/southAfrica.ts`,
   ArcGIS layer 5) - has real stratigraphic rank/parent/age fields.
2. **Dept. of Water Affairs — Lithology 1:500,000** (same file, ArcGIS layer 7) - lithology
   and a bare unit name only; no age or rank fields at all. Used as a fallback for points
   layer 5 doesn't cover.
3. **Macrostrat** (`api/_lib/sources/macrostrat.ts`) - global default, CC-BY 4.0. Always
   returns *something* for any point on land, tagged as a continental/global-scale estimate.

Both South Africa layers are gated by an actual OpenStreetMap-derived boundary polygon
(`api/_lib/data/southAfricaBoundary.ts`, includes the Lesotho enclave as a hole), not a
bounding box.

> **Note on priority order:** the two South Africa layers are queried CGS-first,
> DWA-second. Live field inspection showed the DWA "Lithology 1:500,000" layer has no
> stratigraphic rank, parent, or age fields at all (it's a hydrogeology simplification, not
> a finer-grained stratigraphic map) — despite its name suggesting higher resolution, it
> can't populate most of what this app shows. CGS layer 5 is queried first because it's the
> one with the fields the app actually needs.

### Licensing note

The Council for Geoscience / DWA ArcGIS endpoint is live and queryable with no API key,
but as of this writing there's no explicit published license for it (unlike Macrostrat's
clearly stated CC-BY 4.0). **Verify usage terms with Council for Geoscience / DWA before
any production or commercial use.**

### Namibia (and everywhere else without a regional source)

No Namibian survey currently exposes a public GIS API, so Namibia falls through to the
Macrostrat fallback and returns coarse, correctly-labeled continental-scale results (e.g.
"Damara Supergroup, Neoproterozoic" covering a huge area). This is expected and fine - the
router architecture is what makes adding real Namibian coverage later a config-only change,
not a prerequisite for this build.

## Caching

Coordinates are rounded to 4 decimal places (~11m, well inside the precision of any of
these maps) both in the browser before the request is built and again in the API handler.
That makes repeat queries near the same spot hit:

1. The API's in-memory per-instance cache (`api/_lib/cache.ts`).
2. `Cache-Control` headers (`s-maxage`) that let Vercel's CDN and the browser's own HTTP
   cache serve repeat requests without invoking the function at all.

Found results cache for 7 days; clean "nothing here" results cache for 1 hour; upstream
failures are never cached, so the next request retries fresh.

## Deferred (not in this build)

Offline/PWA support, a device-orientation strike-and-dip tool, social/community features,
paleogeographic reconstruction, and any Namibia-specific data sourcing.

## Deploying

Framework-detected by Vercel as a Vite app (`vercel.json` pins `buildCommand`/
`outputDirectory` explicitly); `api/*.ts` deploy as serverless functions automatically. No
environment variables are required - every upstream API used here is keyless.
