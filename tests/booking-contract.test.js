import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as client from '@/components/booking/booking-helpers'
import { ERROR_CODES as SERVER_CODES, maxAdultsFor, validateBooking } from '@/lib/booking/schema'
import { getPublishedServices } from '@/lib/services'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'

const NOW = new Date('2026-11-18T12:00:00Z')
const ROOT = process.cwd()
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// Exactly what app/[locale]/book/page.js hands to the form.
const offered = getPublishedServices().map((s) => ({
  slug: s.slug,
  type: s.type,
  maxAdults: maxAdultsFor(s),
  title: s.title.en,
}))

const formValues = (overrides = {}) => ({
  service: 'west-madeira-tour',
  date: '2026-12-20',
  time: '',
  adults: 2,
  children: 0,
  infants: 0,
  pickup: '',
  dropoff: '',
  flightNumber: '',
  luggage: '',
  notes: '',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+44 7700 900123',
  consent: true,
  bot_trap_field: '',
  ...overrides,
})

const meta = {
  formStartedAt: NOW.getTime() - 20000,
  idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
  locale: 'en',
}

/** Run a form submission through the client payload builder and the server schema. */
function serverResultFor(values, service) {
  return validateBooking(client.buildPayload(values, service, meta), { now: NOW })
}

describe('contract: every service the form offers is accepted by the server', () => {
  it('offers at least the published services', () => {
    expect(offered.length).toBeGreaterThan(0)
  })

  it.each(offered.map((s) => [s.slug, s]))('%s', (_, service) => {
    const values = formValues({
      service: service.slug,
      dropoff: service.type === 'transfer' ? 'Hotel Calheta' : '',
      adults: service.maxAdults,
    })
    // 1. client validation passes
    expect(client.validateBooking(values, service, NOW)).toEqual({})
    // 2. the payload it builds is accepted by the server schema
    const result = serverResultFor(values, service)
    expect(result.errors).toBeUndefined()
    expect(result.success).toBe(true)
    expect(result.service.slug).toBe(service.slug)
  })

  it.each(offered.map((s) => [s.slug, s]))(
    '%s: client and server agree on capacity',
    (_, service) => {
      const server = getPublishedServices().find((s) => s.slug === service.slug)
      expect(maxAdultsFor(server)).toBe(service.maxAdults)
      const over = formValues({
        service: service.slug,
        dropoff: 'X',
        adults: service.maxAdults + 1,
      })
      expect(client.validateBooking(over, service, NOW).adults).toBe('too_large')
      expect(serverResultFor(over, service).errors.adults).toBe('too_large')
    }
  )

  it('the service param on /book?service= only ever yields a slug the server accepts', () => {
    for (const s of offered) {
      expect(client.parseServiceParam(s.slug, offered)).toBe(s.slug)
    }
    expect(client.parseServiceParam('nope', offered)).toBe('')
  })

  it('field visibility matches what the server requires', () => {
    for (const s of offered) {
      const vis = client.fieldVisibility(s)
      const server = serverResultFor(formValues({ service: s.slug }), s)
      // Without a drop-off the server only complains when the client says it is required.
      if (vis.dropoffRequired) expect(server.errors).toEqual({ dropoffLocation: 'required' })
      else expect(server.success).toBe(true)
    }
  })

  it('optional route fields on levada and custom trip reach the server', () => {
    for (const slug of ['levada-walks-transfer', 'custom-trip']) {
      const s = offered.find((x) => x.slug === slug)
      const payload = client.buildPayload(
        formValues({ service: slug, pickup: 'A', dropoff: 'B' }),
        s,
        meta
      )
      expect(payload).toMatchObject({ pickupLocation: 'A', dropoffLocation: 'B' })
      expect(payload).not.toHaveProperty('flightNumber')
      expect(validateBooking(payload, { now: NOW }).success).toBe(true)
    }
  })

  it('blank optional text sent by the form is treated as absent by the server', () => {
    const transfer = offered.find((s) => s.type === 'transfer')
    const payload = client.buildPayload(
      formValues({ service: transfer.slug, dropoff: 'Hotel', time: '', luggage: '', notes: '' }),
      transfer,
      meta
    )
    expect(payload).toMatchObject({ time: '', luggage: '', notes: '', flightNumber: '' })
    const result = validateBooking(payload, { now: NOW })
    expect(result.success).toBe(true)
    for (const k of ['time', 'luggage', 'notes', 'flightNumber', 'pickupLocation'])
      expect(result.data[k]).toBeUndefined()
  })

  it('every payload key is a key the server reads (nothing is silently dropped)', () => {
    const transfer = offered.find((s) => s.type === 'transfer')
    const payload = client.buildPayload(
      formValues({
        service: transfer.slug,
        pickup: 'A',
        dropoff: 'B',
        flightNumber: 'TP1',
        time: '09:00',
        luggage: 'x',
        notes: 'n',
      }),
      transfer,
      meta
    )
    const parsed = validateBooking(payload, { now: NOW })
    expect(parsed.success).toBe(true)
    const sentKeys = Object.keys(payload).filter((k) => k !== 'bot_trap_field')
    for (const key of sentKeys) expect(parsed.data, key).toHaveProperty(key)
  })
})

