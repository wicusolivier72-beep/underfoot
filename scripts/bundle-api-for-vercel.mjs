// Vercel's Node function builder only transpiles the single api/*.ts entry file - it does
// NOT bundle or reliably trace local relative imports (confirmed via `vercel logs --follow`:
// ERR_MODULE_NOT_FOUND for lib/*.ts on every deploy, from api/_lib/, from root-level lib/,
// regardless of structure). The robust fix is to not depend on Vercel's tracer at all: bundle
// each entry into one fully self-contained file ourselves, so there's nothing left for it to
// fail to find. api/ has zero npm dependencies of its own (just Node built-ins + local
// files), so this bundle is trivial - no "keep external" list needed beyond esbuild's default
// node: handling.
//
// Vercel determines its function file list from the source tree *before* running this build
// command, then processes that pre-built list afterward - so replacing api/geology.ts with a
// same-named api/geology.js (new file, old one deleted) makes it look for a geology.ts that
// no longer exists ("File not found"). Overwriting each .ts file in place with its bundled
// JS content (still saved with the .ts extension) avoids that mismatch entirely; plain JS is
// syntactically valid to save as .ts, since it uses no TypeScript-only syntax after bundling.
//
// Only runs on Vercel (guarded by the VERCEL env var Vercel sets automatically) - local dev
// and `npm run build` elsewhere leave api/*.ts as real source, since Vite's dev middleware
// (vite.config.ts) needs it in its original, unbundled form.
import { build } from 'esbuild'

if (process.env.VERCEL !== '1') {
  console.log('[bundle-api] VERCEL env var not set, skipping (only needed for Vercel deploys)')
  process.exit(0)
}

const entries = ['api/geology.ts', 'api/geocode.ts']

for (const entry of entries) {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: entry,
    allowOverwrite: true,
    logLevel: 'info',
  })
}

console.log(`[bundle-api] bundled ${entries.length} entry point(s) in place for Vercel`)
