import { createHash, randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Review fixes B2, S3-S8 and the small items. Mocked database, no network.
const db = vi.hoisted(() => ({
  connectDb: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn(),
  findOne: vi.fn(),
}))
vi.mock('@/lib/mongoose', () => ({
  isDbConfigured: () => Boolean(process.env.MONGODB_URI),
  connectDb: db.connectDb,
}))
vi.mock('@/models/BookingRequest', () => ({
  default: {
    create: db.create,
    updateOne: db.updateOne,
    findOne: (...args) => ({ lean: () => db.findOne(...args) }),
  },
}))

import {
  clientIp,
  createBookingRequest,
  getBotDropCount,
  resetBookingState,
} from '@/lib/booking/service'
import { cleanText, normalisePhone, validateBooking } from '@/lib/booking/schema'
import {
  MAX_KEYS,
  consumeRateLimit,
  rateLimitKeyCount,
  releaseRateLimit,
  resetRateLimits,
} from '@/lib/rate-limit'
import { sanitizeWhatsappParam } from '@/lib/whatsapp'

const NOW = Date.parse('2026-11-15T12:00:00Z')
let ipCounter = 0

function validBody(overrides = {}) {
  return {
    serviceSlug: 'west-madeira-tour',
    date: '2026-12-20',
    adults: 2,
    children: 0,
    infants: 0,
    name: 'Anna Schmidt',
    email: `anna${++ipCounter}@example.com`,
    phone: '+49 151 2345 6789',
    locale: 'en',
    consent: true,
    idempotencyKey: randomUUID(),
    bot_trap_field: '',
    formStartedAt: NOW - 20000,
    ...overrides,
  }
}

function headersFor({ ip, origin = 'http://localhost:3000', extra = {} } = {}) {
  const h = new Headers({ 'user-agent': 'vitest', ...extra })
  if (origin !== null) h.set('origin', origin)
  if (ip !== null) h.set('x-forwarded-for', ip ?? `10.2.0.${++ipCounter}`)
  return h
}

const submit = (body, opts = {}, now = NOW) =>
  createBookingRequest({ body, headers: headersFor(opts), now })

function mockFetch({ email = true, whatsapp = true, delayMs = 0 } = {}) {
  const fn = vi.fn(async (url) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
    const isEmail = String(url).startsWith('https://api.resend.com')
    if (!(isEmail ? email : whatsapp)) return new Response('{}', { status: 500 })
    return new Response(JSON.stringify(isEmail ? { id: 'em_1' } : { messages: [{ id: 'wa_1' }] }))
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function enableChannels() {
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('EMAIL_FROM', 'Tours <bookings@example.com>')
  vi.stubEnv('EMAIL_BOOKINGS_TO', 'driver@example.com')
  vi.stubEnv('WHATSAPP_ENABLED', 'true')
  vi.stubEnv('WHATSAPP_API_TOKEN', 'wa_token')
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123456789')
  vi.stubEnv('WHATSAPP_DRIVER_TO', '+351 912 345 678')
  vi.stubEnv('WHATSAPP_TEMPLATE_NAME', 'novo_pedido_reserva')
}

const resendCalls = (fetchMock) =>
  fetchMock.mock.calls.filter((c) => String(c[0]).includes('api.resend.com'))

beforeEach(() => {
  resetBookingState()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  db.connectDb.mockResolvedValue(undefined)
  db.create.mockResolvedValue({})
  db.updateOne.mockResolvedValue({})
  db.findOne.mockResolvedValue(null)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('B1: a rejected save is logged by reason name', () => {
  it('logs the error name and failing field names, never values', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    db.create.mockRejectedValue(
      Object.assign(new Error('secret person@example.com is bad'), {
        name: 'ValidationError',
        errors: { 'serviceSnapshot.title': {}, 'customer.email': {} },
      })
    )
    enableChannels()
    mockFetch()
    expect((await submit(validBody())).status).toBe(201) // channels still deliver
    const call = console.error.mock.calls.find((c) => c[0] === '[booking] db save failed')
    expect(call[1]).toMatchObject({
      reason: 'ValidationError',
      fields: 'serviceSnapshot.title,customer.email',
    })
    expect(JSON.stringify(console.error.mock.calls)).not.toMatch(/person@example|secret/)
  })

  it('names a timeout as "timeout"', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    db.create.mockReturnValue(new Promise(() => {})) // never completes
    enableChannels()
    mockFetch()
    const pending = submit(validBody())
    await vi.advanceTimersByTimeAsync(3000)
    expect((await pending).status).toBe(201)
    const call = console.error.mock.calls.find((c) => c[0] === '[booking] db save failed')
    expect(call[1].reason).toBe('timeout')
  })
})

describe('B2: bot gates never swallow a real booking', () => {
  it('only bot_trap_field is a honeypot: a filled "website" is ignored', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    const res = await submit(validBody({ website: 'https://autofilled.example' }))
    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalled() // really processed
    expect(getBotDropCount()).toBe(0)
  })

  it('a filled bot_trap_field gives a silent fake 201, nothing stored or sent, and is counted', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    const fetchMock = mockFetch()
    const res = await submit(validBody({ bot_trap_field: 'x' }))
    await submit(validBody({ bot_trap_field: 'y' }))
    expect(res.status).toBe(201)
    expect(res.body.ref).toMatch(/^JV-\d{4}-[A-Z0-9]{6}$/)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(db.create).not.toHaveBeenCalled()
    expect(getBotDropCount()).toBe(2)
    const log = console.info.mock.calls.map((c) => c[0]).filter((l) => l.includes('bot'))
    expect(log.at(-1)).toBe('[booking] bot submission dropped reason=honeypot total=2')
  })

  it('a fast fill on a plausible clock is processed and stored with meta.suspect', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    const res = await submit(validBody({ formStartedAt: NOW - 500 }))
    expect(res.status).toBe(201)
    expect(db.create.mock.calls[0][0].meta.suspect).toBe(true)
    expect(console.info.mock.calls.map((c) => c[0]).join('\n')).toContain('suspect=true')
  })

  it('a normal fill time carries no suspect flag', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    await submit(validBody())
    expect(db.create.mock.calls[0][0].meta.suspect).toBeUndefined()
  })
})

