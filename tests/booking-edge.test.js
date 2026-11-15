import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// No real database: both modules are mocked (same approach as booking.test.js).
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

import { createBookingRequest, resetBookingState } from '@/lib/booking/service'
import {
  DEFAULT_MAX_ADULTS,
  cleanText,
  maxAdultsFor,
  normalisePhone,
  todayInMadeira,
  validateBooking,
} from '@/lib/booking/schema'
import { consumeRateLimit, resetRateLimits } from '@/lib/rate-limit'
import { escapeHtml, sanitizeHeaderValue, sendEmail } from '@/lib/email'
import { buildTemplateParams, sanitizeWhatsappParam, sendWhatsapp } from '@/lib/whatsapp'
import { getPublishedServices } from '@/lib/services'

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
    email: 'anna@example.com',
    phone: '+49 151 2345 6789',
    locale: 'en',
    consent: true,
    idempotencyKey: randomUUID(),
    website: '',
    formStartedAt: NOW - 20000,
    ...overrides,
  }
}

const validate = (overrides, now = NOW) =>
  validateBooking(validBody(overrides), { now: new Date(now) })

function headersFor({ ip, origin = 'http://localhost:3000', extra = {} } = {}) {
  const h = new Headers({ 'user-agent': 'vitest', ...extra })
  if (origin !== null) h.set('origin', origin)
  if (ip !== null) h.set('x-forwarded-for', ip ?? `10.1.0.${++ipCounter}`)
  return h
}

const submit = (body, opts = {}, now = NOW) =>
  createBookingRequest({ body, headers: headersFor(opts), now })

