import type { IncomingMessage, ServerResponse } from 'node:http'

/** Works for both a Vercel Node function's req.url and Vite's dev-middleware req.url. */
export function getUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? '/', 'http://internal')
}

export function sendJson(res: ServerResponse, status: number, body: unknown, cacheSeconds = 0): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    cacheSeconds > 0
      ? `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`
      : 'no-store',
  )
  res.end(JSON.stringify(body))
}