describe('S3: client IP and limiter memory', () => {
  const h = (obj) => new Headers(obj)

  it('prefers x-vercel-forwarded-for, then x-real-ip, then the first x-forwarded-for', () => {
    expect(
      clientIp(
        h({
          'x-vercel-forwarded-for': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-forwarded-for': '3.3.3.3',
        })
      )
    ).toBe('1.1.1.1')
    expect(clientIp(h({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3' }))).toBe('2.2.2.2')
    expect(clientIp(h({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }))).toBe('3.3.3.3')
    expect(clientIp(h({}))).toBe('unknown')
    expect(clientIp(h({ 'x-real-ip': 'a'.repeat(500) })).length).toBe(64)
  })

  it('a spoofed x-forwarded-for does not dodge the limit when the platform header is present', async () => {
    const out = []
    for (let i = 0; i < 6; i++) {
      out.push(
        (
          await submit(validBody(), {
            ip: `66.6.6.${i}`, // attacker rotates the spoofable header
            extra: { 'x-vercel-forwarded-for': '9.9.9.9' },
          })
        ).status
      )
    }
    expect(out.slice(0, 5)).not.toContain(429)
    expect(out[5]).toBe(429)
  })

  it('never holds more than MAX_KEYS keys and evicts the oldest first', () => {
    const rule = (key) => [{ key, limit: 1, windowMs: 3600_000 }]
    for (let i = 0; i < MAX_KEYS + 500; i++) consumeRateLimit(rule(`k${i}`), NOW)
    expect(rateLimitKeyCount()).toBe(MAX_KEYS)
    expect(consumeRateLimit(rule('k0'), NOW).allowed).toBe(true) // evicted: forgotten
    expect(consumeRateLimit(rule(`k${MAX_KEYS + 499}`), NOW).allowed).toBe(false) // newest kept
    expect(rateLimitKeyCount()).toBe(MAX_KEYS)
  })

  it('a key that is used again is not the one evicted', () => {
    const rule = (key) => [{ key, limit: 2, windowMs: 3600_000 }]
    consumeRateLimit(rule('old'), NOW)
    for (let i = 0; i < MAX_KEYS - 1; i++) consumeRateLimit(rule(`k${i}`), NOW)
    consumeRateLimit(rule('old'), NOW) // touched: moves to the newest position
    for (let i = 0; i < 100; i++) consumeRateLimit(rule(`n${i}`), NOW)
    expect(consumeRateLimit(rule('old'), NOW).allowed).toBe(false) // still counted (2 hits)
  })

  it('releaseRateLimit gives one hit back', () => {
    resetRateLimits()
    const rule = [{ key: 'q', limit: 1, windowMs: 1000 }]
    consumeRateLimit(rule, 10)
    expect(consumeRateLimit(rule, 11).allowed).toBe(false)
    releaseRateLimit(rule, 10)
    expect(consumeRateLimit(rule, 12).allowed).toBe(true)
    releaseRateLimit([{ key: 'nothing', limit: 1, windowMs: 1 }], 1) // no hit: no error
  })

  it('the customer copy is off by default and never echoes the free-text notes', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    await submit(validBody({ notes: 'I take medication X' }))
    expect(resendCalls(fetchMock)).toHaveLength(1) // driver only

    vi.stubEnv('EMAIL_CUSTOMER_COPY_ENABLED', 'true')
    await submit(validBody({ notes: 'I take medication X' }))
    const mails = resendCalls(fetchMock).map((c) => JSON.parse(c[1].body))
    const customer = mails.find((m) => m.to[0] !== 'driver@example.com')
    expect(customer).toBeDefined()
    expect(JSON.stringify(customer)).not.toContain('medication')
    const driver = mails.find((m) => m.to[0] === 'driver@example.com')
    expect(driver.text).toContain('medication') // the driver does need it
  })
})

describe('S4: idempotency under concurrency', () => {
  it('concurrent requests with the same key send once and share one ref', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    const fetchMock = mockFetch({ delayMs: 20 })
    const body = validBody()
    const results = await Promise.all([submit(body), submit(body), submit(body)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 201])
    expect(new Set(results.map((r) => r.body.ref)).size).toBe(1)
    expect(resendCalls(fetchMock)).toHaveLength(1)
    expect(
      fetchMock.mock.calls.filter((c) => String(c[0]).includes('graph.facebook'))
    ).toHaveLength(1)
    expect(db.create).toHaveBeenCalledTimes(1)
  })

  it('concurrent duplicates share a failed outcome and the key is released afterwards', async () => {
    enableChannels()
    mockFetch({ email: false, whatsapp: false, delayMs: 10 })
    const body = validBody()
    const [a, b] = await Promise.all([submit(body), submit(body)])
    expect([a.status, b.status]).toEqual([502, 502])
    mockFetch()
    expect((await submit(body)).status).toBe(201)
  })

  it('a replay with a different body returns the original ref', async () => {
    const original = validBody()
    const a = await submit(original)
    const b = await submit({ ...original, name: 'Someone Else', adults: 1 })
    expect(b.status).toBe(200)
    expect(b.body.ref).toBe(a.body.ref)
  })

  it('sends the idempotency key to Resend as <key>-driver', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    const body = validBody()
    await submit(body)
    expect(resendCalls(fetchMock)[0][1].headers['Idempotency-Key']).toBe(
      `${body.idempotencyKey}-driver`
    )
  })
})

describe('S5: latency and late saves', () => {
  it('does not touch the database when none is configured', async () => {
    await submit(validBody())
    expect(db.findOne).not.toHaveBeenCalled()
    expect(db.connectDb).not.toHaveBeenCalled()
  })

  it('a save that times out but completes later still gets its delivery result', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    mockFetch()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let finish
    db.create.mockReturnValue(new Promise((r) => (finish = r)))
    const pending = submit(validBody())
    await vi.advanceTimersByTimeAsync(3000)
    expect((await pending).status).toBe(201) // delivered by a channel
    expect(db.updateOne).not.toHaveBeenCalled()
    finish({})
    await vi.advanceTimersByTimeAsync(0)
    expect(db.updateOne).toHaveBeenCalledTimes(1)
    const set = db.updateOne.mock.calls[0][1].$set
    expect(set['delivery.email'].status).toBe('sent')
    expect(set.status).toBe('new')
  })
})

