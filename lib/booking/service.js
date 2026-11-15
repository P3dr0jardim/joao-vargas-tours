import { createHash, randomInt } from 'node:crypto'
import { siteConfig, whatsappLink } from '@/config/site'
import { sendEmail } from '@/lib/email'
import { withTimeout } from '@/lib/http'
import { connectDb, isDbConfigured } from '@/lib/mongoose'
import { consumeRateLimit, resetRateLimits } from '@/lib/rate-limit'
import { sendWhatsapp } from '@/lib/whatsapp'
import BookingRequest from '@/models/BookingRequest'
import { cleanText, validateBooking } from './schema'
import { REF_ALPHABET, generateRef } from './ref'

export const PRIVACY_POLICY_VERSION = '2026-11-draft' // TODO: bump when the privacy page is final
const MIN_FILL_MS = 3000
const DB_TIMEOUT_MS = 5000
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// Per-instance memory: see lib/rate-limit.js. Maps idempotencyKey -> { ref, expires }.
const seenKeys = new Map()

/** For tests. */
export function resetBookingState() {
  seenKeys.clear()
  resetRateLimits()
}

const isProd = () => process.env.NODE_ENV === 'production'
const json = (status, body, headers) => ({ status, body, headers })

/** Random-looking reference for honeypot and too-fast submissions. Nothing is stored. */
function fakeRef(now) {
  const code = Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join(
    ''
  )
  return `JV-${new Date(now).getFullYear()}-${code}`
}

function clientIp(headers) {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown'
}

