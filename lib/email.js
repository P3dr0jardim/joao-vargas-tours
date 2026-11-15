import { format, parse } from 'date-fns'
import { errorCode, fetchWithTimeout } from '@/lib/http'

const RESEND_URL = 'https://api.resend.com/emails'

/** Escape text for HTML bodies. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Make a value safe for a header or subject: one line, no control characters, length limited. */
export function sanitizeHeaderValue(value, max = 150) {
  return String(value ?? '')
    .replace(/[\p{Cc}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

const displayDate = (date) => format(parse(date, 'yyyy-MM-dd', new Date(2000, 0, 1)), 'dd/MM/yyyy')

function peopleLine({ adults, children, infants }) {
  return `${adults} / ${children} / ${infants}`
}

/** Driver email (pt-PT). */
function driverMessage({ ref, booking: b, snapshot }) {
  const price = snapshot.priceFrom
    ? `desde ${snapshot.priceFrom} ${snapshot.currency === 'EUR' ? '€' : snapshot.currency}${
        snapshot.placeholder ? ' (preço provisório)' : ''
      }`
    : ''
  const rows = [
    ['Referência', ref],
    ['Serviço', snapshot.title.pt],
    ['Preço indicativo', price],
    ['Data', displayDate(b.date)],
    ['Hora', b.time],
    ['Adultos / crianças / bebés', peopleLine(b)],
    ['Local de recolha', b.pickupLocation],
    ['Destino', b.dropoffLocation],
    ['Número do voo', b.flightNumber],
    ['Bagagem', b.luggage],
    ['Notas', b.notes],
    ['Nome', b.name],
    ['Email', b.email],
    ['Telemóvel', b.phone],
    ['Idioma do cliente', b.locale === 'pt' ? 'português' : 'inglês'],
  ].filter(([, v]) => v)

  const intro =
    'Novo pedido de reserva (ainda NÃO confirmado). Responda ao cliente para confirmar disponibilidade e preço.'
  return {
    subject: sanitizeHeaderValue(
      `Novo pedido ${ref}: ${snapshot.title.pt} em ${displayDate(b.date)}`
    ),
    text: [intro, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n'),
    html: htmlDocument(intro, rows),
  }
}

const customerStrings = {
  pt: {
    subject: (ref) => `Recebemos o seu pedido de reserva ${ref}`,
    intro: (name) =>
      `Olá ${name}, recebemos o seu pedido. Isto é um PEDIDO e não uma reserva confirmada: o João vai responder por WhatsApp ou email para confirmar a disponibilidade e o preço.`,
    labels: {
      ref: 'Referência',
      service: 'Serviço',
      date: 'Data',
      time: 'Hora',
      people: 'Adultos / crianças / bebés',
      pickup: 'Local de recolha',
      dropoff: 'Destino',
      flight: 'Número do voo',
    },
  },
  en: {
    subject: (ref) => `We received your booking request ${ref}`,
    intro: (name) =>
      `Hello ${name}, we received your request. This is a REQUEST, not a confirmed booking: João will reply by WhatsApp or email to confirm availability and the price.`,
    labels: {
      ref: 'Reference',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      people: 'Adults / children / infants',
      pickup: 'Pick-up',
      dropoff: 'Drop-off',
      flight: 'Flight number',
    },
  },
}

/**
 * Confirmation copy for the customer, in their language.
 * Free-text notes are deliberately NOT echoed back: they can hold health or other sensitive data
 * and this mail goes to an address nobody has verified.
 */
function customerMessage({ ref, booking: b, snapshot }) {
  const t = customerStrings[b.locale] ?? customerStrings.en
  const title = snapshot.title[b.locale] ?? snapshot.title.pt
  const rows = [
    [t.labels.ref, ref],
    [t.labels.service, title],
    [t.labels.date, displayDate(b.date)],
    [t.labels.time, b.time],
    [t.labels.people, peopleLine(b)],
    [t.labels.pickup, b.pickupLocation],
    [t.labels.dropoff, b.dropoffLocation],
    [t.labels.flight, b.flightNumber],
  ].filter(([, v]) => v)
  const intro = t.intro(b.name)
  return {
    subject: sanitizeHeaderValue(t.subject(ref)),
    text: [intro, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n'),
    html: htmlDocument(intro, rows),
  }
}

/** Minimal HTML: every value is escaped. */
function htmlDocument(intro, rows) {
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:2px 12px 2px 0"><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('')
  return `<div style="font-family:Arial,sans-serif;font-size:14px"><p>${escapeHtml(intro)}</p><table>${body}</table></div>`
}

async function postToResend(apiKey, payload, idempotencyKey) {
  try {
    const res = await fetchWithTimeout(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return { status: 'failed', error: `http_${res.status}` }
    const json = await res.json().catch(() => null)
    return { status: 'sent', providerId: json?.id }
  } catch (err) {
    return { status: 'failed', error: errorCode(err) }
  }
}

/**
 * Email the driver (and optionally a confirmation copy to the customer) through Resend.
 * The channel result is the driver email: the customer copy is best effort.
 * `idempotencyKey` (the client's UUID) makes Resend deduplicate: `<key>-driver`, `<key>-customer`.
 * Returns { status: 'sent' | 'skipped' | 'failed', providerId?, error? }.
 */
export async function sendEmail({ ref, booking, snapshot, idempotencyKey }) {
  const env = process.env
  const apiKey = env.RESEND_API_KEY
  const recipients = (env.EMAIL_BOOKINGS_TO || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!apiKey || recipients.length === 0) return { status: 'skipped' }

  const from = sanitizeHeaderValue(env.EMAIL_FROM || '', 200)
  if (!from) return { status: 'failed', error: 'config_missing' }

  const driver = driverMessage({ ref, booking, snapshot })
  const driverPromise = postToResend(
    apiKey,
    {
      from,
      to: recipients,
      reply_to: booking.email, // validated: single line, valid address
      subject: driver.subject,
      text: driver.text,
      html: driver.html,
    },
    `${idempotencyKey || ref}-driver`
  )

  let customerPromise = Promise.resolve(null)
  // KEEP OFF (default) until a captcha (Turnstile) or a shared rate limit (Upstash) exists:
  // otherwise the form can be abused to send mail to arbitrary addresses from our domain.
  if (env.EMAIL_CUSTOMER_COPY_ENABLED === 'true') {
    const copy = customerMessage({ ref, booking, snapshot })
    customerPromise = postToResend(
      apiKey,
      {
        from,
        to: [booking.email],
        reply_to: recipients[0],
        subject: copy.subject,
        text: copy.text,
        html: copy.html,
      },
      `${idempotencyKey || ref}-customer`
    )
  }

  const [result] = await Promise.all([driverPromise, customerPromise])
  return result
}