describe('S6: saved but undelivered, and the quota refund', () => {
  it('marks the record delivery_failed and logs the ref (no personal data)', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    mockFetch({ email: false, whatsapp: false })
    const res = await submit(validBody({ name: 'Zelda Unique' }))
    expect(res.status).toBe(201)
    expect(db.updateOne.mock.calls[0][1].$set.status).toBe('delivery_failed')
    const call = console.error.mock.calls.find((c) => String(c[0]).includes('DELIVERY_FAILED'))
    expect(call[1]).toEqual({ ref: res.body.ref, status: 'delivery_failed' })
    expect(JSON.stringify(console.error.mock.calls)).not.toMatch(/zelda|example\.com/i)
  })

  it('keeps status new when a channel delivered', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    mockFetch({ email: false })
    await submit(validBody())
    expect(db.updateOne.mock.calls[0][1].$set.status).toBe('new')
  })

  it('a 502 does not use up the per-email daily quota', async () => {
    enableChannels()
    mockFetch({ email: false, whatsapp: false })
    const email = 'refund@example.com'
    for (let i = 0; i < 4; i++) expect((await submit(validBody({ email }))).status).toBe(502)
    mockFetch()
    expect((await submit(validBody({ email }))).status).toBe(201)
  })

  it('a successful request still uses the quota (3 per day)', async () => {
    const email = 'quota@example.com'
    const statuses = []
    for (let i = 0; i < 4; i++) statuses.push((await submit(validBody({ email }))).status)
    expect(statuses).toEqual([201, 201, 201, 429])
  })
})

