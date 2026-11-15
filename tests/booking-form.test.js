import { describe, expect, it } from 'vitest'
import {
  buildPayload,
  errorMessageKeys,
  fieldVisibility,
  firstInvalidField,
  fromApiErrors,
  groupServices,
  interpretResponse,
  maxDate,
  minDate,
  normalisePhone,
  parseServiceParam,
  sanitiseRef,
  validateBooking,
} from '@/components/booking/booking-helpers'
import { getPublishedServices } from '@/lib/services'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'

const services = getPublishedServices().map((s) => ({
  slug: s.slug,
  type: s.type,
  capacity: s.capacity,
  title: s.title.en,
}))
const bySlug = (slug) => services.find((s) => s.slug === slug)
const transfer = bySlug('funchal-airport-transfer')
const tour = bySlug('west-madeira-tour')

// A Wednesday at noon UTC, so "tomorrow" is 2026-11-19 in Madeira.
const NOW = new Date('2026-11-18T12:00:00Z')

const valid = {
  service: tour.slug,
  date: '2026-11-25',
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
  website: '',
}

describe('parseServiceParam', () => {
  it('accepts published slugs only', () => {
    expect(parseServiceParam('west-madeira-tour', services)).toBe('west-madeira-tour')
    expect(parseServiceParam('nope', services)).toBe('')
    expect(parseServiceParam(undefined, services)).toBe('')
    expect(parseServiceParam(['west-madeira-tour', 'x'], services)).toBe('west-madeira-tour')
    expect(parseServiceParam('<script>', services)).toBe('')
  })
})

describe('fieldVisibility', () => {
  it('shows route and flight for transfers, with drop-off required', () => {
    expect(fieldVisibility(transfer)).toEqual({
      route: true,
      flight: true,
      dropoffRequired: true,
    })
  })

  it('shows optional route for levada and custom, nothing for other tours', () => {
    for (const slug of ['levada-walks-transfer', 'custom-trip']) {
      expect(fieldVisibility(bySlug(slug))).toEqual({
        route: true,
        flight: false,
        dropoffRequired: false,
      })
    }
    expect(fieldVisibility(tour).route).toBe(false)
    expect(fieldVisibility(undefined).route).toBe(false)
  })
})

describe('groupServices', () => {
  it('lists tours then transfers and covers every service', () => {
    const groups = groupServices(services)
    expect(groups.map((g) => g.type)).toEqual(['tour', 'transfer'])
    expect(groups.flatMap((g) => g.items)).toHaveLength(services.length)
  })
})

describe('sanitiseRef', () => {
  it('keeps only A-Z, 0-9 and dash, upper-cased, max 20', () => {
    expect(sanitiseRef('jv-2026-ab12')).toBe('JV-2026-AB12')
    expect(sanitiseRef('<img src=x onerror=1>')).toBe('IMGSRCXONERROR1')
    expect(sanitiseRef('A'.repeat(50))).toHaveLength(20)
    expect(sanitiseRef(undefined)).toBe('')
    expect(sanitiseRef(['AB-1', 'x'])).toBe('AB-1')
  })
})

describe('dates', () => {
  it('uses Madeira time for tomorrow and two years ahead as the limit', () => {
    expect(minDate(NOW)).toBe('2026-11-19')
    expect(maxDate(NOW)).toBe('2028-11-18')
  })
})

describe('normalisePhone', () => {
  it('needs an international number like the server', () => {
    expect(normalisePhone('+44 7700 900123')).toBe('+447700900123')
    expect(normalisePhone('00351 912 345 678')).toBe('+351912345678')
    expect(normalisePhone('912345678')).toBe('')
  })
})

describe('validateBooking', () => {
  it('accepts a valid request', () => {
    expect(validateBooking(valid, tour, NOW)).toEqual({})
  })

  it('flags required fields and consent', () => {
    const errors = validateBooking(
      { ...valid, service: '', date: '', name: '', email: '', phone: '', consent: false },
      undefined,
      NOW
    )
    expect(errors).toEqual({
      service: 'required',
      date: 'required',
      name: 'required',
      email: 'required',
      phone: 'required',
      consent: 'consent_required',
    })
  })

  it('checks the date window', () => {
    expect(validateBooking({ ...valid, date: '2026-11-18' }, tour, NOW).date).toBe('too_early')
    expect(validateBooking({ ...valid, date: '2026-11-19' }, tour, NOW).date).toBeUndefined()
    expect(validateBooking({ ...valid, date: '2029-01-01' }, tour, NOW).date).toBe('too_far')
    expect(validateBooking({ ...valid, date: '2026-02-31' }, tour, NOW).date).toBe('invalid')
  })

  it('limits adults to the service capacity', () => {
    expect(validateBooking({ ...valid, adults: 0 }, tour, NOW).adults).toBe('too_small')
    expect(validateBooking({ ...valid, adults: tour.capacity + 1 }, tour, NOW).adults).toBe(
      'too_large'
    )
    expect(validateBooking({ ...valid, adults: 'x' }, tour, NOW).adults).toBe('invalid')
  })

  it('requires drop-off for transfers only', () => {
    expect(validateBooking({ ...valid, service: transfer.slug }, transfer, NOW).dropoff).toBe(
      'required'
    )
    expect(
      validateBooking({ ...valid, service: transfer.slug, dropoff: 'Hotel X' }, transfer, NOW)
    ).toEqual({})
    const levada = bySlug('levada-walks-transfer')
    expect(validateBooking({ ...valid, service: levada.slug }, levada, NOW)).toEqual({})
  })

  it('checks email, phone and lengths', () => {
    const errors = validateBooking(
      { ...valid, email: 'nope', phone: '12345', name: 'J', notes: 'x'.repeat(1001) },
      tour,
      NOW
    )
    expect(errors).toEqual({
      email: 'invalid',
      phone: 'invalid',
      name: 'too_short',
      notes: 'too_long',
    })
  })
})