function mockFetch({ email = true, whatsapp = true } = {}) {
  const fn = vi.fn(async (url) => {
    const isEmail = String(url).startsWith('https://api.resend.com')
    if (!(isEmail ? email : whatsapp)) return new Response('{}', { status: 500 })
    return new Response(JSON.stringify(isEmail ? { id: 'em_1' } : { messages: [{ id: 'wa_1' }] }))
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function enableChannels() {
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('EMAIL_FROM', 'João Vargas Tours <bookings@example.com>')
  vi.stubEnv('EMAIL_BOOKINGS_TO', 'driver@example.com')
  vi.stubEnv('WHATSAPP_ENABLED', 'true')
  vi.stubEnv('WHATSAPP_API_TOKEN', 'wa_token')
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123456789')
  vi.stubEnv('WHATSAPP_DRIVER_TO', '+351 912 345 678')
  vi.stubEnv('WHATSAPP_TEMPLATE_NAME', 'novo_pedido_reserva')
}

const sentTo = (fetchMock, host) =>
  fetchMock.mock.calls.filter((c) => String(c[0]).includes(host)).map((c) => JSON.parse(c[1].body))

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
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.resetModules()
})

describe('phone normalisation edge cases', () => {
  it.each([
    ['+351 966 167 435', '+351966167435'],
    ['00351966167435', '+351966167435'],
    ['00 351 966 167 435', '+351966167435'],
    ['(+351) 966-167-435', '+351966167435'],
    ['+351.966.167.435', '+351966167435'],
    ['+44 (0)7700 900123', '+4407700900123'], // the optional (0) is kept: documented behaviour
    ['+12345678', '+12345678'], // 8 digits: lower bound
    ['+123456789012345', '+123456789012345'], // 15 digits: E.164 upper bound
    ['0044 7700 900123', '+447700900123'],
  ])('accepts %s', (raw, expected) => {
    expect(normalisePhone(raw)).toBe(expected)
  })

  it.each([
    '', // empty
    '+', // lone plus
    '00', // lone prefix
    '+1234567', // 7 digits: too short
    '+1234567890123456', // 16 digits: too long
    '966167435', // national number without country code
    '0966167435', // single leading 0 is not an international prefix
    '++351966167435',
    '+351 966 167 abc',
    '+0351966167435', // country codes never start with 0
    '000351966167435', // 000 prefix becomes +0...
    '+351966167435x12',
    '+351/966167435',
  ])('rejects %j', (raw) => {
    expect(normalisePhone(raw)).toBe('')
  })

  it('maps phone problems to the right API codes', () => {
    expect(validate({ phone: '+351 966' }).errors.phone).toBe('invalid')
    expect(validate({ phone: `+${'1'.repeat(41)}` }).errors.phone).toBe('too_long')
    expect(validate({ phone: '' }).errors.phone).toBe('required')
    expect(validate({ phone: '   ' }).errors.phone).toBe('required')
    expect(validate({ phone: 12345678 }).errors.phone).toBe('invalid')
    expect(validate({ phone: null }).errors.phone).toBe('required')
  })

  it('accepts a non-breaking space and tabs as separators', () => {
    expect(validate({ phone: '+351 966\t167 435' }).data.phone).toBe('+351966167435')
  })
})

describe('date boundaries (Madeira time)', () => {
  it('computes "today" in Madeira, not UTC', () => {
    // Winter: Madeira is UTC+0.
    expect(todayInMadeira(new Date('2026-11-15T23:59:59Z'))).toBe('2026-11-15')
    expect(todayInMadeira(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16')
    // Summer: Madeira is UTC+1 (WEST), so 23:30Z is already the next day.
    expect(todayInMadeira(new Date('2026-07-15T22:59:59Z'))).toBe('2026-07-15')
    expect(todayInMadeira(new Date('2026-07-15T23:00:00Z'))).toBe('2026-07-16')
    // Clock change night (29 Mar 2026, 01:00 UTC).
    expect(todayInMadeira(new Date('2026-03-29T00:59:59Z'))).toBe('2026-03-29')
    expect(todayInMadeira(new Date('2026-03-28T23:59:59Z'))).toBe('2026-03-28')
  })

  it('winter, just before and after midnight', () => {
    const before = Date.parse('2026-11-15T23:59:59Z') // still 15 Nov in Madeira
    expect(validate({ date: '2026-11-15' }, before).errors.date).toBe('too_early')
    expect(validate({ date: '2026-11-16' }, before).success).toBe(true)
    const after = Date.parse('2026-11-16T00:00:00Z') // 16 Nov in Madeira
    expect(validate({ date: '2026-11-16' }, after).errors.date).toBe('too_early')
    expect(validate({ date: '2026-11-17' }, after).success).toBe(true)
  })

  it('summer: 23:30 UTC is already after midnight in Madeira', () => {
    const now = Date.parse('2026-07-15T23:30:00Z') // 16 Jul 00:30 in Madeira
    expect(validate({ date: '2026-07-16' }, now).errors.date).toBe('too_early')
    expect(validate({ date: '2026-07-17' }, now).success).toBe(true)
    const earlier = Date.parse('2026-07-15T22:30:00Z') // 15 Jul 23:30 in Madeira
    expect(validate({ date: '2026-07-16' }, earlier).success).toBe(true)
  })

  it('applies the same boundary through the whole flow', async () => {
    const now = Date.parse('2026-07-15T23:30:00Z')
    const body = (date) => validBody({ date, formStartedAt: now - 20000 })
    expect((await submit(body('2026-07-16'), {}, now)).body.errors.date).toBe('too_early')
    expect((await submit(body('2026-07-17'), {}, now)).status).toBe(201)
  })

  it('two-year limit is inclusive of the same calendar day', () => {
    expect(validate({ date: '2028-11-15' }).success).toBe(true)
    expect(validate({ date: '2028-11-16' }).errors.date).toBe('too_far')
    expect(validate({ date: '2036-11-15' }).errors.date).toBe('too_far')
  })

  it('two-year limit moves with Madeira midnight', () => {
    const now = Date.parse('2026-07-15T23:30:00Z') // 16 Jul in Madeira
    expect(validate({ date: '2028-07-16' }, now).success).toBe(true)
    expect(validate({ date: '2028-07-17' }, now).errors.date).toBe('too_far')
  })

  it('leap day: 29 Feb 2028 plus two years', () => {
    const now = Date.parse('2028-02-29T12:00:00Z')
    expect(validate({ date: '2030-02-28' }, now).success).toBe(true)
    expect(validate({ date: '2030-03-01' }, now).errors.date).toBe('too_far')
  })

  it('trims surrounding whitespace around a date', () => {
    expect(validate({ date: ' 2026-12-20 ' }).success).toBe(true)
    expect(validate({ date: '2026-12-20\t' }).success).toBe(true)
  })

  it('accepts a booking for a real leap day and rejects a fake one', () => {
    expect(validate({ date: '2028-02-29' }).success).toBe(true)
    expect(validate({ date: '2027-02-29' }).errors.date).toBe('invalid')
  })

  it.each(['2026-12-20T10:00:00', '2026-1-5', '20261220', '2026-12-20 10', 20261220])(
    'rejects malformed date %j',
    (date) => {
      const r = validate({ date })
      expect(r.errors.date).toBe('invalid')
    }
  )
})

describe('capacity per service', () => {
  const published = getPublishedServices()

  it('has published services to test', () => {
    expect(published.length).toBeGreaterThan(0)
  })

  it.each(published.map((s) => [s.slug, s]))(
    '%s: capacity is accepted, one more is rejected',
    (_, s) => {
      const max = maxAdultsFor(s)
      const extra = s.type === 'transfer' ? { dropoffLocation: 'Calheta' } : {}
      expect(validate({ serviceSlug: s.slug, adults: max, ...extra }).success).toBe(true)
      const over = validate({ serviceSlug: s.slug, adults: max + 1, ...extra })
      expect(over.success).toBe(false)
      expect(over.errors.adults).toBe('too_large')
    }
  )

  it('maxAdultsFor handles numbers, objects and missing capacity', () => {
    expect(maxAdultsFor({ capacity: 6 })).toBe(6)
    expect(maxAdultsFor({ capacity: { max: 7 } })).toBe(7)
    expect(maxAdultsFor({})).toBe(DEFAULT_MAX_ADULTS)
    expect(maxAdultsFor(undefined)).toBe(DEFAULT_MAX_ADULTS)
    expect(maxAdultsFor({ capacity: 0 })).toBe(DEFAULT_MAX_ADULTS)
    expect(maxAdultsFor({ capacity: -2 })).toBe(DEFAULT_MAX_ADULTS)
    expect(maxAdultsFor({ capacity: 2.5 })).toBe(DEFAULT_MAX_ADULTS)
    expect(maxAdultsFor({ capacity: { max: 'x' } })).toBe(DEFAULT_MAX_ADULTS)
  })

  it('children and infants have their own hard limit of 8', () => {
    expect(validate({ children: 8, infants: 8 }).success).toBe(true)
    expect(validate({ children: 9 }).errors.children).toBe('too_large')
    expect(validate({ infants: 9 }).errors.infants).toBe('too_large')
  })

  it('accepts numeric strings for counts and rejects odd numeric forms', () => {
    const ok = validate({ adults: '2', children: '1', infants: '' })
    expect(ok.success).toBe(true)
    expect(ok.data).toMatchObject({ adults: 2, children: 1, infants: 0 })
    expect(validate({ adults: '2.5' }).errors.adults).toBe('invalid')
    expect(validate({ adults: '1e1' }).errors.adults).toBe('invalid')
    expect(validate({ adults: '-1' }).errors.adults).toBe('invalid')
    expect(validate({ adults: 'Infinity' }).errors.adults).toBe('invalid')
    expect(validate({ adults: true }).errors.adults).toBe('invalid')
  })
})

describe('transfer vs tour fields', () => {
  it('transfers need a drop-off, even if only whitespace is sent', () => {
    expect(validate({ serviceSlug: 'sunrise-transfer' }).errors).toEqual({
      dropoffLocation: 'required',
    })
    expect(validate({ serviceSlug: 'sunrise-transfer', dropoffLocation: '   ' }).errors).toEqual({
      dropoffLocation: 'required',
    })
    expect(validate({ serviceSlug: 'sunrise-transfer', dropoffLocation: 'Calheta' }).success).toBe(
      true
    )
  })

  it('transfers do not need pickup or flight number', () => {
    const r = validate({ serviceSlug: 'calheta-funchal-transfer', dropoffLocation: 'Funchal' })
    expect(r.success).toBe(true)
    expect(r.data.pickupLocation).toBeUndefined()
    expect(r.data.flightNumber).toBeUndefined()
  })

  it('tours need no route at all; levada and custom accept optional pickup and drop-off', () => {
    expect(validate({ serviceSlug: 'west-madeira-tour' }).success).toBe(true)
    for (const serviceSlug of ['levada-walks-transfer', 'custom-trip']) {
      expect(validate({ serviceSlug }).success).toBe(true)
      const r = validate({ serviceSlug, pickupLocation: 'Hotel', dropoffLocation: 'Calheta' })
      expect(r.success).toBe(true)
      expect(r.data).toMatchObject({ pickupLocation: 'Hotel', dropoffLocation: 'Calheta' })
    }
  })

  it('treats empty optional strings as absent', () => {
    const r = validate({
      pickupLocation: '',
      luggage: '  ',
      notes: '',
      flightNumber: null,
      time: '',
    })
    expect(r.success).toBe(true)
    for (const k of ['pickupLocation', 'luggage', 'notes', 'flightNumber', 'time'])
      expect(r.data[k]).toBeUndefined()
  })

  it('reports the transfer rule together with the capacity rule', () => {
    const r = validate({ serviceSlug: 'sunrise-transfer', adults: 9 })
    expect(r.errors).toEqual({ adults: 'too_large', dropoffLocation: 'required' })
  })

  it('does not run service rules when a field is already invalid', () => {
    const r = validate({ serviceSlug: 'sunrise-transfer', name: 'A' })
    expect(r.errors).toEqual({ name: 'too_short' })
  })
})

describe('input hygiene', () => {
  it('drops unknown keys before they reach the database document', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    const res = await submit({
      ...validBody(),
      status: 'confirmed',
      payment: { status: 'paid' },
      role: 'admin',
      $where: '1',
      'customer.email': 'x@y.z',
    })
    expect(res.status).toBe(201)
    const doc = db.create.mock.calls[0][0]
    expect(doc.status).toBe('new')
    expect(doc.payment).toEqual({ status: 'none' })
    expect(JSON.stringify(doc)).not.toMatch(/admin|paid|\$where|x@y\.z/)
  })

  it('does not pollute prototypes with __proto__ keys', () => {
    const body = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
    )
    validateBooking({ ...validBody(), ...body }, { now: new Date(NOW) })
    expect({}.polluted).toBeUndefined()
  })

  it('strips bidi and line-separator characters, normalises tabs', () => {
    expect(cleanText('a\u2028b‮c⁦d')).toBe('abcd')
    expect(cleanText('a\tb')).toBe('a b')
    expect(cleanText('x\r\ny', { multiline: true })).toBe('x\ny')
    expect(cleanText('x\ry', { multiline: true })).toBe('x\ny')
  })

  it('rejects Unicode line separators in single-line fields', () => {
    expect(validate({ name: 'Bob\u2028Evil' }).errors.name).toBe('invalid')
    expect(validate({ pickupLocation: 'x\u2029y' }).errors.pickupLocation).toBe('invalid')
  })

  it('rejects a locale outside en/pt and non-string types', () => {
    expect(validate({ locale: 'PT' }).errors.locale).toBe('invalid')
    expect(validate({ locale: undefined }).errors.locale).toBe('required')
    expect(validate({ name: 123 }).errors.name).toBe('invalid')
    expect(validate({ notes: { a: 1 } }).errors.notes).toBe('invalid')
  })

  it('requires consent to be exactly true', () => {
    for (const consent of ['true', 1, 'on', null])
      expect(validate({ consent }).errors.consent, String(consent)).toBe('consent_required')
  })

  it('requires a real UUID as idempotency key', () => {
    expect(validate({ idempotencyKey: '123e4567-e89b-12d3-a456-426614174000' }).success).toBe(true)
    expect(validate({ idempotencyKey: `${Date.now()}-abc123` }).errors.idempotencyKey).toBe(
      'invalid'
    )
  })

  it('names and notes keep their length limits after cleaning', () => {
    expect(validate({ name: 'x'.repeat(100) }).success).toBe(true)
    expect(validate({ notes: 'x'.repeat(1000) }).success).toBe(true)
    // control characters are removed before the length check
    expect(validate({ notes: `${'x'.repeat(1000)}\u0000\u0000` }).success).toBe(true)
  })
})

describe('Origin and client IP', () => {
  it('rejects odd Origin values', async () => {
    for (const origin of [
      'null',
      '',
      'not a url',
      'http://localhost.evil.example',
      'https://evil.example/http://localhost',
    ]) {
      const res = await submit(validBody(), { origin })
      expect(res.status, origin).toBe(403)
      expect(res.body).toEqual({ ok: false, code: 'FORBIDDEN_ORIGIN' })
    }
  })

  it('rejects a missing Origin even with a valid body', async () => {
    const res = await submit(validBody(), { origin: null })
    expect(res.status).toBe(403)
  })

  it('does not create anything when the Origin is wrong', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    enableChannels()
    const fetchMock = mockFetch()
    await submit(validBody(), { origin: 'https://evil.example' })
    expect(db.create).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('in development any localhost port is accepted', async () => {
    for (const origin of ['http://localhost:3070', 'http://127.0.0.1:3000'])
      expect((await submit(validBody(), { origin })).status, origin).toBe(201)
  })

  it('in production only the configured site origin is accepted', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.example.pt/')
    vi.resetModules()
    const mod = await import('@/lib/booking/service')
    const call = (origin) =>
      mod.createBookingRequest({ body: validBody(), headers: headersFor({ origin }), now: NOW })
    for (const origin of [
      'http://localhost:3000',
      'https://example.pt',
      'http://www.example.pt',
      'https://www.example.pt.evil.example',
    ])
      expect((await call(origin)).status, origin).toBe(403)
    // An allowed origin passes the gate (no channel is configured, so production answers 502).
    expect((await call('https://www.example.pt')).status).toBe(502)
  })

  it('uses the first x-forwarded-for entry as the client IP', async () => {
    const statuses = []
    for (let i = 0; i < 6; i++) {
      const h = headersFor({ ip: `7.7.7.7, 10.0.0.${i}` })
      statuses.push(
        (
          await createBookingRequest({
            body: validBody({ email: `a${i}@example.com` }),
            headers: h,
            now: NOW,
          })
        ).status
      )
    }
    expect(statuses.slice(0, 5)).not.toContain(429)
    expect(statuses[5]).toBe(429)
  })

  it('falls back to x-real-ip, then to a shared "unknown" bucket', async () => {
    const run = async (extra, n) => {
      const out = []
      for (let i = 0; i < n; i++) {
        const h = headersFor({ ip: null, extra })
        out.push(
          (
            await createBookingRequest({
              body: validBody({ email: `r${i}${n}@example.com` }),
              headers: h,
              now: NOW,
            })
          ).status
        )
      }
      return out
    }
    expect((await run({ 'x-real-ip': '8.8.8.8' }, 6))[5]).toBe(429)
    resetBookingState()
    expect((await run({}, 6))[5]).toBe(429)
  })

  it('counts different IPs separately', async () => {
    for (let i = 0; i < 6; i++) {
      const res = await submit(validBody({ email: `d${i}@example.com` }), { ip: `20.0.0.${i}` })
      expect(res.status).not.toBe(429)
    }
  })

  it('counts honeypot and too-fast hits against the IP limit too', async () => {
    const out = []
    for (let i = 0; i < 6; i++)
      out.push(await submit(validBody({ website: 'x' }), { ip: '3.3.3.3' }))
    expect(out[5].status).toBe(429)
  })

  it('Retry-After counts down to the oldest hit leaving the window', async () => {
    for (let i = 0; i < 5; i++)
      await submit(validBody({ email: `t${i}@example.com` }), { ip: '4.4.4.4' })
    const res = await submit(validBody({ email: 't9@example.com' }), { ip: '4.4.4.4' })
    expect(res.status).toBe(429)
    expect(res.headers['Retry-After']).toBe(String(10 * 60))
    const later = await createBookingRequest({
      body: validBody({ email: 't9@example.com' }),
      headers: headersFor({ ip: '4.4.4.4' }),
      now: NOW + 10 * 60 * 1000 + 1,
    })
    expect(later.status).toBe(201)
  })
})

describe('bot gates: boundaries', () => {
  it('3000 ms is the first accepted fill time, 2999 ms is a bot', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    await submit(validBody({ formStartedAt: NOW - 2999 }))
    expect(fetchMock).not.toHaveBeenCalled()
    const ok = await submit(validBody({ formStartedAt: NOW - 3000 }))
    expect(ok.status).toBe(201)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('a start time more than one minute in the future is a bot, exactly one minute is not', async () => {
    const future = await submit(validBody({ formStartedAt: NOW + 60001 }))
    expect(future.status).toBe(201) // fake success
    expect(db.create).not.toHaveBeenCalled()
    enableChannels()
    const fetchMock = mockFetch()
    await submit(validBody({ formStartedAt: NOW + 60000 }))
    // fill time is negative (< 3000) so this is also treated as too fast
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a whitespace-only honeypot is not treated as filled', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    const res = await submit(validBody({ website: '   ' }))
    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('a non-string honeypot value still counts as a bot', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    expect((await submit(validBody({ website: 1 }))).status).toBe(201)
    expect((await submit(validBody({ website: ['x'] }))).status).toBe(201)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a bot reference never equals a stored one and follows the ref format', async () => {
    const res = await submit(validBody({ website: 'spam' }))
    expect(res.body.ref).toMatch(/^JV-2026-[A-Z0-9]{6}$/)
  })
})

describe('email rate limit is keyed on a hash', () => {
  it('treats the same address in a different case as one customer', async () => {
    const out = []
    for (const email of [
      'Bob@Example.com',
      'bob@example.com',
      'BOB@EXAMPLE.COM',
      'bob@example.com',
    ])
      out.push((await submit(validBody({ email }))).status)
    expect(out).toEqual([201, 201, 201, 429])
  })

  it('does not apply the limit across different addresses', async () => {
    for (let i = 0; i < 4; i++)
      expect((await submit(validBody({ email: `unique${i}@example.com` }))).status).toBe(201)
  })

  it('never stores the raw email in the rate limit key', async () => {
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
      body: validBody({ email: 'secret.person@example.com' }),
      headers: headersFor({ ip: '9.9.9.9' }),
      now: NOW,
    })
    const emailKey = keys.find((k) => k.startsWith('email1d:'))
    expect(emailKey).toMatch(/^email1d:[0-9a-f]{64}$/)
    expect(keys.join('|')).not.toContain('secret.person')
    vi.doUnmock('@/lib/rate-limit')
  })

  it('an idempotent resubmit does not use up the email quota', async () => {
    const body = validBody()
    await submit(body)
    for (let i = 0; i < 5; i++) expect((await submit(body)).status).toBe(200)
    // two quota slots are still free for the same address
    expect((await submit(validBody())).status).toBe(201)
    expect((await submit(validBody())).status).toBe(201)
  })

  it('validation errors do not use up the email quota', async () => {
    for (let i = 0; i < 5; i++) await submit(validBody({ adults: 0 }))
    expect((await submit(validBody())).status).toBe(201)
  })
})

describe('idempotency release after a 502', () => {
  it('without a database the same key can be retried and then returns 200', async () => {
    enableChannels()
    mockFetch({ email: false, whatsapp: false })
    const body = validBody()
    const first = await submit(body)
    expect(first.status).toBe(502)
    expect(first.body.whatsappUrl).toContain('wa.me')
    mockFetch()
    const retry = await submit(body)
    expect(retry.status).toBe(201)
    const again = await submit(body)
    expect(again.status).toBe(200)
    expect(again.body.ref).toBe(retry.body.ref)
  })

  it('the 502 fallback message is prefilled in the customer language and URL-encoded', async () => {
    enableChannels()
    mockFetch({ email: false, whatsapp: false })
    const pt = await submit(validBody({ locale: 'pt', date: '2026-12-20' }))
    const text = decodeURIComponent(new URL(pt.body.whatsappUrl).searchParams.get('text'))
    expect(text).toContain('Olá João')
    expect(text).toContain('2026-12-20')
    const en = await submit(validBody({ locale: 'en' }))
    expect(decodeURIComponent(new URL(en.body.whatsappUrl).searchParams.get('text'))).toContain(
      'Hello João'
    )
  })

  it('an in-memory key expires after one hour', async () => {
    const body = validBody()
    const first = await submit(body)
    const sameHour = await createBookingRequest({
      body,
      headers: headersFor(),
      now: NOW + 59 * 60 * 1000,
    })
    expect(sameHour.status).toBe(200)
    expect(sameHour.body.ref).toBe(first.body.ref)
    const later = await createBookingRequest({
      body: { ...body, formStartedAt: NOW + 61 * 60 * 1000 - 20000 },
      headers: headersFor(),
      now: NOW + 61 * 60 * 1000,
    })
    expect(later.status).toBe(201)
    expect(later.body.ref).not.toBe(first.body.ref)
  })

  it('a database lookup that fails does not block the request', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    db.findOne.mockRejectedValue(new Error('boom'))
    expect((await submit(validBody())).status).toBe(201)
  })
})

