import type { IncomingMessage, ServerResponse } from 'node:http'

/** Works for both a Vercel Node function's req.url and Vite's dev-middleware req.url. */
export function getUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? '/', 'http://internal')
}

/**
 * A hung upstream connection with no timeout would otherwise run until the platform's
 * own function timeout kills the whole request - which returns a platform error page,
 * not JSON, and would surface to the client as a generic "network error" with no useful
 * signal about which of several possible upstream sources actually caused it.
 */
export function fetchWithTimeout(url: string, timeoutMs = 5000, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
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