describe('contract: client and server validation agree', () => {
  const tour = offered.find((s) => s.slug === 'west-madeira-tour')
  const transfer = offered.find((s) => s.slug === 'funchal-airport-transfer')

  // [field on the form, override, service]. "agree" = same code (or both fine).
  const cases = [
    ['date', { date: '2026-11-18' }],
    ['date', { date: '2026-11-19' }],
    ['date', { date: '2028-11-18' }],
    ['date', { date: '2028-11-19' }],
    ['date', { date: '2026-02-30' }],
    ['date', { date: '26-11-20' }],
    ['time', { time: '24:00' }],
    ['time', { time: '9:30' }],
    ['time', { time: '23:59' }],
    ['adults', { adults: 0 }],
    ['adults', { adults: 6 }],
    ['adults', { adults: 7 }],
    ['adults', { adults: '1.5' }],
    ['adults', { adults: 'abc' }],
    ['children', { children: 8 }],
    ['children', { children: 9 }],
    ['infants', { infants: 9 }],
    ['infants', { infants: 'x' }],
    ['name', { name: 'A' }],
    ['name', { name: '  A  ' }],
    ['name', { name: 'x'.repeat(100) }],
    ['name', { name: 'x'.repeat(101) }],
    ['name', { name: '' }],
    ['email', { email: 'a@b.co' }],
    ['email', { email: 'a@b' }],
    ['email', { email: 'a b@c.de' }],
    ['email', { email: '' }],
    ['email', { email: `${'a'.repeat(250)}@example.com` }],
    ['phone', { phone: '+351 966 167 435' }],
    ['phone', { phone: '00351966167435' }],
    ['phone', { phone: '966167435' }],
    ['phone', { phone: '+1234567' }],
    ['phone', { phone: '+1234567890123456' }],
    ['phone', { phone: `+${'1'.repeat(41)}` }],
    ['phone', { phone: '' }],
    ['notes', { notes: 'x'.repeat(1000) }],
    ['notes', { notes: 'x'.repeat(1001) }],
    ['luggage', { luggage: 'x'.repeat(101) }],
    ['consent', { consent: false }],
  ]

  it.each(cases)('%s %j', (field, override) => {
    const values = formValues(override)
    const clientErrors = client.validateBooking(values, tour, NOW)
    const server = serverResultFor(values, tour)
    const serverErrors = server.success ? {} : client.fromApiErrors(server.errors)
    expect(clientErrors[field]).toBe(serverErrors[field])
  })

  it.each([
    ['pickup', { pickup: 'x'.repeat(201) }],
    ['dropoff', { dropoff: 'x'.repeat(201) }],
    ['dropoff', { dropoff: '' }],
    ['flightNumber', { flightNumber: 'ABCDEFGHIJK' }],
    ['flightNumber', { flightNumber: 'ABCDEFGHIJ' }],
  ])('transfer %s %j', (field, override) => {
    const values = formValues({ service: transfer.slug, dropoff: 'Hotel', ...override })
    const clientErrors = client.validateBooking(values, transfer, NOW)
    const server = serverResultFor(values, transfer)
    const serverErrors = server.success ? {} : client.fromApiErrors(server.errors)
    expect(clientErrors[field]).toBe(serverErrors[field])
  })

  it('the client is never stricter than the server on the date window near Madeira midnight', () => {
    const justAfterMidnightSummer = new Date('2026-07-15T23:30:00Z') // 16 Jul 00:30 in Madeira
    for (const date of ['2026-07-16', '2026-07-17', '2028-07-16', '2028-07-17']) {
      const values = formValues({ date })
      const c = client.validateBooking(values, tour, justAfterMidnightSummer).date
      const s = validateBooking(client.buildPayload(values, tour, meta), {
        now: justAfterMidnightSummer,
      })
      expect(c, date).toBe(s.success ? undefined : s.errors.date)
    }
  })

  // 29 Feb 2028 + 2 years: the server (date-fns addYears) stops at 28 Feb 2030.
  it('agrees on the two-year limit on a leap day (29 Feb 2028)', () => {
    const now = new Date('2028-02-29T12:00:00Z')
    for (const date of ['2030-02-28', '2030-03-01']) {
      const values = formValues({ date })
      const c = client.validateBooking(values, tour, now).date
      const s = validateBooking(client.buildPayload(values, tour, { ...meta, formStartedAt: 0 }), {
        now,
      })
      expect(c, date).toBe(s.success ? undefined : s.errors.date)
    }
  })
})

