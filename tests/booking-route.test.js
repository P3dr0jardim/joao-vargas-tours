import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The route runs the real service with a mocked database (no network, no real DB).
const db = vi.hoisted(() => ({
  create: vi.fn(),
  updateOne: vi.fn(),
  findOne: vi.fn(),
}))
vi.mock('@/lib/mongoose', () => ({
  isDbConfigured: () => Boolean(process.env.MONGODB_URI),
  connectDb: async () => undefined,
}))
vi.mock('@/models/BookingRequest', () => ({
  default: {
    create: db.create,
    updateOne: db.updateOne,
    findOne: (...args) => ({ lean: () => db.findOne(...args) }),
  },
}))

import * as route from '@/app/api/booking-requests/route'
import { resetBookingState } from '@/lib/booking/service'
import { todayInMadeira } from '@/lib/booking/schema'

let ipCounter = 0

/** A date 30 days ahead in Madeira, always inside the allowed window. */
function futureDate() {
  const [y, m, d] = todayInMadeira().split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + 30))
  return date.toISOString().slice(0, 10)
}

function validBody(overrides = {}) {
  return {
    serviceSlug: 'west-madeira-tour',
    date: futureDate(),
    adults: 2,
    children: 0,
    infants: 0,
    name: 'Anna Schmidt',
    email: `anna${Math.random().toString(36).slice(2)}@example.com`,
    phone: '+49 151 2345 6789',
    locale: 'en',
    consent: true,
    idempotencyKey: randomUUID(),
    website: '',
    formStartedAt: Date.now() - 20000,
    ...overrides,
  }
}

function post(raw, { headers = {}, ip } = {}) {
  const body = typeof raw === 'string' ? raw : JSON.stringify(raw)
  return route.POST(
    new Request('http://localhost:3000/api/booking-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': ip ?? `11.0.0.${++ipCounter}`,
        ...headers,
      },
      body,
    })
  )
}

beforeEach(() => {
  resetBookingState()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  db.create.mockResolvedValue({})
  db.updateOne.mockResolvedValue({})
  db.findOne.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('POST /api/booking-requests (route handler)', () => {
  it('only exposes POST and is never cached or statically rendered', () => {
    expect(route.POST).toBeTypeOf('function')
    for (const verb of ['GET', 'PUT', 'PATCH', 'DELETE']) expect(route[verb]).toBeUndefined()
    expect(route.dynamic).toBe('force-dynamic')
    expect(route.runtime).toBe('nodejs')
  })

  it('returns 201 JSON with no-store for a valid request', async () => {
    const res = await post(validBody())
    expect(res.status).toBe(201)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.ref).toMatch(/^JV-\d{4}-[A-Z0-9]{6}$/)
  })

  it('answers malformed JSON with 400 and a code, never an exception or stack', async () => {
    for (const raw of ['{', '{"a":', 'not json', '', '   ', '<html>', "{'a':1}"]) {
      const res = await post(raw)
      expect(res.status, raw).toBe(400)
      const json = await res.json()
      expect(json).toEqual({ ok: false, errors: { _form: 'invalid' } })
    }
  })

  it('answers valid JSON that is not an object with 400', async () => {
    for (const raw of ['null', '[]', '[1,2]', '"text"', '42', 'true']) {
      const res = await post(raw)
      expect(res.status, raw).toBe(400)
      expect((await res.json()).errors).toEqual({ _form: 'invalid' })
    }
  })

  it('rejects an oversized declared Content-Length before reading the body', async () => {
    const res = await post(JSON.stringify(validBody()), {
      headers: { 'content-length': String(16 * 1024 + 1) },
    })
    expect(res.status).toBe(400)
    expect((await res.json()).errors).toEqual({ _form: 'too_long' })
    expect(db.create).not.toHaveBeenCalled()
  })

  it('rejects an oversized body even without a Content-Length header', async () => {
    const res = await post(validBody({ notes: 'x'.repeat(20 * 1024) }))
    expect(res.status).toBe(400)
    expect((await res.json()).ok).toBe(false)
  })

  it('accepts a body just under the limit and lets field validation decide', async () => {
    const res = await post(validBody({ notes: 'x'.repeat(1001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).errors).toEqual({ notes: 'too_long' })
  })

  it('403 for a missing or foreign Origin, with a code only', async () => {
    const foreign = await post(validBody(), { headers: { origin: 'https://evil.example' } })
    expect(foreign.status).toBe(403)
    expect(await foreign.json()).toEqual({ ok: false, code: 'FORBIDDEN_ORIGIN' })

    const missing = await route.POST(
      new Request('http://localhost:3000/api/booking-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '12.0.0.1' },
        body: JSON.stringify(validBody()),
      })
    )
    expect(missing.status).toBe(403)
  })

  it('403 wins over a malformed body only after the body is parsed (documented order)', async () => {
    // The route parses JSON first, so a bad body from a foreign origin is a 400, not a 403.
    const res = await post('{', { headers: { origin: 'https://evil.example' } })
    expect(res.status).toBe(400)
  })

  it('429 includes a numeric Retry-After header and the no-store header', async () => {
    let last
    for (let i = 0; i < 6; i++) last = await post(validBody(), { ip: '13.0.0.1' })
    expect(last.status).toBe(429)
    expect(Number(last.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(last.headers.get('cache-control')).toBe('no-store')
    expect(await last.json()).toEqual({ ok: false, code: 'RATE_LIMITED' })
  })

  it('duplicate idempotency key gives 200 with the same ref', async () => {
    const body = validBody()
    const first = await (await post(body)).json()
    const second = await post(body)
    expect(second.status).toBe(200)
    expect((await second.json()).ref).toBe(first.ref)
  })

  it('field errors never echo user input back', async () => {
    const res = await post(validBody({ name: '<script>x</script>', email: 'bad<script>' }))
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).not.toContain('script')
  })

  it('does not leak internals on a 502', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await post(validBody())
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(Object.keys(json).sort()).toEqual(['code', 'ok', 'whatsappUrl'])
    expect(json.code).toBe('DELIVERY_FAILED')
  })
})
