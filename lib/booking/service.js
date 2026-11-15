import { createHash, randomBytes, randomInt } from 'node:crypto'
import { siteConfig, whatsappLink } from '@/config/site'
import { sendEmail } from '@/lib/email'
import { withTimeout } from '@/lib/http'
import { connectDb, isDbConfigured } from '@/lib/mongoose'
import { consumeRateLimit, releaseRateLimit, resetRateLimits } from '@/lib/rate-limit'
import { sendWhatsapp } from '@/lib/whatsapp'
import BookingRequest from '@/models/BookingRequest'
import { cleanText, validateBooking } from './schema'
import { REF_ALPHABET, generateRef } from './ref'

// PLACEHOLDERS: neither the privacy policy nor the consent wording is final. Bump both when the
// legal texts are approved (they are stored with every consent as proof of what was accepted).
export const PRIVACY_POLICY_VERSION = 'PLACEHOLDER-privacy-policy-not-final'
export const CONSENT_TEXT_VERSION = 'PLACEHOLDER-consent-text-v0'

const MIN_FILL_MS = 3000 // faster than this is flagged as suspect (never discarded)
const MAX_FUTURE_SKEW_MS = 60 * 1000 // client clock ahead of ours by more than this: ignore it
const MAX_PLAUSIBLE_FILL_MS = 24 * 60 * 60 * 1000 // older than this: stale or wrong clock, ignore
const DB_TIMEOUT_MS = 2500
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000
const MAX_SEEN_KEYS = 5000

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Idempotency, per instance. Maps idempotencyKey -> { expires, done } where `done` is a promise of
 * the final { status, body, headers } of the request that owns the key. The entry is registered
 * synchronously (before any await), so concurrent requests with the same key wait for the same
 * result and nothing is ever sent twice. A failed outcome (4xx/5xx) releases the key.
 * Across instances the database lookup (unique idempotencyKey) is a best-effort second line.
 */
const seenKeys = new Map()

let botDrops = 0
let configWarned = false

/** For tests. */
export function resetBookingState() {
  seenKeys.clear()
  resetRateLimits()
  botDrops = 0
  configWarned = false
}

/** For tests and logs: how many bot submissions were silently dropped by this instance. */
export function getBotDropCount() {
  return botDrops
}

const isProd = () => process.env.NODE_ENV === 'production'
const json = (status, body, headers) => ({ status, body, headers })

/** Random-looking reference for honeypot hits. Nothing is stored. */
function fakeRef(now) {
  const code = Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join(
    ''
  )
  return `JV-${new Date(now).getFullYear()}-${code}`
}

/**
 * Client IP for rate limiting. Platform headers come first because the platform overwrites them,
 * so a client cannot choose them on Vercel: x-vercel-forwarded-for, then x-real-ip, then the first
 * entry of x-forwarded-for. Outside such a platform (own server without a trusted proxy) all of
 * them are client-controlled and the limiter can be dodged: put a proxy that sets them in front.
 */
