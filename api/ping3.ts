import type { IncomingMessage, ServerResponse } from 'node:http'
import type { GeologyResponse } from '../shared/types.ts'

/** Diagnostic: isolates whether importing (type-only) from ../shared/ specifically is what breaks. */
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  const body: GeologyResponse = { found: false, message: 'ping3 ok' }
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