describe('firstInvalidField', () => {
  it('follows on-screen order, not object order', () => {
    expect(firstInvalidField({ email: 'invalid', date: 'required' })).toBe('date')
    expect(firstInvalidField({})).toBeNull()
  })
})

describe('buildPayload', () => {
  const meta = { formStartedAt: 1700000000000, idempotencyKey: 'key', locale: 'pt' }

  it('uses API field names and numbers, and includes the honeypot and meta', () => {
    const body = buildPayload(
      { ...valid, adults: '3', service: transfer.slug, dropoff: ' Hotel ', flightNumber: 'TP1693' },
      transfer,
      meta
    )
    expect(body).toMatchObject({
      serviceSlug: transfer.slug,
      adults: 3,
      children: 0,
      dropoffLocation: 'Hotel',
      flightNumber: 'TP1693',
      website: '',
      formStartedAt: 1700000000000,
      idempotencyKey: 'key',
      locale: 'pt',
      consent: true,
    })
  })

  it('leaves out fields that are hidden for the service', () => {
    const body = buildPayload({ ...valid, pickup: 'x', flightNumber: 'y' }, tour, meta)
    expect(body).not.toHaveProperty('pickupLocation')
    expect(body).not.toHaveProperty('flightNumber')
  })
})

describe('interpretResponse', () => {
  it('maps success (created and already received)', () => {
    expect(interpretResponse(201, { ok: true, ref: 'jv-1' })).toEqual({
      kind: 'success',
      ref: 'JV-1',
    })
    expect(interpretResponse(200, { ok: true, ref: 'JV-1' }).kind).toBe('success')
  })

  it('maps API field names back to form names', () => {
    const outcome = interpretResponse(400, {
      ok: false,
      errors: { serviceSlug: 'unknown_service', dropoffLocation: 'required', email: 'invalid' },
    })
    expect(outcome).toEqual({
      kind: 'fieldErrors',
      errors: { service: 'unknown_service', dropoff: 'required', email: 'invalid' },
    })
    expect(fromApiErrors({ _form: 'invalid' })).toEqual({ _form: 'invalid' })
  })

  it('maps the other statuses', () => {
    expect(interpretResponse(403, {}).kind).toBe('forbidden')
    expect(interpretResponse(429, {}).kind).toBe('rateLimited')
    expect(interpretResponse(500, null).kind).toBe('error')
    expect(interpretResponse(201, { ok: true }).kind).toBe('error')
  })

  it('only trusts WhatsApp links on delivery failure', () => {
    const ok = interpretResponse(502, {
      ok: false,
      code: 'DELIVERY_FAILED',
      whatsappUrl: 'https://wa.me/351966167435?text=hi',
    })
    expect(ok).toEqual({
      kind: 'deliveryFailed',
      whatsappUrl: 'https://wa.me/351966167435?text=hi',
    })
    const bad = interpretResponse(502, {
      code: 'DELIVERY_FAILED',
      whatsappUrl: 'https://evil.example/',
    })
    expect(bad.whatsappUrl).toBe('')
  })
})

describe('error messages', () => {
  const has = (messages, key) => key.split('.').reduce((o, p) => o?.[p], messages.Booking) != null

  it('tries field, code, then generic; unknown codes go generic', () => {
    expect(errorMessageKeys('email', 'invalid')).toEqual([
      'errors.email.invalid',
      'errors.invalid',
      'errors.generic',
    ])
    expect(errorMessageKeys('email', 'weird_code')).toEqual(['errors.generic'])
  })

  it('has a message in every language for every API code', () => {
    const codes = [
      'required',
      'invalid',
      'too_short',
      'too_long',
      'too_early',
      'too_far',
      'too_small',
      'too_large',
      'unknown_service',
      'consent_required',
      'generic',
    ]
    for (const messages of [en, pt]) {
      for (const code of codes) expect(has(messages, `errors.${code}`), code).toBe(true)
    }
  })
})
