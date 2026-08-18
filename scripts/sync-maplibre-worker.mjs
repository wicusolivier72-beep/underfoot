// Keeps public/maplibre/ in sync with whatever maplibre-gl version is actually installed.
// See src/lib/maplibreWorker.ts for why these two files need to be copied verbatim rather
// than referenced via a Vite `?url` import.
import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'node_modules', 'maplibre-gl', 'dist')
const dest = join(root, 'public', 'maplibre')

mkdirSync(dest, { recursive: true })
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(src, file), join(dest, file))
}
console.log('synced maplibre-gl worker files into public/maplibre/')