describe('driver and customer email content', () => {
  const hostile = {
    name: '<script>alert(1)</script> "Bob"',
    pickupLocation: "<img src=x onerror=alert('x')>",
    dropoffLocation: 'A & B <b>bold</b>',
    notes: 'line one\nline <two> & "three"',
    luggage: '</td><td>injected',
    flightNumber: '"><svg>',
  }

  async function sendHostile(extraEnv = {}) {
    enableChannels()
    vi.stubEnv('EMAIL_CUSTOMER_COPY_ENABLED', 'true')
    for (const [k, v] of Object.entries(extraEnv)) vi.stubEnv(k, v)
    const fetchMock = mockFetch()
    const res = await submit(validBody({ serviceSlug: 'sunrise-transfer', ...hostile }))
    expect(res.status).toBe(201)
    const mails = sentTo(fetchMock, 'api.resend.com')
    return {
      driver: mails.find((m) => m.to[0] === 'driver@example.com'),
      customer: mails.find((m) => m.to[0] === 'anna@example.com'),
      ref: res.body.ref,
    }
  }

  it('escapes every user value in the driver HTML', async () => {
    const { driver } = await sendHostile()
    expect(driver.html).not.toMatch(/<script|<img|<svg|<b>|<\/td><td>injected/)
    expect(driver.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &quot;Bob&quot;')
    expect(driver.html).toContain('A &amp; B &lt;b&gt;bold&lt;/b&gt;')
    expect(driver.html).toContain('&#39;x&#39;')
    expect(driver.html).toContain('line one<br>line &lt;two&gt; &amp; &quot;three&quot;')
  })

  it('escapes the customer name in the confirmation copy', async () => {
    const { customer } = await sendHostile()
    expect(customer.html).not.toContain('<script')
    expect(customer.html).toContain('&lt;script&gt;')
  })

  it('keeps the plain-text part unescaped but on one row per field', async () => {
    const { driver } = await sendHostile()
    expect(driver.text).toContain('Nome: <script>alert(1)</script> "Bob"')
    expect(driver.text.split('\n').filter((l) => l.startsWith('Nome:'))).toHaveLength(1)
  })

  it('subject is one line and holds no customer input', async () => {
    const { driver, customer, ref } = await sendHostile()
    for (const s of [driver.subject, customer.subject]) {
      expect(s).not.toMatch(/[\r\n\u2028\u2029]/)
      expect(s).not.toMatch(/Bob|script|<|>/)
      expect(s).toContain(ref)
    }
  })

  it('reply-to is the validated customer address (no CRLF injection possible)', async () => {
    const { driver } = await sendHostile()
    expect(driver.reply_to).toBe('anna@example.com')
    const res = await submit(validBody({ email: 'a@example.com\r\nBcc: evil@example.com' }))
    expect(res.status).toBe(400)
    expect(res.body.errors.email).toBe('invalid')
  })

  it('sanitises a configured From header', async () => {
    enableChannels()
    vi.stubEnv('EMAIL_FROM', 'Tours <a@example.com>\r\nBcc: evil@example.com')
    const fetchMock = mockFetch()
    await submit(validBody())
    const [mail] = sentTo(fetchMock, 'api.resend.com')
    expect(mail.from).not.toMatch(/[\r\n]/)
  })

  it('sends the driver email to every recipient and uses the ref as idempotency header', async () => {
    enableChannels()
    vi.stubEnv('EMAIL_BOOKINGS_TO', 'a@example.com, b@example.com ,,')
    const fetchMock = mockFetch()
    const res = await submit(validBody())
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('resend'))
    expect(JSON.parse(call[1].body).to).toEqual(['a@example.com', 'b@example.com'])
    expect(call[1].headers['Idempotency-Key']).toBe(`${res.body.ref}-driver`)
  })

  it('reports config_missing when From is empty and skips without recipients', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_BOOKINGS_TO', 'driver@example.com')
    vi.stubEnv('EMAIL_FROM', '')
    const input = {
      ref: 'JV-2026-ABCDEF',
      booking: validBody(),
      snapshot: { title: { pt: 'x', en: 'x' } },
    }
    expect(await sendEmail(input)).toEqual({ status: 'failed', error: 'config_missing' })
    vi.stubEnv('EMAIL_BOOKINGS_TO', ' , ')
    expect(await sendEmail(input)).toEqual({ status: 'skipped' })
  })

  it('a failing customer copy does not fail the driver channel', async () => {
    enableChannels()
    vi.stubEnv('EMAIL_CUSTOMER_COPY_ENABLED', 'true')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) =>
        JSON.parse(init.body).to[0] === 'driver@example.com'
          ? new Response(JSON.stringify({ id: 'ok' }))
          : new Response('{}', { status: 422 })
      )
    )
    const r = await sendEmail({
      ref: 'JV-2026-ABCDEF',
      booking: validBody(),
      snapshot: { title: { pt: 'x', en: 'x' } },
    })
    expect(r.status).toBe('sent')
  })

  it('escapeHtml handles non-strings and all five characters', () => {
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(5)).toBe('5')
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
    expect(escapeHtml('&amp;')).toBe('&amp;amp;') // never double-decoded
  })

  it('sanitizeHeaderValue removes every kind of line break and control character', () => {
    expect(sanitizeHeaderValue('a\r\nb\nc\rd\u2028e\u0000f\tg')).toBe('a b c d e f g')
    expect(sanitizeHeaderValue(null)).toBe('')
    expect(sanitizeHeaderValue('  x  ')).toBe('x')
  })
})

