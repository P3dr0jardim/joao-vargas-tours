import { NextResponse } from 'next/server'
import { createBookingRequest } from '@/lib/booking/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 16 * 1024

export async function POST(request) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, errors: { _form: 'too_long' } }, { status: 400 })
  }

  let body
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) throw new Error('too_long')
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, errors: { _form: 'invalid' } }, { status: 400 })
  }

  const result = await createBookingRequest({ body, headers: request.headers })
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store', ...result.headers },
  })
}
