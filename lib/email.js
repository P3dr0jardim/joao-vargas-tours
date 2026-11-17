import { format, parse } from 'date-fns'
import { errorCode, fetchWithTimeout } from '@/lib/http'
import { siteConfig, whatsappLink } from '@/config/site'

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
    heading: 'Recebemos o seu pedido',
    greeting: (name) => `Olá ${name},`,
    lead: 'Obrigado pelo seu pedido. O João vai responder por WhatsApp ou email para confirmar a disponibilidade e o preço.',
    notice: 'Isto ainda não é uma reserva confirmada.',
    detailsTitle: 'O seu pedido',
    whatsappButton: 'Falar com o João no WhatsApp',
    whatsappMessage: (ref) =>
      `Olá João, enviei um pedido de reserva no seu site. A minha referência é ${ref}.`,
    replyHint: 'Também pode responder diretamente a este email.',
    people: {
      adult: ['adulto', 'adultos'],
      child: ['criança', 'crianças'],
      infant: ['bebé', 'bebés'],
    },
    labels: {
      ref: 'Referência',
      service: 'Serviço',
      date: 'Data',
      time: 'Hora',
      people: 'Passageiros',
      pickup: 'Local de recolha',
      dropoff: 'Destino',
      flight: 'Número do voo',
    },
  },
  en: {
    subject: (ref) => `We received your booking request ${ref}`,
    heading: 'We received your request',
    greeting: (name) => `Hello ${name},`,
    lead: 'Thank you for your request. João will reply by WhatsApp or email to confirm availability and the price.',
    notice: 'This is not a confirmed booking yet.',
    detailsTitle: 'Your request',
    whatsappButton: 'Message João on WhatsApp',
    whatsappMessage: (ref) =>
      `Hello João, I sent a booking request on your website. My reference is ${ref}.`,
    replyHint: 'You can also reply to this email.',
    people: {
      adult: ['adult', 'adults'],
      child: ['child', 'children'],
      infant: ['infant', 'infants'],
    },
    labels: {
      ref: 'Reference',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      people: 'Passengers',
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
export function customerMessage({ ref, booking: b, snapshot }) {
  const t = customerStrings[b.locale] ?? customerStrings.en
  const title = snapshot.title[b.locale] ?? snapshot.title.pt
  const rows = [
    [t.labels.ref, ref],
    [t.labels.service, title],
    [t.labels.date, displayDate(b.date)],
    [t.labels.time, b.time],
    [t.labels.people, peopleWords(b, t.people)],
    [t.labels.pickup, b.pickupLocation],
    [t.labels.dropoff, b.dropoffLocation],
    [t.labels.flight, b.flightNumber],
  ].filter(([, v]) => v)
  const whatsappUrl = whatsappLink(t.whatsappMessage(ref))
  return {
    subject: sanitizeHeaderValue(t.subject(ref)),
    text: [
      t.greeting(b.name),
      '',
      t.lead,
      t.notice,
      '',
      ...rows.map(([k, v]) => `${k}: ${v}`),
      '',
      `${t.whatsappButton}: ${whatsappUrl}`,
      t.replyHint,
      '',
      `${siteConfig.brand} · ${siteConfig.phone.display}`,
    ].join('\n'),
    html: customerHtml({
      t,
      name: b.name,
      rows,
      whatsappUrl,
      lang: b.locale === 'pt' ? 'pt-PT' : 'en',
    }),
  }
}

/** "2 adultos, 1 criança" in the customer's language. */
function peopleWords({ adults, children, infants }, words) {
  return [
    [adults, words.adult],
    [children, words.child],
    [infants, words.infant],
  ]
    .filter(([n]) => n)
    .map(([n, [one, many]]) => `${n} ${n === 1 ? one : many}`)
    .join(', ')
}

// Site colours (tailwind.config.js). Email clients need inline styles and tables.
const C = {
  blue800: '#14487A',
  blue600: '#1F6FB2',
  sky50: '#F3F9FD',
  sky100: '#DCEEFA',
  ink: '#0F2233',
  sun: '#F5B800',
}
const FONT_BODY = "Inter, 'Segoe UI', Arial, sans-serif"
const FONT_HEAD = "Poppins, 'Segoe UI', Arial, sans-serif"

/** Branded confirmation email for the customer. Every customer value is escaped. */
function customerHtml({ t, name, rows, whatsappUrl, lang }) {
  const details = rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:10px 16px 10px 0;${i ? `border-top:1px solid ${C.sky100};` : ''}color:${C.blue800};font-weight:600;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:10px 0;${i ? `border-top:1px solid ${C.sky100};` : ''}color:${C.ink}">${escapeHtml(v)}</td></tr>`
    )
    .join('')
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(t.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.sky50}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sky50}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${C.ink}">
<tr><td style="padding:0 0 20px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:6px;background:${C.sun};border-radius:3px">&nbsp;</td>
    <td style="padding-left:10px;font-family:${FONT_HEAD};line-height:1.1"><div style="font-size:18px;font-weight:700;color:${C.blue800}">João Vargas</div><div style="font-size:14px;font-weight:500;color:${C.blue600}">Tours</div></td>
  </tr></table>
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px 28px">
  <h1 style="margin:0 0 16px;font-family:${FONT_HEAD};font-size:26px;line-height:1.2;font-weight:600;color:${C.blue800}">${escapeHtml(t.heading)}</h1>
  <p style="margin:0 0 12px">${escapeHtml(t.greeting(name))}</p>
  <p style="margin:0 0 20px">${escapeHtml(t.lead)}</p>
  <p style="margin:0 0 24px;padding:12px 16px;background:${C.sky50};border-left:4px solid ${C.sun};border-radius:8px;font-weight:600;color:${C.blue800}">${escapeHtml(t.notice)}</p>
  <h2 style="margin:0 0 8px;font-family:${FONT_HEAD};font-size:18px;font-weight:600;color:${C.blue800}">${escapeHtml(t.detailsTitle)}</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">${details}</table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 12px"><tr><td style="background:${C.blue600};border-radius:999px">
    <a href="${escapeHtml(whatsappUrl)}" style="display:inline-block;padding:12px 24px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(t.whatsappButton)}</a>
  </td></tr></table>
  <p style="margin:0;font-size:14px;color:${C.ink}">${escapeHtml(t.replyHint)}</p>
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:13px;color:${C.blue800};text-align:center">${escapeHtml(siteConfig.brand)} · <a href="${escapeHtml(siteConfig.phone.href)}" style="color:${C.blue800}">${escapeHtml(siteConfig.phone.display)}</a> · ${escapeHtml(siteConfig.company.address)}</td></tr>
</table>
</td></tr></table>
</body></html>`
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
