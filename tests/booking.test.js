import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// No real database: both modules are mocked.
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
import { ERROR_CODES, normalisePhone, validateBooking } from '@/lib/booking/schema'
import { REF_PATTERN, generateRef } from '@/lib/booking/ref'
import { escapeHtml, sanitizeHeaderValue } from '@/lib/email'
import { buildTemplateParams, sanitizeWhatsappParam } from '@/lib/whatsapp'

const NOW = Date.parse('2026-11-15T12:00:00Z')
let ipCounter = 0

function validBody(overrides = {}) {
  return {
    serviceSlug: 'west-madeira-tour',
    date: '2026-12-20',
    time: '09:30',
    adults: 2,
    children: 1,
    infants: 0,
    pickupLocation: 'Hotel Calheta Beach',
    notes: 'We love views',
    name: 'Anna Schmidt',
    email: 'Anna@Example.com',
    phone: '+49 151 2345 6789',
    locale: 'en',
    consent: true,
    idempotencyKey: randomUUID(),
    website: '',
    formStartedAt: NOW - 20000,
    ...overrides,
  }
}

function submit(body, { ip, origin = 'http://localhost:3000' } = {}) {
  const headers = new Headers({
    origin,
    'x-forwarded-for': ip ?? `10.0.0.${++ipCounter}`,
    'user-agent': 'vitest',
  })
  return createBookingRequest({ body, headers, now: NOW })
}

function mockFetch({ email = true, whatsapp = true } = {}) {
  const fn = vi.fn(async (url) => {
    const isEmail = String(url).startsWith('https://api.resend.com')
    const ok = isEmail ? email : whatsapp
    if (!ok) return new Response('{}', { status: 500 })
    return new Response(JSON.stringify(isEmail ? { id: 'em_1' } : { messages: [{ id: 'wa_1' }] }), {
      status: 200,
    })
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
  vi.stubEnv('WHATSAPP_TEMPLATE_LANG', 'pt_PT')
}

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
})

describe('booking request: happy path', () => {
  it('stores, emails and notifies, then returns 201 with a ref', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    vi.stubEnv('EMAIL_CUSTOMER_COPY_ENABLED', 'true')
    const fetchMock = mockFetch()

    const res = await submit(validBody())

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.ref).toMatch(REF_PATTERN)

    const doc = db.create.mock.calls[0][0]
    expect(doc.ref).toBe(res.body.ref)
    expect(doc.status).toBe('new')
    expect(doc.customer).toEqual({
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      phone: '+4915123456789',
    })
    expect(doc.serviceSnapshot.title).toEqual(expect.any(Object))
    expect(Object.isFrozen(doc.serviceSnapshot)).toBe(true)
    expect(doc.payment.status).toBe('none')
    expect(doc.meta.ipHash).toBeUndefined() // no IP_HASH_SALT in this test

    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls.filter((u) => u === 'https://api.resend.com/emails')).toHaveLength(2) // driver + customer copy
    expect(urls).toContain('https://graph.facebook.com/v23.0/123456789/messages')

    const driverMail = JSON.parse(
      fetchMock.mock.calls.find((c) => JSON.parse(c[1].body).to[0] === 'driver@example.com')[1].body
    )
    expect(driverMail.reply_to).toBe('anna@example.com')
    expect(driverMail.subject).toContain(res.body.ref)
    expect(driverMail.html).not.toContain('<script')

    const update = db.updateOne.mock.calls[0]
    expect(update[1].$set['delivery.email'].status).toBe('sent')
    expect(update[1].$set['delivery.whatsapp'].status).toBe('sent')
  })

  it('works for a transfer with a drop-off', async () => {
    enableChannels()
    mockFetch()
    const res = await submit(
      validBody({
        serviceSlug: 'funchal-airport-transfer',
        dropoffLocation: 'Calheta',
        flightNumber: 'FR1234',
      })
    )
    expect(res.status).toBe(201)
  })
})

