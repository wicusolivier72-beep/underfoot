import type { IncomingMessage, ServerResponse } from 'node:http'

/** Zero-dependency diagnostic endpoint - isolates whether function invocation works at all. */
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, node: process.version, now: new Date().toISOString() }))
}