describe('contract: honeypot and idempotency key', () => {
  const tour = offered.find((s) => s.slug === 'west-madeira-tour')

  it('sends the honeypot under the name the server reads, and no longer as "website"', () => {
    const payload = client.buildPayload(formValues(), tour, meta)
    expect(payload).toHaveProperty('bot_trap_field', '')
    expect(payload).not.toHaveProperty('website')
    expect(read('lib/booking/schema.js')).toContain('bot_trap_field')
  })

  it('the fallback idempotency key is accepted by the server schema', () => {
    const fake = { getRandomValues: (a) => a.fill(255) }
    const key = client.newKey(fake)
    const parsed = validateBooking(
      client.buildPayload(formValues(), tour, { ...meta, idempotencyKey: key }),
      { now: NOW }
    )
    expect(parsed.errors?.idempotencyKey).toBeUndefined()
  })
})

describe('contract: error codes the UI can map', () => {
  const messageFor = (messages, field, code) =>
    client
      .errorMessageKeys(field, code)
      .map((key) => key.split('.').reduce((o, part) => o?.[part], messages.Booking))
      .find((value) => typeof value === 'string')

  it('client and server share exactly the same code list', () => {
    expect([...client.ERROR_CODES].sort()).toEqual([...SERVER_CODES].sort())
  })

  it('every server code resolves to a specific message for every form field, in both languages', () => {
    for (const field of client.FIELD_ORDER) {
      for (const code of SERVER_CODES) {
        for (const [name, messages] of [
          ['en', en],
          ['pt', pt],
        ]) {
          const msg = messageFor(messages, field, code)
          expect(msg, `${name} ${field}.${code}`).toBeTypeOf('string')
        }
      }
    }
  })

  it('field errors produced by the server for real bad input all map to a message', () => {
    const bad = {
      serviceSlug: 'nope',
      date: '2020-01-01',
      time: '99:99',
      adults: 99,
      children: 99,
      infants: 99,
      pickupLocation: 'x'.repeat(300),
      name: 'A',
      email: 'bad',
      phone: '12',
      locale: 'xx',
      consent: false,
      idempotencyKey: 'no',
      formStartedAt: 'now',
    }
    const result = validateBooking(bad, { now: NOW })
    expect(result.success).toBe(false)
    const mapped = client.fromApiErrors(result.errors)
    for (const [field, code] of Object.entries(mapped)) {
      expect(SERVER_CODES, `${field}: ${code}`).toContain(code)
      // fields the form does not show (locale, idempotencyKey, formStartedAt) take the generic notice
      if (client.FIELD_ORDER.includes(field)) {
        expect(messageFor(en, field, code), `${field}.${code}`).toBeTypeOf('string')
      }
    }
    // fields hidden from the user are reported under their API name, not a form name
    expect(Object.keys(mapped)).toEqual(expect.arrayContaining(['locale', 'idempotencyKey']))
  })

  it('maps API field names to form names and back without losing others', () => {
    expect(
      client.fromApiErrors({
        serviceSlug: 'a',
        pickupLocation: 'b',
        dropoffLocation: 'c',
        date: 'd',
      })
    ).toEqual({
      service: 'a',
      pickup: 'b',
      dropoff: 'c',
      date: 'd',
    })
  })

  it('every outcome kind the UI can show has a notice message in both languages', () => {
    const kinds = new Set(
      [
        client.interpretResponse(429, {}),
        client.interpretResponse(403, {}),
        client.interpretResponse(500, null),
        client.interpretResponse(502, { code: 'DELIVERY_FAILED' }),
        { kind: 'network' }, // fetch rejected: set in BookingForm
      ].map((o) => o.kind)
    )
    expect([...kinds].sort()).toEqual([
      'deliveryFailed',
      'error',
      'forbidden',
      'network',
      'rateLimited',
    ])
    for (const messages of [en, pt])
      for (const kind of kinds) expect(messages.Booking.notice[kind], kind).toBeTypeOf('string')
  })

  it('the API statuses the route can return are all interpreted', () => {
    expect(client.interpretResponse(201, { ok: true, ref: 'JV-2026-ABCDEF' }).kind).toBe('success')
    expect(client.interpretResponse(200, { ok: true, ref: 'JV-2026-ABCDEF' }).kind).toBe('success')
    expect(client.interpretResponse(400, { ok: false, errors: { _form: 'invalid' } }).kind).toBe(
      'fieldErrors'
    )
    expect(client.interpretResponse(403, { ok: false, code: 'FORBIDDEN_ORIGIN' }).kind).toBe(
      'forbidden'
    )
    expect(client.interpretResponse(429, { ok: false, code: 'RATE_LIMITED' }).kind).toBe(
      'rateLimited'
    )
    expect(client.interpretResponse(502, { ok: false, code: 'DELIVERY_FAILED' }).kind).toBe(
      'deliveryFailed'
    )
    expect(client.interpretResponse(500, '<html>').kind).toBe('error')
    expect(client.interpretResponse(400, null).kind).toBe('error')
  })

  it('a malformed success body is not trusted', () => {
    expect(client.interpretResponse(201, { ok: true, ref: '<>' }).kind).toBe('error')
    expect(client.interpretResponse(201, { ok: false, ref: 'JV-1' }).kind).toBe('error')
    expect(client.interpretResponse(201, { ok: true, ref: 42 }).kind).toBe('error')
  })

  it('only WhatsApp URLs on https are trusted from a 502 body', () => {
    const url = (u) =>
      client.interpretResponse(502, { code: 'DELIVERY_FAILED', whatsappUrl: u }).whatsappUrl
    expect(url('https://wa.me/351966167435?text=x')).toBe('https://wa.me/351966167435?text=x')
    expect(url('https://api.whatsapp.com/send?phone=1')).toBe(
      'https://api.whatsapp.com/send?phone=1'
    )
    expect(url('http://wa.me/1')).toBe('')
    expect(url('https://wa.me.evil.example/1')).toBe('')
    expect(url('javascript:alert(1)')).toBe('')
    expect(url('//wa.me/1')).toBe('')
    expect(url(undefined)).toBe('')
  })
})