describe('booking request: validation', () => {
  const fieldCases = [
    ['serviceSlug', { serviceSlug: undefined }, 'required'],
    ['serviceSlug', { serviceSlug: 'nope' }, 'unknown_service'],
    ['date', { date: undefined }, 'required'],
    ['date', { date: '20/12/2026' }, 'invalid'],
    ['date', { date: '2026-02-31' }, 'invalid'],
    ['date', { date: '2026-11-15' }, 'too_early'], // today
    ['date', { date: '2020-01-01' }, 'too_early'],
    ['date', { date: '2029-01-01' }, 'too_far'],
    ['time', { time: '25:00' }, 'invalid'],
    ['adults', { adults: undefined }, 'required'],
    ['adults', { adults: 0 }, 'too_small'],
    ['adults', { adults: 1.5 }, 'invalid'],
    ['adults', { adults: 7 }, 'too_large'], // capacity is 6
    ['children', { children: -1 }, 'too_small'],
    ['infants', { infants: 'x' }, 'invalid'],
    ['pickupLocation', { pickupLocation: 'x'.repeat(201) }, 'too_long'],
    ['flightNumber', { flightNumber: 'ABCDEFGHIJK' }, 'too_long'],
    ['luggage', { luggage: 'x'.repeat(101) }, 'too_long'],
    ['notes', { notes: 'x'.repeat(1001) }, 'too_long'],
    ['name', { name: undefined }, 'required'],
    ['name', { name: '  ' }, 'required'],
    ['name', { name: 'A' }, 'too_short'],
    ['name', { name: 'A'.repeat(101) }, 'too_long'],
    ['email', { email: undefined }, 'required'],
    ['email', { email: 'not-an-email' }, 'invalid'],
    ['email', { email: `${'a'.repeat(250)}@example.com` }, 'too_long'],
    ['phone', { phone: undefined }, 'required'],
    ['phone', { phone: 'abc' }, 'invalid'],
    ['phone', { phone: '12345' }, 'invalid'],
    ['locale', { locale: 'de' }, 'invalid'],
    ['consent', { consent: false }, 'consent_required'],
    ['consent', { consent: undefined }, 'consent_required'],
    ['idempotencyKey', { idempotencyKey: 'abc' }, 'invalid'],
    ['idempotencyKey', { idempotencyKey: undefined }, 'required'],
    ['formStartedAt', { formStartedAt: undefined }, 'required'],
  ]

  it.each(fieldCases)('%s %j gives %s', async (field, override, code) => {
    const res = await submit(validBody(override))
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.errors[field]).toBe(code)
    expect(ERROR_CODES).toContain(code)
  })

  it('only ever returns known codes', async () => {
    const res = await submit({
      serviceSlug: 5,
      date: {},
      adults: [],
      name: null,
      formStartedAt: NOW - 9999,
    })
    expect(res.status).toBe(400)
    for (const code of Object.values(res.body.errors)) expect(ERROR_CODES).toContain(code)
  })

  it('requires a drop-off for transfers', async () => {
    const res = await submit(validBody({ serviceSlug: 'funchal-airport-transfer' }))
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual({ dropoffLocation: 'required' })
  })

  it('accepts tomorrow (Madeira time) and 00-prefixed phones', () => {
    const r = validateBooking(validBody({ date: '2026-11-16', phone: '00351 966 167 435' }), {
      now: new Date(NOW),
    })
    expect(r.success).toBe(true)
    expect(r.data.phone).toBe('+351966167435')
  })

  it('normalises phones', () => {
    expect(normalisePhone('+351 966-167-435')).toBe('+351966167435')
    expect(normalisePhone('966167435')).toBe('')
    expect(normalisePhone('+0123456789')).toBe('')
  })

  it('rejects non-object bodies', async () => {
    expect((await submit(null)).status).toBe(400)
    expect((await submit([1])).status).toBe(400)
  })

  it('rejects CR/LF in header-bound fields', async () => {
    for (const field of ['name', 'email', 'phone', 'pickupLocation', 'flightNumber', 'luggage']) {
      const res = await submit(validBody({ [field]: 'Bob\r\nBcc: evil@example.com' }))
      expect(res.status, field).toBe(400)
      expect(res.body.errors[field], field).toBe('invalid')
    }
  })

  it('strips control characters and keeps newlines only in notes', () => {
    const r = validBody({ name: 'Ann\u0000a‮ Lee', notes: 'a\r\nb\u0007c' })
    const out = validateBooking(r, { now: new Date(NOW) })
    expect(out.success).toBe(true)
    expect(out.data.name).toBe('Anna Lee')
    expect(out.data.notes).toBe('a\nbc')
  })

  it('drops unknown keys', () => {
    const out = validateBooking(
      { ...validBody(), $where: 'x', role: 'admin' },
      { now: new Date(NOW) }
    )
    expect(out.success).toBe(true)
    expect(out.data).not.toHaveProperty('$where')
    expect(out.data).not.toHaveProperty('role')
  })
})

