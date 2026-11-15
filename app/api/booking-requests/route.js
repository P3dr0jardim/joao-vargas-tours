import { NextResponse } from 'next/server'
import { createBookingRequest } from '@/lib/booking/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Worst case: DB lookup (2.5 s) + providers (6 s) + delivery update (2.5 s) stays below this.
export const maxDuration = 15

const MAX_BODY_BYTES = 16 * 1024

const tooLong = () =>
  NextResponse.json({ ok: false, errors: { _form: 'too_long' } }, { status: 400 })

class BodyTooLargeError extends Error {}

/** Read the body as text, never holding more than `max` BYTES (chunked bodies included). */
async function readBodyCapped(request, max) {
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => {})
      throw new BodyTooLargeError()
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

export async function POST(request) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return tooLong()

  let body
  try {
    body = JSON.parse(await readBodyCapped(request, MAX_BODY_BYTES))
  } catch (err) {
    if (err instanceof BodyTooLargeError) return tooLong()
    return NextResponse.json({ ok: false, errors: { _form: 'invalid' } }, { status: 400 })
  }

  try {
    const result = await createBookingRequest({ body, headers: request.headers })
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store', ...result.headers },
    })
  } catch (err) {
    // Never leak internals; the error name carries no personal data.
    console.error('[booking] route error', {
      reason: typeof err?.name === 'string' ? err.name : 'Error',
    })
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