describe('S7: origin', () => {
  it('ALLOWED_ORIGINS adds extra origins (comma separated, normalised)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOWED_ORIGINS', 'https://preview.example.pt/, https://other.example ,not a url')
    const status = async (origin) => (await submit(validBody(), { origin })).status
    expect(await status('https://preview.example.pt')).toBe(502) // passes the gate, no channels
    expect(await status('https://other.example')).toBe(502)
    expect(await status('https://evil.example')).toBe(403)
  })

  it('warns once in production when the site URL is missing or localhost', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await submit(validBody())
    await submit(validBody())
    const warnings = console.error.mock.calls.filter((c) =>
      String(c[0]).includes('NEXT_PUBLIC_SITE_URL')
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0][0]).toContain('FORBIDDEN_ORIGIN')
  })

  it('does not warn outside production', async () => {
    await submit(validBody())
    expect(
      console.error.mock.calls.some((c) => String(c[0]).includes('NEXT_PUBLIC_SITE_URL'))
    ).toBe(false)
  })
})

describe('S8: GDPR hardening', () => {
  it('stores no ipHash without IP_HASH_SALT, and a hash with it', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    await submit(validBody(), { ip: '8.8.4.4' })
    expect(db.create.mock.calls[0][0].meta.ipHash).toBeUndefined()
    vi.stubEnv('IP_HASH_SALT', 'pepper')
    await submit(validBody(), { ip: '8.8.4.4' })
    const hash = db.create.mock.calls[1][0].meta.ipHash
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain('8.8.4.4')
  })

  it('never hashes limiter keys with an empty salt', async () => {
    vi.resetModules()
    const keys = []
    vi.doMock('@/lib/rate-limit', async () => {
      const actual = await vi.importActual('@/lib/rate-limit')
      return {
        ...actual,
        consumeRateLimit: (rules, now) => {
          keys.push(...rules.map((r) => r.key))
          return actual.consumeRateLimit(rules, now)
        },
      }
    })
    const mod = await import('@/lib/booking/service')
    await mod.createBookingRequest({
      body: validBody({ email: 'salt@example.com' }),
      headers: headersFor({ ip: '9.9.9.9' }),
      now: NOW,
    })
    const emailKey = keys.find((k) => k.startsWith('email1d:'))
    for (const empty of [`:salt@example.com`, `undefined:salt@example.com`]) {
      expect(emailKey).not.toBe(`email1d:${createHash('sha256').update(empty).digest('hex')}`)
    }
    vi.doUnmock('@/lib/rate-limit')
  })

  it('stores the consent with policy version, consent text version and locale', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    await submit(validBody({ locale: 'pt' }))
    const { consent } = db.create.mock.calls[0][0]
    expect(consent).toMatchObject({ privacy: true, locale: 'pt' })
    expect(consent.version).toMatch(/PLACEHOLDER/)
    expect(consent.textVersion).toMatch(/PLACEHOLDER/)
    expect(consent.at).toEqual(new Date(NOW))
  })
})