export function clientIp(headers) {
  const first = (name) => headers.get(name)?.split(',')[0]?.trim()
  const ip = first('x-vercel-forwarded-for') || first('x-real-ip') || first('x-forwarded-for')
  return ip ? ip.slice(0, 64) : 'unknown'
}

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/** Origin of a URL string, or null. */
function originOf(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/** The www and apex variants of an origin (https://a.pt <-> https://www.a.pt). */
function wwwVariants(origin) {
  const url = new URL(origin)
  const host = url.hostname
  if (isLocalHost(host) || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.')) {
    return [origin]
  }
  const other = host.startsWith('www.') ? host.slice(4) : `www.${host}`
  return [origin, `${url.protocol}//${other}${url.port ? `:${url.port}` : ''}`]
}

/** Allowed origins: the site URL (www and apex), plus ALLOWED_ORIGINS (comma separated). */
function allowedOrigins() {
  const set = new Set()
  const site = originOf(siteConfig.url)
  if (site) for (const o of wwwVariants(site)) set.add(o)
  for (const entry of (process.env.ALLOWED_ORIGINS || '').split(',')) {
    const o = originOf(entry.trim())
    if (o) set.add(o)
  }
  return set
}

function originAllowed(headers) {
  const origin = headers.get('origin')
  if (!origin) return false
  if (allowedOrigins().has(origin)) return true
  if (isProd()) return false
  try {
    return isLocalHost(new URL(origin).hostname)
  } catch {
    return false
  }
}

/** One clear log line per instance for production settings that silently break the form. */
function warnConfigOnce() {
  if (configWarned || !isProd()) return
  configWarned = true
  const host = new URL(siteConfig.url).hostname
  if (isLocalHost(host)) {
    console.error(
      '[booking] NEXT_PUBLIC_SITE_URL is missing or points to localhost in production: every request is rejected with 403 FORBIDDEN_ORIGIN unless ALLOWED_ORIGINS lists the real site origin.'
    )
  }
  if (!process.env.IP_HASH_SALT) {
    console.error(
      '[booking] IP_HASH_SALT is not set in production: IP hashes are not stored and rate-limit keys use a random per-instance salt.'
    )
  }
}

// Used when IP_HASH_SALT is not set: never hash with an empty (guessable) salt.
const instanceSalt = randomBytes(16).toString('hex')

function hashValue(value) {
  return createHash('sha256')
    .update(`${process.env.IP_HASH_SALT || instanceSalt}:${value}`)
    .digest('hex')
}

/** Frozen copy of the service data that matters for the request. */
export function buildSnapshot(service) {
  return Object.freeze({
    id: service.id,
    title: Object.freeze({ ...service.title }),
    priceFrom: service.priceFrom,
    currency: service.currency,
    placeholder: Boolean(service.placeholder),
  })
}

/** Name of a failure, safe to log (no message text: it could echo personal data). */
function reasonName(err) {
  if (typeof err?.message === 'string' && err.message.endsWith('_timeout')) return 'timeout'
  return typeof err?.name === 'string' && /^\w{1,60}$/.test(err.name) ? err.name : 'Error'
}

/** Names (not values) of the fields a Mongoose ValidationError complains about. */
function failedFields(err) {
  return err?.errors && typeof err.errors === 'object'
    ? Object.keys(err.errors).slice(0, 10).join(',')
    : undefined
}

function rememberKey(key, now) {
  if (seenKeys.size >= MAX_SEEN_KEYS) {
    for (const [k, v] of seenKeys) if (v.expires <= now) seenKeys.delete(k)
    while (seenKeys.size >= MAX_SEEN_KEYS) seenKeys.delete(seenKeys.keys().next().value)
  }
  const entry = { expires: now + IDEMPOTENCY_TTL_MS, done: null }
  seenKeys.set(key, entry)
  return entry
}

function recallKey(key, now) {
  const hit = seenKeys.get(key)
  if (!hit) return null
  if (hit.expires <= now) {
    seenKeys.delete(key)
    return null
  }
  return hit
}

async function findRefByKey(key) {
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

export function buildDocument({ ref, data, service, snapshot, headers, ip, now, suspect = false }) {
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
    consent: {
      privacy: true,
      version: PRIVACY_POLICY_VERSION,
      textVersion: CONSENT_TEXT_VERSION,
      locale: data.locale,
      at: new Date(now),
    },
    status: 'new',
    delivery: { email: { status: 'pending' }, whatsapp: { status: 'pending' } },
    payment: { status: 'none' },
    meta: {
      // Only with an explicit salt: an unsalted IP hash is trivially reversible.
      ipHash: process.env.IP_HASH_SALT ? hashValue(ip) : undefined,
      userAgent,
      suspect: suspect || undefined,
    },
  }
}

/** Returns the raw promise (no timeout) so a late completion can still be followed up. */
function saveRequest(doc) {
  return connectDb().then(() => BookingRequest.create(doc))
}

async function saveDelivery(ref, delivery, status, now) {
  const at = new Date(now)
  const entry = (r) => ({ ...r, at })
  await withTimeout(
    BookingRequest.updateOne(
      { ref },
      {
        $set: {
          'delivery.email': entry(delivery.email),
          'delivery.whatsapp': entry(delivery.whatsapp),
          status,
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

/** Silent fake success for bots. Counted and logged (no personal data). */
function dropBot(reason, now) {
  botDrops += 1
  console.info(`[booking] bot submission dropped reason=${reason} total=${botDrops}`)
  return json(201, { ok: true, ref: fakeRef(now) })
}

/**
 * Time trap. Client clocks are not trusted: a start time more than a minute in the future or
 * older than 24 h is ignored. Returns true only for a plausible clock and a too-short fill time.
 * A suspect request is processed normally (a fast autofill is a real customer) and only flagged.
 */
function filledTooFast(started, now) {
  if (typeof started !== 'number' || !Number.isFinite(started)) return false
  const elapsed = now - started
  if (elapsed < -MAX_FUTURE_SKEW_MS || elapsed > MAX_PLAUSIBLE_FILL_MS) return false
  return elapsed < MIN_FILL_MS
}

/** Does the work for a request that owns its idempotency key. Never throws past the caller. */
async function processBooking({ data, service, headers, ip, now, suspect, quota }) {
  const snapshot = buildSnapshot(service)
  const dbConfigured = isDbConfigured()

  if (dbConfigured) {
    // Another instance may already have handled this key.
    const previous = await findRefByKey(data.idempotencyKey)
    if (previous) {
      releaseRateLimit(quota, now)
      return json(200, { ok: true, ref: previous })
    }
  }

  const ref = generateRef(new Date(now))
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
  const savePromise = dbConfigured
    ? saveRequest(buildDocument({ ref, data, service, snapshot, headers, ip, now, suspect }))
    : null
  const [saved, emailRes, waRes] = await Promise.allSettled([
    savePromise
      ? withTimeout(savePromise, DB_TIMEOUT_MS, 'db')
      : Promise.reject(new Error('db_not_configured')),
    sendEmail({ ref, booking, snapshot, idempotencyKey: data.idempotencyKey }),
    sendWhatsapp({ ref, booking, snapshot }),
  ])
  const stored = saved.status === 'fulfilled'
  const delivery = { email: settle(emailRes), whatsapp: settle(waRes) }
  const delivered = delivery.email.status === 'sent' || delivery.whatsapp.status === 'sent'
  const status = delivered ? 'new' : 'delivery_failed'

  if (dbConfigured && !stored) {
    console.error('[booking] db save failed', {
      ref,
      reason: reasonName(saved.reason),
      fields: failedFields(saved.reason),
    })
  }
  if (stored) {
    try {
      await saveDelivery(ref, delivery, status, Date.now())
    } catch (err) {
      console.error('[booking] delivery status update failed', { ref, reason: reasonName(err) })
    }
  } else if (savePromise && reasonName(saved.reason) === 'timeout') {
    // The save only timed out: it may still complete. Then write the delivery result, so the
    // record is not left 'pending' forever. Best effort: a serverless instance can be frozen
    // once the response is sent.
    savePromise
      .then(() => saveDelivery(ref, delivery, status, Date.now()))
      .then(() => console.info('[booking] late save completed', { ref }))
      .catch((err) =>
        console.error('[booking] late save follow-up failed', { ref, reason: reasonName(err) })
      )
  }
  for (const [name, r] of Object.entries(delivery)) {
    if (r.status === 'failed')
      console.error('[booking] channel failed', { ref, name, error: r.error })
  }

  if (stored || delivered) {
    if (stored && !delivered) {
      // Saved but nobody was told. TODO v1.1: alert/retry job over status 'delivery_failed'.
      console.error('[booking] DELIVERY_FAILED saved but not delivered, follow up by hand', {
        ref,
        status: 'delivery_failed',
      })
    }
    console.info(
      `[booking] ref=${ref} service=${service.slug} saved=${stored} delivered=${delivered}${
        suspect ? ' suspect=true' : ''
      }`
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

  releaseRateLimit(quota, now) // the customer got nothing: do not use up their daily quota
  console.error('[booking] request lost: nothing stored and nothing delivered', { ref })
  return json(502, {
    ok: false,
    code: 'DELIVERY_FAILED',
    whatsappUrl: fallbackWhatsappUrl(data, snapshot),
  })
}

/** A repeated request: the same ref, whatever the body says (the body is not compared). */
function replay(result) {
  return result.body?.ok ? json(200, { ok: true, ref: result.body.ref }) : result
}

/**
 * Handle one booking request.
 * Input: { body (parsed JSON), headers (Headers), now (ms, injectable for tests) }.
 * Output: { status, body, headers } for the route to send.
 *
 * Bot gates (never a fake success for a real customer):
 *  - honeypot `bot_trap_field` filled: silent fake 201, nothing stored or sent. Only this name
 *    counts; the old `website` field is ignored.
 *  - `formStartedAt` is untrusted: implausible clocks are ignored; a plausible fill time under
 *    3 s is processed normally and stored with meta.suspect = true.
 * Idempotency: a repeated idempotencyKey returns 200 with the ORIGINAL ref, even if the body
 * differs. The 200 is also given to concurrent duplicates that arrive while the first is running.
 */
export async function createBookingRequest({ body, headers, now = Date.now() }) {
  warnConfigOnce()
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

  const trap = body.bot_trap_field
  if (trap != null && String(trap).trim() !== '') return dropBot('honeypot', now)
  const suspect = filledTooFast(body.formStartedAt, now)

  const parsed = validateBooking(body, { now: new Date(now) })
  if (!parsed.success) return json(400, { ok: false, errors: parsed.errors })
  const { data, service } = parsed
  const key = data.idempotencyKey

  // Everything from here to registerKey is synchronous: no other request can slip in between.
  const known = recallKey(key, now)
  if (known) return replay(await known.done)

  const quota = [{ key: `email1d:${hashValue(data.email)}`, limit: 3, windowMs: DAY }]
  const emailLimit = consumeRateLimit(quota, now)
  if (!emailLimit.allowed) {
    return json(
      429,
      { ok: false, code: 'RATE_LIMITED' },
      { 'Retry-After': String(emailLimit.retryAfterSec) }
    )
  }

  const entry = rememberKey(key, now)
  entry.done = processBooking({ data, service, headers, ip, now, suspect, quota })
    .catch((err) => {
      releaseRateLimit(quota, now)
      console.error('[booking] unexpected error', { reason: reasonName(err) })
      return json(500, { ok: false, code: 'SERVER_ERROR' })
    })
    .then((result) => {
      if (result.status >= 400 && seenKeys.get(key) === entry) seenKeys.delete(key) // allow a retry
      return result
    })
  return entry.done
}
