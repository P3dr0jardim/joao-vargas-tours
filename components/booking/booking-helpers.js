/**
 * Pure helpers for the booking request form. No React, no browser APIs, so they are unit tested.
 *
 * Client validation mirrors the server rules (see LIMITS) to give fast feedback. It never replaces
 * the server: every server error code is still mapped and shown, per field.
 */

/** Error codes the API can return per field. Anything else gets the generic message. */
export const ERROR_CODES = [
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
]

/** Field limits. Keep in sync with the server validation (lib/booking). */
export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 40 },
  pickup: { max: 200 },
  dropoff: { max: 200 },
  flightNumber: { max: 10 },
  luggage: { max: 100 },
  notes: { max: 1000 },
  maxYearsAhead: 2,
  maxChildren: 8,
  maxInfants: 8,
}

/** Server field names differ from the form's; these maps translate in both directions. */
const API_NAMES = {
  service: 'serviceSlug',
  pickup: 'pickupLocation',
  dropoff: 'dropoffLocation',
}
const FORM_NAMES = Object.fromEntries(Object.entries(API_NAMES).map(([form, api]) => [api, form]))

/** Rename API error keys to form field names. Unknown keys (such as _form) are kept as they are. */
export function fromApiErrors(errors) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [FORM_NAMES[k] ?? k, v]))
}

/** Form fields in on-screen order, used to find the "first invalid field". */
export const FIELD_ORDER = [
  'service',
  'date',
  'time',
  'adults',
  'children',
  'infants',
  'pickup',
  'dropoff',
  'flightNumber',
  'luggage',
  'notes',
  'name',
  'email',
  'phone',
  'consent',
]

/** Slugs of services that take optional pick-up and drop-off even though they are tours. */
const FLEXIBLE_ROUTE_SLUGS = ['levada-walks-transfer', 'custom-trip']

/** Normalise the ?service= query value: only known slugs are accepted, anything else is ignored. */
export function parseServiceParam(value, services) {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return ''
  return services.some((s) => s.slug === raw) ? raw : ''
}

/** Which optional blocks to show for a service (or none selected). */
export function fieldVisibility(service) {
  if (!service) return { route: false, flight: false, dropoffRequired: false }
  const isTransfer = service.type === 'transfer'
  return {
    route: isTransfer || FLEXIBLE_ROUTE_SLUGS.includes(service.slug),
    flight: isTransfer,
    dropoffRequired: isTransfer,
  }
}

const ROUTE_FIELDS = ['pickup', 'dropoff']

/** Pickup and drop-off a service starts with (empty strings when it has none). */
export function routePrefill(service) {
  return {
    pickup: service?.prefill?.pickup ?? '',
    dropoff: service?.prefill?.dropoff ?? '',
  }
}

/**
 * Route values to set after the service changes: a field takes the new service's prefill only when
 * it is empty or still holds the old service's prefill, so text the customer typed is never lost.
 */
export function nextRouteValues(current, previousPrefill, nextPrefill) {
  const updates = {}
  for (const field of ROUTE_FIELDS) {
    const value = String(current[field] ?? '')
    const untouched = !value.trim() || value === previousPrefill[field]
    if (untouched && value !== nextPrefill[field]) updates[field] = nextPrefill[field]
  }
  return updates
}

/** Group services for the select: tours first, then transfers. Empty groups are dropped. */
export function groupServices(services) {
  return [
    { type: 'tour', items: services.filter((s) => s.type === 'tour') },
    { type: 'transfer', items: services.filter((s) => s.type === 'transfer') },
  ].filter((group) => group.items.length > 0)
}

/** Keep only [A-Z0-9-], upper-case, max 20 characters. Returns '' for anything else. */
export function sanitiseRef(value) {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return ''
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20)
}

