import { z } from 'zod'
import { addDays, addYears, format, isValid, parse } from 'date-fns'
import { getPublishedServices } from '@/lib/services'

/**
 * Server-side validation of a booking request. The API only ever returns these codes (never free
 * text); the frontend maps them to messages in the user's language.
 */
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

export const DEFAULT_MAX_ADULTS = 8
const MAX_CHILDREN = 8
const MAX_INFANTS = 8
const TIMEZONE = 'Atlantic/Madeira'

// Control characters (including CR, LF, NUL), line/paragraph separators, bidi overrides and
// invisible zero-width characters (U+200B-U+200D, U+2060, U+FEFF).
const STRIP =
  /[\p{Cc}\p{Zl}\p{Zp}\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2060}\u{2066}-\u{2069}\u{FEFF}]/gu
const NEWLINES = /[\r\n\p{Zl}\p{Zp}]/u

/** Trim and strip control characters. Multiline fields keep \n (and \r\n becomes \n). */
export function cleanText(value, { multiline = false } = {}) {
  const input = multiline ? value.replace(/\r\n?/g, '\n') : value
  return input
    .replace(STRIP, (ch) => (ch === '\n' && multiline ? '\n' : ch === '\t' ? ' ' : ''))
    .trim()
}

const typeError = (issue) =>
  issue.input === undefined || issue.input === null ? 'required' : 'invalid'

const emptyToUndefined = (v) =>
  v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v

/**
 * String field. Unless `multiline`, CR/LF are rejected (these values may end up in headers,
 * subjects or WhatsApp parameters) instead of being silently altered.
 */
function text({ min = 1, max, multiline = false, optional = false }) {
  const field = z
    .string({ error: typeError })
    .refine((v) => multiline || !NEWLINES.test(v), { error: 'invalid' })
    .transform((v) => cleanText(v, { multiline }))
    .pipe(
      z
        .string()
        .min(1, { error: 'required' })
        .min(min, { error: 'too_short' })
        .max(max, { error: 'too_long' })
    )
  return optional ? z.preprocess(emptyToUndefined, field.optional()) : field
}

// Country codes whose national numbers never start with 0, so a 0 right after the code is the
// "trunk prefix" people type by habit (+351 0912..., +44 07...).
const TRUNK_ZERO = /^(\+(?:351|353|352|358|44|49|33|34|39|41|31|32|43|45|46|47))0+(?=\d)/

/**
 * Normalise to E.164 or return '' when it is not a plausible international number.
 * A bracketed "(0)" and a stray 0 after a common country code are dropped: +351 (0) 912 345 678.
 */
export function normalisePhone(raw) {
  let s = raw.replace(/[([]0[)\]]/g, '').replace(/[\s().-]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  s = s.replace(TRUNK_ZERO, '$1')
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : ''
}

const phone = z
  .string({ error: typeError })
  .refine((v) => !NEWLINES.test(v), { error: 'invalid' })
  .transform((v) => cleanText(v))
  .pipe(
    z
      .string()
      .min(1, { error: 'required' })
      .max(40, { error: 'too_long' })
      .transform(normalisePhone)
      .pipe(z.string().min(1, { error: 'invalid' }))
  )

const email = z
  .string({ error: typeError })
  .refine((v) => !NEWLINES.test(v), { error: 'invalid' })
  .transform((v) => cleanText(v).toLowerCase())
  .pipe(
    z
      .string()
      .min(1, { error: 'required' })
      .max(254, { error: 'too_long' })
      .pipe(z.email({ error: 'invalid' }))
  )

/** Integer field; digit strings from form inputs are accepted. */
function int({ min, max, fallback }) {
  return z.preprocess(
    (v) => {
      if (fallback !== undefined && (v == null || v === '')) return fallback
      return typeof v === 'string' && /^\d{1,3}$/.test(v.trim()) ? Number(v) : v
    },
    z
      .number({ error: typeError })
      .int({ error: 'invalid' })
      .min(min, { error: 'too_small' })
      .max(max, { error: 'too_large' })
  )
}

/** Today's date (YYYY-MM-DD) on Madeira, so "tomorrow" matches the customer's calendar. */
export function todayInMadeira(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

const DATE_FORMAT = 'yyyy-MM-dd'
const parseDate = (s) => parse(s, DATE_FORMAT, new Date(2000, 0, 1))

function dateField(now) {
  const today = parseDate(todayInMadeira(now))
  const earliest = format(addDays(today, 1), DATE_FORMAT)
  const latest = format(addYears(today, 2), DATE_FORMAT)
  return z
    .string({ error: typeError })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'invalid' })
    .refine((v) => isValid(parseDate(v)) && format(parseDate(v), DATE_FORMAT) === v, {
      error: 'invalid',
    })
    .refine((v) => v >= earliest, { error: 'too_early' })
    .refine((v) => v <= latest, { error: 'too_far' })
}