describe('booking request: security gates', () => {
  it('rejects a foreign Origin with 403', async () => {
    const res = await submit(validBody(), { origin: 'https://evil.example' })
    expect(res.status).toBe(403)
  })

  it('rejects a missing Origin with 403', async () => {
    const headers = new Headers({ 'x-forwarded-for': '9.9.9.9' })
    const res = await createBookingRequest({ body: validBody(), headers, now: NOW })
    expect(res.status).toBe(403)
  })

  it('answers honeypot hits with a fake 201 and does nothing', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    const fetchMock = mockFetch()
    const res = await submit(validBody({ bot_trap_field: 'http://spam.example' }))
    expect(res.status).toBe(201)
    expect(res.body.ref).toMatch(/^JV-\d{4}-[A-Z0-9]{6}$/)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(db.create).not.toHaveBeenCalled()
  })

  it('processes too-fast submissions normally and flags them as suspect', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    const fetchMock = mockFetch()
    const res = await submit(validBody({ formStartedAt: NOW - 1000 }))
    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalled()
    expect(db.create.mock.calls[0][0].meta.suspect).toBe(true)
  })

  it('rate limits per IP with 429 and Retry-After', async () => {
    const results = []
    for (let i = 0; i < 6; i++)
      results.push(await submit(validBody({ email: `p${i}@example.com` }), { ip: '5.5.5.5' }))
    expect(results.slice(0, 5).every((r) => r.status !== 429)).toBe(true)
    expect(results[5].status).toBe(429)
    expect(Number(results[5].headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('rate limits per email (3 per day)', async () => {
    const statuses = []
    for (let i = 0; i < 4; i++) statuses.push((await submit(validBody())).status)
    expect(statuses.slice(0, 3).every((s) => s === 201)).toBe(true)
    expect(statuses[3]).toBe(429)
  })
})

describe('booking request: idempotency', () => {
  it('returns 200 with the same ref and sends nothing twice', async () => {
    enableChannels()
    const fetchMock = mockFetch()
    const body = validBody()
    const first = await submit(body)
    const calls = fetchMock.mock.calls.length
    const second = await submit(body)
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.body.ref).toBe(first.body.ref)
    expect(fetchMock.mock.calls.length).toBe(calls)
  })

  it('finds a previous request in the database (other instance)', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    db.findOne.mockResolvedValue({ ref: 'JV-2026-ABCDEF' })
    const res = await submit(validBody())
    expect(res.status).toBe(200)
    expect(res.body.ref).toBe('JV-2026-ABCDEF')
    expect(db.create).not.toHaveBeenCalled()
  })
})

