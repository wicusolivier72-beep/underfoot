// Vercel's Node function builder only transpiles the single api/*.ts entry file - it does
// NOT bundle or reliably trace local relative imports (confirmed via `vercel logs --follow`:
// ERR_MODULE_NOT_FOUND for lib/*.ts on every deploy, from api/_lib/, from root-level lib/,
// regardless of structure). The robust fix is to not depend on Vercel's tracer at all: bundle
// each entry into one fully self-contained .js file ourselves, so there's nothing left for it
// to fail to find. api/ has zero npm dependencies of its own (just Node built-ins + local
// files), so this bundle is trivial - no "keep external" list needed beyond esbuild's default
// node: handling.
//
// Only runs on Vercel (guarded by the VERCEL env var Vercel sets automatically) - local dev
// and `npm run build` elsewhere leave api/*.ts untouched, since Vite's dev middleware
// (vite.config.ts) and this script both need those source files to exist as-is.
import { build } from 'esbuild'
import { rmSync } from 'node:fs'

if (process.env.VERCEL !== '1') {
  console.log('[bundle-api] VERCEL env var not set, skipping (only needed for Vercel deploys)')
  process.exit(0)
}

const entries = ['api/geology.ts', 'api/geocode.ts']

await build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outdir: 'api',
  allowOverwrite: true,
  logLevel: 'info',
})

for (const entry of entries) {
  rmSync(entry)
}

console.log(`[bundle-api] bundled and replaced ${entries.length} entry point(s) for Vercel`)
