import type { IncomingMessage, ServerResponse } from 'node:http'
import { cleanStr } from './_lib/text.ts'

/** Diagnostic: isolates whether importing from ./_lib/ specifically is what breaks. */
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, cleanStrTest: cleanStr('  hi  ') }))
}