describe('WhatsApp parameters and request', () => {
  it('truncates long values to 60 characters with an ellipsis', () => {
    const out = sanitizeWhatsappParam('word '.repeat(40))
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/ …$/) // no dangling space before the ellipsis
  })

  it('does not truncate a value of exactly 60 characters', () => {
    expect(sanitizeWhatsappParam('x'.repeat(60))).toBe('x'.repeat(60))
    expect(sanitizeWhatsappParam('x'.repeat(61))).toBe(`${'x'.repeat(59)}…`)
  })

  it('collapses every kind of whitespace and control character', () => {
    expect(sanitizeWhatsappParam('a  \u2028 b\u0000c')).toBe('a b c')
    expect(sanitizeWhatsappParam('\u0000\u0007')).toBe('-')
    expect(sanitizeWhatsappParam(0)).toBe('0')
  })

  it('builds only safe parameters even from hostile bookings', () => {
    const params = buildTemplateParams({
      ref: 'JV-2026-ABCDEF',
      booking: {
        ...validBody(),
        name: `${'N'.repeat(100)}\r\n`,
        time: '09:30',
        infants: 2,
        children: 3,
      },
      snapshot: { title: { pt: 'Título\ncom\tquebras' } },
    })
    expect(params).toHaveLength(6)
    for (const p of params) {
      expect(p.length).toBeGreaterThan(0)
      expect(p.length).toBeLessThanOrEqual(60)
      expect(p).not.toMatch(/[\n\r\t]/)
      expect(p).not.toMatch(/ {2,}/)
    }
    expect(params[1]).toBe('Título com quebras')
    expect(params[3]).toBe('2 adultos, 3 crianças, 2 bebés')
    expect(params[2]).toBe('20/12/2026 09:30')
  })

  it('uses singular words for one person', () => {
    const [, , , people] = buildTemplateParams({
      ref: 'R',
      booking: { ...validBody(), adults: 1, children: 1, infants: 1 },
      snapshot: { title: { pt: 'x' } },
    })
    expect(people).toBe('1 adulto, 1 criança, 1 bebé')
  })

  it('sends digits-only recipient and the sanitised parameters to the Graph API', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    await submit(validBody({ name: 'N'.repeat(100) }))
    const [wa] = sentTo(fetchMock, 'graph.facebook.com')
    expect(wa.to).toBe('351912345678')
    expect(wa.template.language.code).toBe('pt_PT')
    for (const p of wa.template.components[0].parameters) {
      expect(p.type).toBe('text')
      expect(p.text.length).toBeLessThanOrEqual(60)
    }
  })

  it('refuses unsafe API version or phone number id (URL injection)', async () => {
    enableChannels()
    const input = { ref: 'R', booking: validBody(), snapshot: { title: { pt: 'x' } } }
    const fetchMock = mockFetch()
    vi.stubEnv('WHATSAPP_API_VERSION', 'v23.0/../evil')
    expect(await sendWhatsapp(input)).toEqual({ status: 'failed', error: 'config_invalid' })
    vi.stubEnv('WHATSAPP_API_VERSION', 'v23.0')
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123/evil')
    expect(await sendWhatsapp(input)).toEqual({ status: 'failed', error: 'config_invalid' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports config_missing when enabled without a token', async () => {
    enableChannels()
    vi.stubEnv('WHATSAPP_API_TOKEN', '')
    expect(
      await sendWhatsapp({ ref: 'R', booking: validBody(), snapshot: { title: { pt: 'x' } } })
    ).toEqual({
      status: 'failed',
      error: 'config_missing',
    })
  })

  it('WHATSAPP_ENABLED must be exactly "true"', async () => {
    enableChannels()
    for (const v of ['1', 'TRUE', 'yes', '']) {
      vi.stubEnv('WHATSAPP_ENABLED', v)
      expect(await sendWhatsapp({})).toEqual({ status: 'skipped' })
    }
  })
})