/** Local date as YYYY-MM-DD. */
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today's date (YYYY-MM-DD) on Madeira, like the server, so "tomorrow" is the same for both. */
export function todayInMadeira(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Atlantic/Madeira',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Add days and/or years to a YYYY-MM-DD string. Calendar arithmetic is done in UTC so it never
 * depends on the browser time zone. Years clamp to the last day of the month, like date-fns
 * addYears on the server (29 Feb 2028 + 2 years = 28 Feb 2030).
 */
function shift(iso, { days = 0, years = 0 }) {
  const [y, m, d] = iso.split('-').map(Number)
  const year = y + years
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const date = new Date(Date.UTC(year, m - 1, Math.min(d, lastDay) + days))
  return date.toISOString().slice(0, 10)
}

/** Earliest bookable date: tomorrow (Madeira time). */
export function minDate(now = new Date()) {
  return shift(todayInMadeira(now), { days: 1 })
}

/** Latest accepted date: two years ahead. */
export function maxDate(now = new Date()) {
  return shift(todayInMadeira(now), { years: LIMITS.maxYearsAhead })
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Same normalisation as the server: international number, 8 to 15 digits after the +. */
export function normalisePhone(raw) {
  let value = String(raw).replace(/[\s().-]/g, '')
  if (value.startsWith('00')) value = `+${value.slice(2)}`
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : ''
}

function isWholeNumber(value) {
  return typeof value === 'number' ? Number.isInteger(value) : /^\d+$/.test(String(value).trim())
}

function checkText(value, { min = 0, max }, required) {
  const text = String(value ?? '').trim()
  if (!text) return required ? 'required' : null
  if (text.length < min) return 'too_short'
  if (text.length > max) return 'too_long'
  return null
}

/**
 * Validate form values. Returns { field: code } using the same codes as the API.
 * `service` is the selected service record (or undefined), `now` is injectable for tests.
 */
export function validateBooking(values, service, now = new Date()) {
  const errors = {}
  const set = (field, code) => {
    if (code) errors[field] = code
  }

  if (!values.service) set('service', 'required')
  else if (!service) set('service', 'unknown_service')

  const date = String(values.date ?? '').trim()
  if (!date) set('date', 'required')
  else if (!isRealDate(date)) set('date', 'invalid')
  else if (date < minDate(now)) set('date', 'too_early')
  else if (date > maxDate(now)) set('date', 'too_far')

  const time = String(values.time ?? '').trim()
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) set('time', 'invalid')

  const capacity = service?.maxAdults ?? 8
  const adults = String(values.adults ?? '').trim()
  if (!adults) set('adults', 'required')
  else if (!isWholeNumber(adults)) set('adults', 'invalid')
  else if (Number(adults) < 1) set('adults', 'too_small')
  else if (Number(adults) > capacity) set('adults', 'too_large')

  const children = String(values.children ?? '').trim()
  if (children && !isWholeNumber(children)) set('children', 'invalid')
  else if (Number(children) > LIMITS.maxChildren) set('children', 'too_large')
  const infants = String(values.infants ?? '').trim()
  if (infants && !isWholeNumber(infants)) set('infants', 'invalid')
  else if (Number(infants) > LIMITS.maxInfants) set('infants', 'too_large')

  const visible = fieldVisibility(service)
  if (visible.route) {
    set('pickup', checkText(values.pickup, LIMITS.pickup, false))
    set('dropoff', checkText(values.dropoff, LIMITS.dropoff, visible.dropoffRequired))
  }
  if (visible.flight)
    set('flightNumber', checkText(values.flightNumber, LIMITS.flightNumber, false))
  set('luggage', checkText(values.luggage, LIMITS.luggage, false))
  set('notes', checkText(values.notes, LIMITS.notes, false))

  set('name', checkText(values.name, LIMITS.name, true))

  const email = String(values.email ?? '').trim()
  if (!email) set('email', 'required')
  else if (email.length > LIMITS.email.max) set('email', 'too_long')
  else if (!EMAIL_RE.test(email)) set('email', 'invalid')

  const phone = String(values.phone ?? '').trim()
  if (!phone) set('phone', 'required')
  else if (phone.length > LIMITS.phone.max) set('phone', 'too_long')
  else if (!normalisePhone(phone)) set('phone', 'invalid')

  if (!values.consent) set('consent', 'consent_required')

  return errors
}

/** First field with an error, in on-screen order. */
export function firstInvalidField(errors) {
  return FIELD_ORDER.find((field) => errors[field]) ?? Object.keys(errors)[0] ?? null
}

/**
 * Translation keys to try for a field error, most specific first:
 * errors.<field>.<code>, errors.<code>, errors.generic. Unknown codes fall back to generic.
 */
export function errorMessageKeys(field, code) {
  const known = ERROR_CODES.includes(code)
  return known
    ? [`errors.${field}.${code}`, `errors.${code}`, 'errors.generic']
    : ['errors.generic']
}

/** Body sent to POST /api/booking-requests. Hidden-by-visibility fields are left out. */
export function buildPayload(values, service, meta) {
  const visible = fieldVisibility(service)
  const text = (v) => String(v ?? '').trim()
  const payload = {
    serviceSlug: values.service,
    date: text(values.date),
    time: text(values.time),
    adults: Number(values.adults),
    children: Number(values.children || 0),
    infants: Number(values.infants || 0),
    luggage: text(values.luggage),
    notes: text(values.notes),
    name: text(values.name),
    email: text(values.email),
    phone: text(values.phone),
    consent: Boolean(values.consent),
    bot_trap_field: String(values.bot_trap_field ?? ''),
    formStartedAt: meta.formStartedAt,
    idempotencyKey: meta.idempotencyKey,
    locale: meta.locale,
  }
  if (visible.route) {
    payload.pickupLocation = text(values.pickup)
    payload.dropoffLocation = text(values.dropoff)
  }
  if (visible.flight) payload.flightNumber = text(values.flightNumber)
  return payload
}

/**
 * Turn an API response into a UI outcome.
 * kinds: success | fieldErrors | rateLimited | forbidden | deliveryFailed | error
 */
export function interpretResponse(status, body) {
  if ((status === 201 || status === 200) && body?.ok && typeof body.ref === 'string') {
    const ref = sanitiseRef(body.ref)
    if (ref) return { kind: 'success', ref }
  }
  if (status === 400 && body?.errors && typeof body.errors === 'object') {
    return { kind: 'fieldErrors', errors: fromApiErrors(body.errors) }
  }
  if (status === 403) return { kind: 'forbidden' }
  if (status === 429) return { kind: 'rateLimited' }
  if (status === 502 && body?.code === 'DELIVERY_FAILED') {
    const url = typeof body.whatsappUrl === 'string' ? body.whatsappUrl : ''
    // Only trust WhatsApp links, never an arbitrary URL from a response.
    const safe = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url) ? url : ''
    return { kind: 'deliveryFailed', whatsappUrl: safe }
  }
  return { kind: 'error' }
}

/** Random idempotency key in UUID v4 format (the server only accepts valid UUIDs). */
export function newKey(cryptoObj = globalThis.crypto) {
  if (typeof cryptoObj?.randomUUID === 'function') return cryptoObj.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof cryptoObj?.getRandomValues === 'function') cryptoObj.getRandomValues(bytes)
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