describe('booking request: delivery outcomes', () => {
  it('email fails, WhatsApp ok: 201', async () => {
    enableChannels()
    mockFetch({ email: false })
    expect((await submit(validBody())).status).toBe(201)
  })

  it('WhatsApp fails, email ok: 201', async () => {
    enableChannels()
    mockFetch({ whatsapp: false })
    expect((await submit(validBody())).status).toBe(201)
  })

  it('both fail and no DB: 502 with a WhatsApp fallback link', async () => {
    enableChannels()
    mockFetch({ email: false, whatsapp: false })
    const res = await submit(validBody())
    expect(res.status).toBe(502)
    expect(res.body).toMatchObject({ ok: false, code: 'DELIVERY_FAILED' })
    expect(res.body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\d+\?text=/)
  })

  it('both fail but the DB saved it: 201', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    mockFetch({ email: false, whatsapp: false })
    expect((await submit(validBody())).status).toBe(201)
    expect(db.updateOne.mock.calls[0][1].$set['delivery.email'].status).toBe('failed')
  })

  it('DB down but a channel works: 201', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    db.connectDb.mockRejectedValue(new Error('down'))
    mockFetch({ email: false })
    expect((await submit(validBody())).status).toBe(201)
  })

  it('DB down and both channels failing: 502, and the key can be retried', async () => {
    enableChannels()
    vi.stubEnv('MONGODB_URI', 'mongodb://mock')
    db.connectDb.mockRejectedValue(new Error('down'))
    mockFetch({ email: false, whatsapp: false })
    const body = validBody()
    expect((await submit(body)).status).toBe(502)
    mockFetch()
    expect((await submit(body)).status).toBe(201)
  })

  it('a thrown network error counts as a failed channel', async () => {
    enableChannels()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'TimeoutError' }))
    )
    expect((await submit(validBody())).status).toBe(502)
  })

  it('channels not configured: dev fallback gives 201, production gives 502', async () => {
    expect((await submit(validBody())).status).toBe(201)
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const res = await submit(validBody())
    expect(res.status).toBe(502)
  })

  it('does not log personal data', async () => {
    enableChannels()
    mockFetch({ email: false })
    await submit(validBody())
    const logged = JSON.stringify([...console.info.mock.calls, ...console.error.mock.calls])
    expect(logged).not.toMatch(/anna|schmidt|example\.com|4915123/i)
  })
})

describe('email helpers', () => {
  it('sanitises header values', () => {
    expect(sanitizeHeaderValue('Hi\r\nBcc: x@y.z')).toBe('Hi Bcc: x@y.z')
    expect(sanitizeHeaderValue('a'.repeat(500)).length).toBe(150)
  })

  it('escapes HTML', () => {
    expect(escapeHtml('<img src=x onerror="a()">&')).toBe(
      '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;'
    )
  })

  it('skips when Resend is not configured', async () => {
    const { sendEmail } = await import('@/lib/email')
    const r = await sendEmail({
      ref: 'JV-2026-ABCDEF',
      booking: validBody(),
      snapshot: { title: { pt: 'x' } },
    })
    expect(r).toEqual({ status: 'skipped' })
  })
})

describe('whatsapp helpers', () => {
  it('replaces newlines and tabs, limits length, never returns empty', () => {
    expect(sanitizeWhatsappParam('a\nb\t\tc\r\nd')).toBe('a b c d')
    expect(sanitizeWhatsappParam('x'.repeat(200)).length).toBeLessThanOrEqual(60)
    expect(sanitizeWhatsappParam('  \n ')).toBe('-')
    expect(sanitizeWhatsappParam(undefined)).toBe('-')
  })

  it('builds six safe parameters', () => {
    const params = buildTemplateParams({
      ref: 'JV-2026-ABCDEF',
      booking: { ...validBody(), name: 'Eve\nEvil', phone: '+351966167435' },
      snapshot: { title: { pt: 'Tour oeste' } },
    })
    expect(params).toHaveLength(6)
    expect(params[2]).toBe('20/12/2026 09:30')
    expect(params[3]).toBe('2 adultos, 1 criança')
    expect(params[4]).toBe('Eve Evil')
    for (const p of params) expect(p).not.toMatch(/[\n\r\t]/)
  })

  it('is skipped unless WHATSAPP_ENABLED=true', async () => {
    const { sendWhatsapp } = await import('@/lib/whatsapp')
    expect(await sendWhatsapp({})).toEqual({ status: 'skipped' })
  })
})

describe('booking ref', () => {
  it('has the format JV-YYYY-XXXXXX with an unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const ref = generateRef(new Date(NOW))
      expect(ref).toMatch(REF_PATTERN)
      expect(ref.slice(8)).not.toMatch(/[ILO01]/)
    }
    expect(generateRef(new Date(NOW)).startsWith('JV-2026-')).toBe(true)
  })
})