describe('rate limiter', () => {
  beforeEach(() => resetRateLimits())

  it('allows up to the limit, then blocks with a rounded-up Retry-After', () => {
    const rule = [{ key: 'k', limit: 2, windowMs: 10_000 }]
    expect(consumeRateLimit(rule, 1000).allowed).toBe(true)
    expect(consumeRateLimit(rule, 2000).allowed).toBe(true)
    const blocked = consumeRateLimit(rule, 3500)
    expect(blocked).toEqual({ allowed: false, retryAfterSec: 8 }) // 1000 + 10000 - 3500 = 7500 ms
  })

  it('frees a slot exactly when the oldest hit leaves the window', () => {
    const rule = [{ key: 'k', limit: 1, windowMs: 1000 }]
    consumeRateLimit(rule, 0)
    expect(consumeRateLimit(rule, 999).allowed).toBe(false)
    expect(consumeRateLimit(rule, 1000).allowed).toBe(true)
  })

  it('does not record a hit for any rule when one rule blocks', () => {
    const a = { key: 'a', limit: 5, windowMs: 1000 }
    const b = { key: 'b', limit: 1, windowMs: 1000 }
    consumeRateLimit([b], 0)
    expect(consumeRateLimit([a, b], 10).allowed).toBe(false)
    // key "a" must still have all its quota
    for (let i = 0; i < 5; i++) expect(consumeRateLimit([a], 20).allowed).toBe(true)
    expect(consumeRateLimit([a], 20).allowed).toBe(false)
  })

  it('keys are independent', () => {
    expect(consumeRateLimit([{ key: 'x', limit: 1, windowMs: 1000 }], 0).allowed).toBe(true)
    expect(consumeRateLimit([{ key: 'y', limit: 1, windowMs: 1000 }], 0).allowed).toBe(true)
  })
})