describe('thank-you reference sanitiser', () => {
  it('output always matches [A-Z0-9-]{0,20}, whatever the input', () => {
    const inputs = [
      'JV-2026-ABCDEF',
      'jv-2026-abcdef',
      '"><script>alert(1)</script>',
      "' onmouseover='x",
      'javascript:alert(1)',
      '‮evil‬',
      'JV-2026-ABC\nDEF',
      '../../etc/passwd',
      '%3Cscript%3E',
      '&#60;script&#62;',
      'ünïcödé',
      'ß',
      'ı', // dotless i uppercases to I
      '𝐀𝐁𝐂',
      'A'.repeat(1000),
      '',
      '   ',
      null,
      undefined,
      42,
      {},
      [],
      [{ a: 1 }],
      ['<x>', 'second'],
    ]
    for (const input of inputs) {
      const out = client.sanitiseRef(input)
      expect(out, JSON.stringify(input)).toMatch(/^[A-Z0-9-]{0,20}$/)
    }
  })

  it('keeps a genuine reference unchanged', () => {
    expect(client.sanitiseRef('JV-2026-ABCDEF')).toBe('JV-2026-ABCDEF')
  })

  it('an injection attempt cannot survive as markup or a URL scheme', () => {
    const out = client.sanitiseRef('"><img src=x onerror=alert(1)>')
    expect(out).not.toMatch(/[<>"'=():\s]/)
    expect(client.sanitiseRef('javascript:alert(1)')).toBe('JAVASCRIPTALERT1')
  })

  it('an all-invalid value becomes empty (the page then shows the no-reference text)', () => {
    expect(client.sanitiseRef('<>"\'')).toBe('')
    expect(client.sanitiseRef('   ')).toBe('')
  })

  it('the thank-you page passes the query value through the sanitiser and nothing else', () => {
    const src = read('app/[locale]/book/thank-you/page.js')
    expect(src).toMatch(/sanitiseRef\(\(await searchParams\)\.ref\)/)
    expect(src).not.toMatch(/dangerouslySetInnerHTML/)
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/)
  })

  it('no booking component renders raw HTML', () => {
    for (const file of ['BookingForm.js', 'ServiceSummary.js', 'fields.js'])
      expect(read(`components/booking/${file}`), file).not.toMatch(
        /dangerouslySetInnerHTML|innerHTML/
      )
  })
})
