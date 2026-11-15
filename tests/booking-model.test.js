import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

// No mocks and no database: the REAL Mongoose model validates the REAL document the service
// builds. Previously the model declared serviceSnapshot.title as a String while the service sent
// { pt, en }, so every save failed (the mocked tests could not see it).
import BookingRequest from '@/models/BookingRequest'
import { buildDocument, buildSnapshot } from '@/lib/booking/service'
import { validateBooking } from '@/lib/booking/schema'
import { generateRef } from '@/lib/booking/ref'

const NOW = Date.parse('2026-11-15T12:00:00Z')

function documentFor(overrides = {}, { suspect = false } = {}) {
  const parsed = validateBooking(
    {
      serviceSlug: 'west-madeira-tour',
      date: '2026-12-20',
      time: '09:30',
      adults: 2,
      children: 1,
      infants: 0,
      pickupLocation: 'Hotel Calheta Beach',
      notes: 'We love views',
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      phone: '+49 151 2345 6789',
      locale: 'pt',
      consent: true,
      idempotencyKey: randomUUID(),
      formStartedAt: NOW - 20000,
      ...overrides,
    },
    { now: new Date(NOW) }
  )
  expect(parsed.success, JSON.stringify(parsed.errors)).toBe(true)
  const { data, service } = parsed
  return buildDocument({
    ref: generateRef(new Date(NOW)),
    data,
    service,
    snapshot: buildSnapshot(service),
    headers: new Headers({ 'user-agent': 'vitest' }),
    ip: '1.2.3.4',
    now: NOW,
    suspect,
  })
}

describe('BookingRequest model vs the document the service builds', () => {
  it('validates (this failed before: title was a String, the service sends {pt, en})', () => {
    const doc = new BookingRequest(documentFor())
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.serviceSnapshot.title.pt).toEqual(expect.any(String))
    expect(doc.serviceSnapshot.title.en).toEqual(expect.any(String))
  })

  it('validate() resolves too, for a transfer with every optional field', async () => {
    const doc = new BookingRequest(
      documentFor({
        serviceSlug: 'funchal-airport-transfer',
        dropoffLocation: 'Calheta',
        flightNumber: 'FR1234',
        luggage: '2 suitcases',
      })
    )
    await expect(doc.validate()).resolves.toBeUndefined()
  })

  it('keeps every field the service sends (strict mode would drop unknown ones silently)', () => {
    const built = documentFor({}, { suspect: true })
    const saved = new BookingRequest(built).toObject()
    expect(saved.serviceSnapshot.title).toEqual(built.serviceSnapshot.title)
    expect(saved.consent).toMatchObject({
      privacy: true,
      version: built.consent.version,
      textVersion: built.consent.textVersion,
      locale: 'pt',
    })
    expect(saved.meta.suspect).toBe(true)
    expect(saved.status).toBe('new')
    for (const key of Object.keys(built)) {
      if (built[key] !== undefined) expect(saved, key).toHaveProperty(key)
    }
  })

  it('accepts the delivery_failed status and rejects unknown ones', () => {
    const base = documentFor()
    expect(
      new BookingRequest({ ...base, status: 'delivery_failed' }).validateSync()
    ).toBeUndefined()
    const bad = new BookingRequest({ ...base, status: 'bogus' }).validateSync()
    expect(bad.errors.status).toBeDefined()
  })
})