describe('unexpected errors become a JSON 500', () => {
  it('returns SERVER_ERROR, logs only a name, and releases the key and quota', async () => {
    vi.resetModules()
    vi.doMock('@/lib/booking/ref', async () => {
      const actual = await vi.importActual('@/lib/booking/ref')
      return {
        ...actual,
        generateRef: () => {
          throw new TypeError('contains person@example.com')
        },
      }
    })
    const mod = await import('@/lib/booking/service')
    const body = validBody({ email: 'boom@example.com' })
    const res = await mod.createBookingRequest({ body, headers: headersFor(), now: NOW })
    expect(res).toEqual({
      status: 500,
      body: { ok: false, code: 'SERVER_ERROR' },
      headers: undefined,
    })
    expect(JSON.stringify(console.error.mock.calls)).not.toContain('person@example.com')
    expect(console.error.mock.calls.at(-1)[1]).toEqual({ reason: 'TypeError' })
    vi.doUnmock('@/lib/booking/ref')
  })
})

describe('N: invisible characters, code points, phones', () => {
  const zw = [0x200b, 0x200c, 0x200d, 0xfeff].map((c) => String.fromCharCode(c)).join('')

  it('cleanText strips zero-width characters', () => {
    expect(cleanText(`Jo${zw}hn`)).toBe('John')
    expect(cleanText(zw)).toBe('')
    const out = validateBooking(validBody({ name: `${zw}Ann${zw} Lee` }), { now: new Date(NOW) })
    expect(out.data.name).toBe('Ann Lee')
  })

  it('a name made only of zero-width characters is required, not accepted', () => {
    const out = validateBooking(validBody({ name: `${zw}${zw}` }), { now: new Date(NOW) })
    expect(out.success).toBe(false)
    expect(out.errors.name).toBe('required')
  })

  it('sanitizeWhatsappParam truncates by code points and never splits an emoji', () => {
    const out = sanitizeWhatsappParam('\u{1F600}'.repeat(100))
    expect(Array.from(out).length).toBeLessThanOrEqual(60)
    expect(out.isWellFormed()).toBe(true)
    expect(sanitizeWhatsappParam(`a${zw}b`)).toBe('ab')
    expect(sanitizeWhatsappParam(zw)).toBe('-')
  })

  it('normalisePhone drops the stray 0 after the country code', () => {
    expect(normalisePhone('+351 (0) 912 345 678')).toBe('+351912345678')
    expect(normalisePhone('+351 0912 345 678')).toBe('+351912345678')
    expect(normalisePhone('00351 (0)912345678')).toBe('+351912345678')
    expect(normalisePhone('+351 912 345 678')).toBe('+351912345678')
    expect(normalisePhone('+49 (0) 151 2345 6789')).toBe('+4915123456789')
  })
})