function originAllowed(headers) {
  const origin = headers.get('origin')
  if (!origin) return false
  let allowed
  try {
    allowed = new URL(siteConfig.url).origin
  } catch {
    return false
  }
  if (origin === allowed) return true
  if (isProd()) return false
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function hashValue(value) {
  return createHash('sha256')
    .update(`${process.env.IP_HASH_SALT ?? ''}:${value}`)
    .digest('hex')
}

/** Frozen copy of the service data that matters for the request. */
function buildSnapshot(service) {
  return Object.freeze({
    id: service.id,
    title: Object.freeze({ ...service.title }),
    priceFrom: service.priceFrom,
    currency: service.currency,
    placeholder: Boolean(service.placeholder),
  })
}

function rememberKey(key, ref, now) {
  if (seenKeys.size > 5000) {
    for (const [k, v] of seenKeys) if (v.expires <= now) seenKeys.delete(k)
  }
  seenKeys.set(key, { ref, expires: now + IDEMPOTENCY_TTL_MS })
}

function recallKey(key, now) {
  const hit = seenKeys.get(key)
  if (!hit) return null
  if (hit.expires <= now) {
    seenKeys.delete(key)
    return null
  }
  return hit.ref
}

async function findRefByKey(key) {
  if (!isDbConfigured()) return null
  try {
    const found = await withTimeout(
      connectDb().then(() =>
        BookingRequest.findOne({ idempotencyKey: String(key) }, { ref: 1 }).lean()
      ),
      DB_TIMEOUT_MS,
      'db'
    )
    return found?.ref ?? null
  } catch {
    return null // DB is a log, not a gate
  }
}

function buildDocument({ ref, data, service, snapshot, headers, ip, now }) {
  const userAgent = cleanText(headers.get('user-agent') ?? '').slice(0, 200)
  return {
    ref,
    idempotencyKey: data.idempotencyKey,
    serviceSlug: service.slug,
    type: service.type,
    serviceSnapshot: snapshot,
    date: data.date,
    time: data.time,
    adults: data.adults,
    children: data.children,
    infants: data.infants,
    pickupLocation: data.pickupLocation,
    dropoffLocation: data.dropoffLocation,
    flightNumber: data.flightNumber,
    luggage: data.luggage,
    notes: data.notes,
    customer: { name: data.name, email: data.email, phone: data.phone },
    locale: data.locale,
    consent: { privacy: true, version: PRIVACY_POLICY_VERSION, at: new Date(now) },
    status: 'new',
    delivery: { email: { status: 'pending' }, whatsapp: { status: 'pending' } },
    payment: { status: 'none' },
    meta: { ipHash: process.env.IP_HASH_SALT ? hashValue(ip) : undefined, userAgent },
  }
}

async function saveRequest(doc) {
  await withTimeout(
    connectDb().then(() => BookingRequest.create(doc)),
    DB_TIMEOUT_MS,
    'db'
  )
}

async function saveDelivery(ref, delivery, now) {
  const at = new Date(now)
  const entry = (r) => ({ ...r, at })
  await withTimeout(
    BookingRequest.updateOne(
      { ref },
      {
        $set: {
          'delivery.email': entry(delivery.email),
          'delivery.whatsapp': entry(delivery.whatsapp),
        },
      }
    ),
    DB_TIMEOUT_MS,
    'db'
  )
}

/** Convert a thrown value to a channel result so allSettled never hides a failure. */
const settle = (r) =>
  r.status === 'fulfilled' ? r.value : { status: 'failed', error: 'exception' }

function fallbackWhatsappUrl(data, snapshot) {
  const title = snapshot.title[data.locale] ?? snapshot.title.pt
  const message =
    data.locale === 'pt'
      ? `Olá João, gostaria de pedir: ${title}, dia ${data.date}, ${data.adults} adulto(s).`
      : `Hello João, I would like to request: ${title}, on ${data.date}, ${data.adults} adult(s).`
  return whatsappLink(message)
}

/**
 * Handle one booking request.
 * Input: { body (parsed JSON), headers (Headers), now (ms, injectable for tests) }.
 * Output: { status, body, headers } for the route to send.
 */
export async function createBookingRequest({ body, headers, now = Date.now() }) {
  if (!originAllowed(headers)) return json(403, { ok: false, code: 'FORBIDDEN_ORIGIN' })

  const ip = clientIp(headers)
  const ipLimit = consumeRateLimit(
    [
      { key: `ip10m:${ip}`, limit: 5, windowMs: 10 * MINUTE },
      { key: `ip1h:${ip}`, limit: 20, windowMs: HOUR },
    ],
    now
  )
  if (!ipLimit.allowed) {
    return json(
      429,
      { ok: false, code: 'RATE_LIMITED' },
      { 'Retry-After': String(ipLimit.retryAfterSec) }
    )
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, errors: { _form: 'invalid' } })
  }

  // Bots: honeypot filled, or form submitted faster than a human can type. Pretend it worked.
  const started = body.formStartedAt
  const tooFast =
    typeof started === 'number' && (now - started < MIN_FILL_MS || started > now + MINUTE)
  const honeypot = body.website != null && String(body.website).trim() !== ''
  if (honeypot || tooFast) return json(201, { ok: true, ref: fakeRef(now) })

  const parsed = validateBooking(body, { now: new Date(now) })
  if (!parsed.success) return json(400, { ok: false, errors: parsed.errors })
  const { data, service } = parsed

  // Idempotent resubmit (double click, network retry): same ref, nothing sent again.
  const knownRef = recallKey(data.idempotencyKey, now) ?? (await findRefByKey(data.idempotencyKey))
  if (knownRef) return json(200, { ok: true, ref: knownRef })

  const emailLimit = consumeRateLimit(
    [{ key: `email1d:${hashValue(data.email)}`, limit: 3, windowMs: DAY }],
    now
  )
  if (!emailLimit.allowed) {
    return json(
      429,
      { ok: false, code: 'RATE_LIMITED' },
      { 'Retry-After': String(emailLimit.retryAfterSec) }
    )
  }

  const ref = generateRef(new Date(now))
  const snapshot = buildSnapshot(service)
  rememberKey(data.idempotencyKey, ref, now)

  const dbConfigured = isDbConfigured()
  const booking = {
    date: data.date,
    time: data.time,
    adults: data.adults,
    children: data.children,
    infants: data.infants,
    pickupLocation: data.pickupLocation,
    dropoffLocation: data.dropoffLocation,
    flightNumber: data.flightNumber,
    luggage: data.luggage,
    notes: data.notes,
    name: data.name,
    email: data.email,
    phone: data.phone,
    locale: data.locale,
  }

  // The DB is a log, not a gate: notifications go out even if saving fails.
  const [saved, emailRes, waRes] = await Promise.allSettled([
    dbConfigured
      ? saveRequest(buildDocument({ ref, data, service, snapshot, headers, ip, now }))
      : Promise.reject(new Error('db_not_configured')),
    sendEmail({ ref, booking, snapshot }),
    sendWhatsapp({ ref, booking, snapshot }),
  ])
  const stored = saved.status === 'fulfilled'
  const delivery = { email: settle(emailRes), whatsapp: settle(waRes) }

  if (dbConfigured && !stored) console.error('[booking] db save failed', { ref })
  if (stored) {
    try {
      await saveDelivery(ref, delivery, Date.now())
    } catch {
      console.error('[booking] delivery status update failed', { ref })
    }
  }
  for (const [name, r] of Object.entries(delivery)) {
    if (r.status === 'failed')
      console.error('[booking] channel failed', { ref, name, error: r.error })
  }

  const delivered = delivery.email.status === 'sent' || delivery.whatsapp.status === 'sent'
  if (stored || delivered) {
    console.info(
      `[booking] ref=${ref} service=${service.slug} saved=${stored} delivered=${delivered}`
    )
    return json(201, { ok: true, ref })
  }

  const nothingConfigured =
    !dbConfigured && delivery.email.status === 'skipped' && delivery.whatsapp.status === 'skipped'
  if (nothingConfigured && !isProd()) {
    // Local development without any provider: let the form be tested end to end.
    console.info(
      `[booking] DEV (nothing configured, nothing stored or sent) ref=${ref} service=${service.slug}`
    )
    return json(201, { ok: true, ref })
  }

  seenKeys.delete(data.idempotencyKey) // allow a retry
  console.error('[booking] request lost: nothing stored and nothing delivered', { ref })
  return json(502, {
    ok: false,
    code: 'DELIVERY_FAILED',
    whatsappUrl: fallbackWhatsappUrl(data, snapshot),
  })
}
