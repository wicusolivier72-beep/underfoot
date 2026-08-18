import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Lets `npm run dev` serve api/*.ts the same way Vercel does in production: each file's
 * default export is a (req, res) handler. Vite's ssrLoadModule compiles the TS module graph
 * (including the shared/ and api/lib/ imports) on the fly, so no separate dev server or
 * Vercel CLI is needed locally.
 */
function apiDevMiddleware(): Plugin {
  const mount = (server: ViteDevServer, route: string, modulePath: string) => {
    server.middlewares.use(route, async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const mod = await server.ssrLoadModule(modulePath)
        await (mod.default as (req: IncomingMessage, res: ServerResponse) => Promise<void>)(req, res)
      } catch (err) {
        console.error(`[api-dev-middleware] ${route} failed`, err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ found: false, message: 'Dev API middleware error.' }))
      }
    })
  }

  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      mount(server, '/api/geology', '/api/geology.ts')
      mount(server, '/api/geocode', '/api/geocode.ts')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevMiddleware()],
  resolve: {
    // Without this, Vite's dep pre-bundler can end up serving @vis.gl/react-maplibre a
    // different React module instance than the app tree, which breaks its hooks with
    // "Invalid hook call" / null useContext.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // maplibre-gl spawns a tile-parsing Web Worker by looking for "maplibre-gl-worker.mjs"
    // next to its own bundle at runtime. Vite's dep pre-bundler renames/hashes the main
    // bundle but doesn't carry that worker sibling file along, so the worker 404s and no
    // vector tile ever gets parsed - only the style's flat background layer renders,
    // whichever style is picked. maplibre-gl already ships clean modern ESM, so it doesn't
    // need pre-bundling anyway; excluding it serves it straight from node_modules where the
    // worker file is really sitting next to it.
    exclude: ['maplibre-gl'],
  },
})
