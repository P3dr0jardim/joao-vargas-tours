import { afterEach, describe, expect, it, vi } from 'vitest'

// The service is replaced so that it throws: the route must still answer with JSON.
vi.mock('@/lib/booking/service', () => ({
  createBookingRequest: vi.fn().mockRejectedValue(new TypeError('contains person@example.com')),
}))

import * as route from '@/app/api/booking-requests/route'

afterEach(() => vi.restoreAllMocks())

describe('POST /api/booking-requests: unexpected failure', () => {
  it('answers a JSON 500 with a code, no stack and no personal data', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await route.POST(
      new Request('http://localhost:3000/api/booking-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({ any: 'thing' }),
      })
    )
    expect(res.status).toBe(500)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
    expect(await res.json()).toEqual({ ok: false, code: 'SERVER_ERROR' })
    expect(JSON.stringify(spy.mock.calls)).not.toContain('person@example.com')
  })
})