const time = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: typeError })
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'invalid' })
    .optional()
)

function buildSchema(now) {
  return z.object({
    serviceSlug: z
      .string({ error: typeError })
      .trim()
      .min(1, { error: 'required' })
      .max(100, { error: 'unknown_service' })
      .refine((slug) => getPublishedServices().some((s) => s.slug === slug), {
        error: 'unknown_service',
      }),
    date: dateField(now),
    time,
    adults: int({ min: 1, max: 99 }),
    children: int({ min: 0, max: MAX_CHILDREN, fallback: 0 }),
    infants: int({ min: 0, max: MAX_INFANTS, fallback: 0 }),
    pickupLocation: text({ max: 200, optional: true }),
    dropoffLocation: text({ max: 200, optional: true }),
    flightNumber: text({ max: 10, optional: true }),
    luggage: text({ max: 100, optional: true }),
    notes: text({ max: 1000, multiline: true, optional: true }),
    name: text({ min: 2, max: 100 }),
    email,
    phone,
    locale: z.enum(['en', 'pt'], { error: typeError }),
    consent: z.literal(true, { error: () => 'consent_required' }),
    idempotencyKey: z
      .string({ error: typeError })
      .trim()
      .pipe(z.uuid({ error: 'invalid' })),
    formStartedAt: z.number({ error: typeError }).finite({ error: 'invalid' }),
    // Honeypot. The service reads it from the raw body (before validation); it is listed here only
    // so an empty value is accepted. The old name `website` is NOT honoured any more.
    bot_trap_field: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  })
}

/** Maximum adults for a service: capacity.max, a numeric capacity, or the default. */
export function maxAdultsFor(service) {
  const cap = service?.capacity
  const max = typeof cap === 'number' ? cap : cap?.max
  return Number.isInteger(max) && max > 0 ? max : DEFAULT_MAX_ADULTS
}

/**
 * Validate and normalise a request body.
 * Returns { success: true, data, service } or { success: false, errors: { field: code } }.
 * Unknown keys are dropped. Rules that depend on the service (adults limit, drop-off for
 * transfers) run once the individual fields are valid.
 */
export function validateBooking(input, { now = new Date() } = {}) {
  const result = buildSchema(now).safeParse(input)
  if (!result.success) {
    const errors = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0] ?? '_form'
      if (field in errors) continue // first problem per field wins
      errors[field] = ERROR_CODES.includes(issue.message) ? issue.message : 'invalid'
    }
    return { success: false, errors }
  }

  const data = result.data
  const service = getPublishedServices().find((s) => s.slug === data.serviceSlug)
  const errors = {}
  if (data.adults > maxAdultsFor(service)) errors.adults = 'too_large'
  if (service.type === 'transfer' && !data.dropoffLocation) errors.dropoffLocation = 'required'
  if (Object.keys(errors).length > 0) return { success: false, errors }

  return { success: true, data, service }
}
